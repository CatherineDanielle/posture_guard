from ultralytics import YOLO

def main():
    # Evaluate YOLOv8m on test set
    model_v8 = YOLO("runs/posture/posture_detector/weights/best.pt")  
    results_v8 = model_v8.val(
        data="dataset/data.yaml",
        split="test"  
    )

    print("=== YOLOv8m Test Results ===")
    print(f"Precision: {results_v8.box.mp:.4f}")
    print(f"Recall: {results_v8.box.mr:.4f}")
    print(f"mAP50: {results_v8.box.map50:.4f}")
    print(f"mAP50-95: {results_v8.box.map:.4f}")

    # Evaluate YOLOv11m on test set
    model_v11 = YOLO("runs/posture/posture_detector_yolov11/weights/best.pt") 
    results_v11 = model_v11.val(
        data="dataset/data.yaml",
        split="test"
    )

    print("\n=== YOLOv11m Test Results ===")
    print(f"Precision: {results_v11.box.mp:.4f}")
    print(f"Recall: {results_v11.box.mr:.4f}")
    print(f"mAP50: {results_v11.box.map50:.4f}")
    print(f"mAP50-95: {results_v11.box.map:.4f}")

if __name__ == "__main__":
    main()