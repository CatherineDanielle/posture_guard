from ultralytics import YOLO
import os
import cv2


def preprocess_grayscale(img_dirs):
    for img_dir in img_dirs:
        if not os.path.exists(img_dir):
            print(f"Skipping missing directory: {img_dir}")
            continue

        for fname in os.listdir(img_dir):
            if not fname.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            path = os.path.join(img_dir, fname)
            img = cv2.imread(path)

            if img is None:
                continue

            if (
                img.ndim == 3
                and (img[:, :, 0] == img[:, :, 1]).all()
                and (img[:, :, 1] == img[:, :, 2]).all()
            ):
                continue

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            gray_3ch = cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)
            cv2.imwrite(path, gray_3ch)


def main():
    DATA = "dataset/data.yaml"

    IMAGE_DIRS = [
        "dataset/train/images",
        "dataset/valid/images"
    ]

    # preprocessing
    preprocess_grayscale(IMAGE_DIRS)

    model = YOLO("yolo11m.pt", task="detect")

    model.train(
        data=DATA,
        epochs=50,
        imgsz=640,
        batch=8,

        hsv_h=0.015,
        hsv_s=0.4,
        hsv_v=0.4,
        degrees=10.0,
        translate=0.1,
        scale=0.5,
        fliplr=0.5,
        mosaic=1.0,
        mixup=0.1,

        project="runs/posture",
        name="yolo11m",
        exist_ok=True
    )

    best_model = "runs/posture/yolo11m/weights/best.pt"
    if os.path.exists(best_model):
        os.system(f'copy "{best_model}" "posture_detection_yolov11.pt"')
        print("Saved as posture_detection_yolo11m.pt")
    else:
        print("best.pt not found")


if __name__ == "__main__":
    main()
