import cv2
import numpy as np
from typing import List, Tuple, Optional
from app.recognition.model_loader import model_manager

class FaceRecognizer:
    def __init__(self):
        self._rec = model_manager.get_recognizer()

    def extract_embedding(self, img_bgr: np.ndarray, raw_face: np.ndarray) -> np.ndarray:
        """
        Align the face crop using 5 landmarks and extract 128D feature embedding.
        Returns a 1D float32 array of shape (128,).
        """
        aligned_face = self._rec.alignCrop(img_bgr, raw_face)
        feature = self._rec.feature(aligned_face)  # shape (1, 128)
        emb = feature.flatten().astype(np.float32)
        # Ensure L2 normalization
        norm = np.linalg.norm(emb)
        if norm > 0:
            emb = emb / norm
        return emb

    @staticmethod
    def serialize_embedding(embedding: np.ndarray) -> bytes:
        """Serialize 128D float32 numpy array into raw byte buffer for secure database storage."""
        return embedding.astype(np.float32).tobytes()

    @staticmethod
    def deserialize_embedding(embedding_bytes: bytes) -> np.ndarray:
        """Deserialize raw byte buffer back into 128D float32 numpy array."""
        return np.frombuffer(embedding_bytes, dtype=np.float32)

    @staticmethod
    def aggregate_embeddings(embeddings: List[np.ndarray]) -> np.ndarray:
        """
        Average and L2-normalize multiple facial feature samples captured across different poses.
        This provides a resilient biometric representation.
        """
        if not embeddings:
            raise ValueError("No embeddings provided for aggregation")
        stacked = np.array(embeddings, dtype=np.float32)
        mean_emb = np.mean(stacked, axis=0)
        norm = np.linalg.norm(mean_emb)
        if norm > 0:
            mean_emb = mean_emb / norm
        return mean_emb

    @staticmethod
    def compute_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
        """Compute Cosine Similarity between two L2-normalized embeddings [-1.0, 1.0]."""
        dot_product = np.dot(emb1, emb2)
        norm1 = np.linalg.norm(emb1)
        norm2 = np.linalg.norm(emb2)
        if norm1 == 0 or norm2 == 0:
            return 0.0
        similarity = float(dot_product / (norm1 * norm2))
        return max(-1.0, min(1.0, similarity))

    def find_best_match(
        self,
        query_emb: np.ndarray,
        enrolled_users: List[Tuple[int, np.ndarray]],
        threshold: float = 0.45
    ) -> Tuple[Optional[int], float]:
        """
        Compare query embedding against a list of (user_id, embedding) pairs.
        Returns:
            (best_user_id, highest_score) if highest_score >= threshold,
            else (None, highest_score).
        """
        if not enrolled_users:
            return None, 0.0

        best_user_id = None
        best_score = -1.0

        for user_id, enrolled_emb in enrolled_users:
            sim = self.compute_similarity(query_emb, enrolled_emb)
            if sim > best_score:
                best_score = sim
                best_user_id = user_id

        if best_score >= threshold:
            return best_user_id, best_score
        return None, best_score

face_recognizer = FaceRecognizer()
