import os
import cv2
from app.core.config import settings
from app.core.logging import logger
from download_models import download_models

YUNET_FILENAME = "face_detection_yunet_2023mar.onnx"
SFACE_FILENAME = "face_recognition_sface_2021dec.onnx"

class ModelManager:
    _instance = None
    _yunet_path = None
    _sface_path = None
    _recognizer = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.ensure_models_exist()

    def ensure_models_exist(self):
        models_dir = settings.MODEL_DIR
        os.makedirs(models_dir, exist_ok=True)
        self._yunet_path = os.path.join(models_dir, YUNET_FILENAME)
        self._sface_path = os.path.join(models_dir, SFACE_FILENAME)

        if not os.path.exists(self._yunet_path) or not os.path.exists(self._sface_path):
            logger.info("Face models missing from cache. Downloading now...")
            download_models(models_dir)

        if not os.path.exists(self._yunet_path) or not os.path.exists(self._sface_path):
            raise RuntimeError("Failed to locate or download face recognition ONNX models.")
        
        logger.info(f"YuNet model ready at: {self._yunet_path}")
        logger.info(f"SFace model ready at: {self._sface_path}")

    def create_detector(self, width=320, height=320, conf_threshold=0.6, nms_threshold=0.3):
        return cv2.FaceDetectorYN.create(
            self._yunet_path,
            "",
            (width, height),
            score_threshold=conf_threshold,
            nms_threshold=nms_threshold,
            top_k=50
        )

    def get_recognizer(self):
        if self._recognizer is None:
            self._recognizer = cv2.FaceRecognizerSF.create(self._sface_path, "")
        return self._recognizer

model_manager = ModelManager.get_instance()
