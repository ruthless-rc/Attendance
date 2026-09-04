import os
import sys
import urllib.request

MODELS = {
    "face_detection_yunet_2023mar.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx",
    "face_recognition_sface_2021dec.onnx": "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"
}

def download_models(target_dir=None):
    if target_dir is None:
        target_dir = os.path.join(os.path.dirname(__file__), "app", "recognition", "models")
    os.makedirs(target_dir, exist_ok=True)

    for filename, url in MODELS.items():
        destination = os.path.join(target_dir, filename)
        if os.path.exists(destination) and os.path.getsize(destination) > 10000:
            print(f"[CACHE] {filename} already exists ({os.path.getsize(destination)} bytes). Skipping.")
            continue

        print(f"[DOWNLOADING] {filename} from {url}...")
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            )
            with urllib.request.urlopen(req, timeout=45) as response, open(destination, 'wb') as out_file:
                block_size = 64 * 1024
                while True:
                    buffer = response.read(block_size)
                    if not buffer:
                        break
                    out_file.write(buffer)
            print(f"[SUCCESS] Downloaded {filename} ({os.path.getsize(destination)} bytes).")
        except Exception as e:
            print(f"[ERROR] Failed downloading {filename}: {e}", file=sys.stderr)
            if os.path.exists(destination):
                os.remove(destination)
            raise e

if __name__ == "__main__":
    download_models()
