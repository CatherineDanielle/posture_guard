from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import cv2
import numpy as np
import base64
import torch
from ultralytics import YOLO
import os
from datetime import datetime
import threading

torch.serialization.add_safe_globals([])

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

# Model configuration
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'posture_detection.pt')
CONFIDENCE_THRESHOLD = 0.5
IMAGE_SIZE = 416  # Smaller size for faster inference (default is 640)
CLASS_NAMES = ['Bad Sitting Posture', 'Good Sitting Posture']

# Global variables
model = None
model_lock = threading.Lock()
is_processing = False

def load_model():
    global model
    if model is None:
        if os.path.exists(MODEL_PATH):
            print(f"Loading model from {MODEL_PATH}")
            try:
                model = YOLO(MODEL_PATH)
            except Exception as e:
                print(f"Standard loading failed, trying alternative method...")
                original_load = torch.load
                def patched_load(*args, **kwargs):
                    kwargs['weights_only'] = False
                    return original_load(*args, **kwargs)
                torch.load = patched_load
                try:
                    model = YOLO(MODEL_PATH)
                finally:
                    torch.load = original_load
            print("Model loaded successfully!")
        else:
            print(f"Warning: Model not found at {MODEL_PATH}")
            print("Please place your 'best.pt' file in the 'models' folder")
            return None
    return model

def warm_up_model():
    global model
    if model is not None:
        print("Warming up model (first inference is slow)...")
        dummy_img = np.zeros((IMAGE_SIZE, IMAGE_SIZE, 3), dtype=np.uint8)
        try:
            model(dummy_img, conf=0.5, verbose=False, imgsz=IMAGE_SIZE)
            print("Model warm-up complete! Ready for fast inference.")
        except Exception as e:
            print(f"Warm-up failed (this is okay): {e}")

def decode_base64_image(base64_string):
    try:
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]
        
        img_bytes = base64.b64decode(base64_string)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def encode_image_to_base64(img):
    _, buffer = cv2.imencode('.jpg', img, [cv2.IMWRITE_JPEG_QUALITY, 80])
    return base64.b64encode(buffer).decode('utf-8')

def resize_image(img, max_size=IMAGE_SIZE):
    h, w = img.shape[:2]
    if max(h, w) > max_size:
        scale = max_size / max(h, w)
        new_w, new_h = int(w * scale), int(h * scale)
        img = cv2.resize(img, (new_w, new_h))
    return img

@app.route('/health', methods=['GET'])
def health_check():
    model_status = "loaded" if model is not None else "not loaded"
    model_exists = os.path.exists(MODEL_PATH)
    return jsonify({
        'status': 'healthy',
        'model_status': model_status,
        'model_file_exists': model_exists,
        'model_path': MODEL_PATH,
        'classes': CLASS_NAMES,
        'image_size': IMAGE_SIZE
    })

@app.route('/detect', methods=['POST'])
def detect_posture():
    global is_processing
    
    if is_processing:
        return jsonify({
            'success': True,
            'detections': [],
            'detection_count': 0,
            'overall_status': 'unknown',
            'processed_image': None,
            'message': 'Server busy, skipping frame',
            'timestamp': datetime.now().isoformat()
        })
    
    try:
        is_processing = True
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        img = decode_base64_image(data['image'])
        if img is None:
            return jsonify({'error': 'Failed to decode image'}), 400
        
        orig_h, orig_w = img.shape[:2]
        
        img_resized = resize_image(img, IMAGE_SIZE)
        resized_h, resized_w = img_resized.shape[:2]
        
        scale_x = orig_w / resized_w
        scale_y = orig_h / resized_h
        
        current_model = load_model()
        if current_model is None:
            return jsonify({
                'success': True,
                'detections': [],
                'message': 'Model not loaded - place best.pt in models folder',
                'processed_image': None
            })
        
        with model_lock:
            results = current_model(img_resized, conf=CONFIDENCE_THRESHOLD, verbose=False, imgsz=IMAGE_SIZE)
        
        detections = []
        
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    
                    x1, x2 = x1 * scale_x, x2 * scale_x
                    y1, y2 = y1 * scale_y, y2 * scale_y
                    
                    confidence = float(box.conf[0].cpu().numpy())
                    class_id = int(box.cls[0].cpu().numpy())
                    class_name = CLASS_NAMES[class_id] if class_id < len(CLASS_NAMES) else f"Class {class_id}"
                    
                    is_good_posture = class_id == 1
                    
                    detection = {
                        'bbox': [float(x1), float(y1), float(x2), float(y2)],
                        'confidence': confidence,
                        'class_id': class_id,
                        'class_name': class_name,
                        'is_good_posture': is_good_posture
                    }
                    detections.append(detection)
        
        overall_status = 'unknown'
        if detections:
            bad_postures = [d for d in detections if not d['is_good_posture']]
            overall_status = 'bad' if bad_postures else 'good'
        
        return jsonify({
            'success': True,
            'detections': detections,
            'detection_count': len(detections),
            'overall_status': overall_status,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        print(f"Error in detection: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
    
    finally:
        is_processing = False

@app.route('/classes', methods=['GET'])
def get_classes():
    return jsonify({
        'classes': CLASS_NAMES,
        'class_count': len(CLASS_NAMES)
    })

@app.route('/config', methods=['GET', 'POST'])
def config():
    global CONFIDENCE_THRESHOLD
    
    if request.method == 'GET':
        return jsonify({
            'confidence_threshold': CONFIDENCE_THRESHOLD,
            'classes': CLASS_NAMES
        })
    
    elif request.method == 'POST':
        data = request.get_json()
        if 'confidence_threshold' in data:
            CONFIDENCE_THRESHOLD = float(data['confidence_threshold'])
        
        return jsonify({
            'success': True,
            'confidence_threshold': CONFIDENCE_THRESHOLD
        })

if __name__ == '__main__':
    os.makedirs(os.path.join(os.path.dirname(__file__), 'models'), exist_ok=True)
    
    print("=" * 50)
    print("Posture Detection Backend Starting...")
    print("=" * 50)
    print(f"Model path: {MODEL_PATH}")
    print(f"Classes: {CLASS_NAMES}")
    print(f"Image size: {IMAGE_SIZE}")
    print("=" * 50)
    
    load_model()
    warm_up_model()
    
    print("=" * 50)
    print("Server ready! Starting Flask...")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)