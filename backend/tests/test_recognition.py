import numpy as np
import cv2
from app.recognition.recognizer import face_recognizer
from app.recognition.quality import face_quality_checker

def test_embedding_serialization_roundtrip():
    # 128D float32 vector
    original_emb = np.random.randn(128).astype(np.float32)
    original_emb = original_emb / np.linalg.norm(original_emb)

    serialized = face_recognizer.serialize_embedding(original_emb)
    assert isinstance(serialized, bytes)
    assert len(serialized) == 128 * 4  # 512 bytes for 128 float32

    deserialized = face_recognizer.deserialize_embedding(serialized)
    assert deserialized.shape == (128,)
    assert np.allclose(original_emb, deserialized, atol=1e-6)

def test_embedding_aggregation():
    sample1 = np.ones(128, dtype=np.float32)
    sample2 = np.ones(128, dtype=np.float32) * 2.0
    agg = face_recognizer.aggregate_embeddings([sample1, sample2])
    assert agg.shape == (128,)
    # Should be normalized to unit length
    assert np.isclose(np.linalg.norm(agg), 1.0, atol=1e-5)

def test_cosine_similarity():
    v1 = np.random.randn(128).astype(np.float32)
    v1 = v1 / np.linalg.norm(v1)

    # Identical vector should have similarity ~ 1.0
    sim_self = face_recognizer.compute_similarity(v1, v1)
    assert np.isclose(sim_self, 1.0, atol=1e-5)

    # Opposite vector should have similarity ~ -1.0
    sim_opp = face_recognizer.compute_similarity(v1, -v1)
    assert np.isclose(sim_opp, -1.0, atol=1e-5)

def test_find_best_match():
    target = np.random.randn(128).astype(np.float32)
    target = target / np.linalg.norm(target)

    other = np.random.randn(128).astype(np.float32)
    other = other / np.linalg.norm(other)

    enrolled = [(1, other), (2, target)]

    # Query with identical target
    matched_id, score = face_recognizer.find_best_match(target, enrolled, threshold=0.45)
    assert matched_id == 2
    assert np.isclose(score, 1.0, atol=1e-5)

    # Query with totally random vector below threshold
    unrelated = np.zeros(128, dtype=np.float32)
    unrelated[0] = 1.0
    matched_id, score = face_recognizer.find_best_match(unrelated, [(99, -unrelated)], threshold=0.45)
    assert matched_id is None

def test_quality_checker_blur_detection():
    # A completely flat gray image has 0 variance (blurry)
    flat_img = np.ones((200, 200, 3), dtype=np.uint8) * 128
    passed, msg, metrics = face_quality_checker.check_quality(flat_img, [10, 10, 100, 100])
    assert passed is False
    assert "blurry" in msg.lower()

def test_quality_checker_dark_lighting():
    # Very dark image
    dark_img = np.zeros((200, 200, 3), dtype=np.uint8) + 10
    passed, msg, metrics = face_quality_checker.check_quality(dark_img, [10, 10, 100, 100])
    assert passed is False
    assert "dark" in msg.lower()

def test_quality_checker_size():
    img = np.ones((200, 200, 3), dtype=np.uint8) * 150
    # Box too small (20x20)
    passed, msg, metrics = face_quality_checker.check_quality(img, [10, 10, 20, 20])
    assert passed is False
    assert "too small" in msg.lower()
