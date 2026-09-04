import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional

class FaceQualityChecker:
    def __init__(
        self,
        min_face_size: int = 70,
        min_sharpness: float = 30.0,
        min_brightness: float = 40.0,
        max_brightness: float = 235.0
    ):
        self.min_face_size = min_face_size
        self.min_sharpness = min_sharpness
        self.min_brightness = min_brightness
        self.max_brightness = max_brightness

    def check_quality(self, img_bgr: np.ndarray, bbox: list) -> Tuple[bool, str, Dict[str, float]]:
        """
        Validate image quality for face registration and high-confidence verification.
        bbox: [x, y, w, h]
        """
        x, y, w, h = bbox
        metrics = {}

        # 1. Size Check
        metrics["width"] = float(w)
        metrics["height"] = float(h)
        if w < self.min_face_size or h < self.min_face_size:
            return False, f"Face is too small ({w}x{h}px). Please move closer to the camera.", metrics

        # Crop face region
        ih, iw = img_bgr.shape[:2]
        x1 = max(0, x)
        y1 = max(0, y)
        x2 = min(iw, x + w)
        y2 = min(ih, y + h)
        face_crop = img_bgr[y1:y2, x1:x2]

        if face_crop.size == 0:
            return False, "Invalid face boundary detected.", metrics

        gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

        # 2. Brightness Check
        mean_brightness = float(np.mean(gray))
        metrics["brightness"] = mean_brightness
        if mean_brightness < self.min_brightness:
            return False, f"Lighting is too dark ({mean_brightness:.1f}). Please face a light source.", metrics
        if mean_brightness > self.max_brightness:
            return False, f"Lighting is too bright / overexposed ({mean_brightness:.1f}). Please adjust lighting.", metrics

        # 3. Sharpness / Blur Check using Laplacian Variance
        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
        metrics["sharpness"] = laplacian_var
        if laplacian_var < self.min_sharpness:
            return False, f"Image is blurry ({laplacian_var:.1f}). Please hold steady.", metrics

        return True, "Quality check passed.", metrics

face_quality_checker = FaceQualityChecker()
