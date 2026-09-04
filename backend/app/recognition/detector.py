import base64
import cv2
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
from app.recognition.model_loader import model_manager
from app.core.logging import logger

def decode_base64_image(base64_str: str) -> np.ndarray:
    """Decode a base64 encoded image string (with or without data URI header) into an OpenCV BGR image."""
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Failed to decode image from buffer")
        return img
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        raise ValueError(f"Invalid image format: {e}")

class FaceDetector:
    def __init__(self, conf_threshold: float = 0.6, nms_threshold: float = 0.3):
        self.conf_threshold = conf_threshold
        self.nms_threshold = nms_threshold

    def detect(self, img_bgr: np.ndarray) -> List[Dict[str, Any]]:
        """
        Detect faces in a BGR image using YuNet.
        Returns a list of dictionaries with:
          - 'bbox': [int(x), int(y), int(w), int(h)]
          - 'landmarks': [[rx, ry], [lx, ly], [nx, ny], [rmx, rmy], [lmx, lmy]]
          - 'score': float confidence
          - 'raw': 1D numpy array of 15 elements (needed for SFace alignment/feature extraction)
        """
        h, w = img_bgr.shape[:2]
        detector = model_manager.create_detector(
            width=w,
            height=h,
            conf_threshold=self.conf_threshold,
            nms_threshold=self.nms_threshold
        )
        _, faces = detector.detect(img_bgr)

        results = []
        if faces is not None:
            for face in faces:
                x, y, fw, fh = int(face[0]), int(face[1]), int(face[2]), int(face[3])
                # Ensure bounding box is within image bounds
                x = max(0, x)
                y = max(0, y)
                fw = min(fw, w - x)
                fh = min(fh, h - y)

                # 5 landmarks
                landmarks = [
                    [float(face[4]), float(face[5])],    # Right eye
                    [float(face[6]), float(face[7])],    # Left eye
                    [float(face[8]), float(face[9])],    # Nose tip
                    [float(face[10]), float(face[11])],  # Right mouth corner
                    [float(face[12]), float(face[13])]   # Left mouth corner
                ]
                score = float(face[14])

                results.append({
                    "bbox": [x, y, fw, fh],
                    "landmarks": landmarks,
                    "score": score,
                    "raw": face
                })

        return results

face_detector = FaceDetector()
