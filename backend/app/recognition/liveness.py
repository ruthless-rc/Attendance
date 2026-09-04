import time
import uuid
import numpy as np
import cv2
from typing import Dict, Any, Optional, Tuple
from app.core.logging import logger

CHALLENGES = {
    "turn_left": "Turn your head to the left",
    "turn_right": "Turn your head to the right",
    "blink": "Blink your eyes"
}

class LivenessDetector:
    def __init__(self):
        self._active_challenges: Dict[str, Dict[str, Any]] = {}

    def create_challenge(self) -> Dict[str, Any]:
        """Generate a random anti-spoofing challenge for the user."""
        challenge_id = str(uuid.uuid4())
        actions = list(CHALLENGES.keys())
        # Random pick based on current microseconds
        action = actions[int(time.time() * 1000) % len(actions)]
        instruction = CHALLENGES[action]

        self._active_challenges[challenge_id] = {
            "action": action,
            "instruction": instruction,
            "created_at": time.time(),
            "expires_in": 15
        }
        self._clean_expired_challenges()

        return {
            "challenge_id": challenge_id,
            "action": action,
            "instruction": instruction,
            "expires_in_seconds": 15
        }

    def _clean_expired_challenges(self):
        now = time.time()
        expired = [cid for cid, val in self._active_challenges.items() if now - val["created_at"] > val["expires_in"]]
        for cid in expired:
            self._active_challenges.pop(cid, None)

    def estimate_head_pose_yunet(self, landmarks: list) -> str:
        """
        Estimate coarse head yaw using YuNet 5 landmarks.
        landmarks: [[rx, ry], [lx, ly], [nx, ny], [rmx, rmy], [lmx, lmy]]
        """
        if len(landmarks) < 5:
            return "center"

        rx, ry = landmarks[0]
        lx, ly = landmarks[1]
        nx, ny = landmarks[2]

        d_right = abs(nx - rx)
        d_left = abs(nx - lx)

        if d_right == 0:
            d_right = 1e-4

        ratio = d_left / d_right

        # In camera selfie / mirror view:
        # Turning head towards left or right shifts nose closer to one eye
        if ratio > 1.85:
            return "turn_right"
        elif ratio < 0.54:
            return "turn_left"
        return "center"

    def estimate_eye_openness(self, img_bgr: np.ndarray, landmarks: list) -> float:
        """
        Estimate eye openness by analyzing vertical gradients around eye landmarks.
        Open eyes produce high vertical gradient variance (pupil + eyelid contours).
        Closed eyes have minimal vertical gradient.
        Returns openness score (lower means closed/blinking).
        """
        if len(landmarks) < 5:
            return 1.0

        h, w = img_bgr.shape[:2]
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)

        scores = []
        # Right eye: landmarks[0], Left eye: landmarks[1]
        for idx in [0, 1]:
            ex, ey = int(landmarks[idx][0]), int(landmarks[idx][1])
            pw, ph = max(10, int(w * 0.04)), max(8, int(h * 0.03))
            y1, y2 = max(0, ey - ph), min(h, ey + ph)
            x1, x2 = max(0, ex - pw), min(w, ex + pw)

            patch = gray[y1:y2, x1:x2]
            if patch.size > 0:
                sobely = cv2.Sobel(patch, cv2.CV_64F, 0, 1, ksize=3)
                scores.append(float(np.std(sobely)))

        if not scores:
            return 1.0
        return float(np.mean(scores))

    def verify_action(
        self,
        challenge_id: str,
        img_bgr: np.ndarray,
        landmarks: Optional[list] = None
    ) -> Tuple[bool, str]:
        """
        Verify if the given frame satisfies the issued challenge.
        """
        self._clean_expired_challenges()
        challenge = self._active_challenges.get(challenge_id)
        if not challenge:
            return False, "Challenge expired or invalid. Please request a new one."

        target_action = challenge["action"]

        if target_action in ["turn_left", "turn_right"] and landmarks is not None:
            detected_pose = self.estimate_head_pose_yunet(landmarks)
            if detected_pose == target_action:
                self._active_challenges.pop(challenge_id, None)
                return True, f"Liveness verified: {target_action} completed successfully."
            else:
                return False, f"Current pose is '{detected_pose}'. Please {CHALLENGES[target_action]}."

        elif target_action == "blink" and landmarks is not None:
            openness = self.estimate_eye_openness(img_bgr, landmarks)
            # Low openness (< 18.0) indicates closed eye / blink
            if openness < 18.0:
                self._active_challenges.pop(challenge_id, None)
                return True, "Liveness verified: Blink detected."
            else:
                return False, "Please blink your eyes naturally."

        return False, "Unable to verify liveness action."

liveness_detector = LivenessDetector()
