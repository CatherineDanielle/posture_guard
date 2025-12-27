# PostureGuard 🪑

Real-time sitting posture detection system using YOLO object detection models.

## Overview

PostureGuard is a web-based application that monitors sitting posture through webcam feed and provides real-time feedback. The system classifies postures as either **"Good Sitting Posture"** or **"Bad Sitting Posture"** using custom-trained YOLO models, helping users maintain healthier sitting habits.

## Features

- **Real-time Detection** — Live webcam monitoring with instant posture classification
- **Dual Model Support** — Choose between YOLOv8m (faster) or YOLOv11m (more accurate)
- **Draggable Overlay** — Picture-in-Picture style popup that stays on top of other windows
- **Transparency Control** — Adjustable overlay opacity for minimal distraction
- **Audio Notifications** — Sound alerts when bad posture is detected
- **Responsive UI** — Clean, modern interface built with React and Tailwind CSS

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React.js, Tailwind CSS |
| Backend | Flask (Python) |
| ML Models | YOLOv8m, YOLOv11m (Ultralytics) |
| Dataset | Roboflow (Grayscale posture images) |

## Model Performance

| Model | Precision | Recall | mAP@0.5 | Inference Speed |
|-------|-----------|--------|---------|-----------------|
| YOLOv8m | 96.5% | 97.2% | 97.0% | Faster |
| YOLOv11m | 97.8% | 97.5% | 98.1% | Slower |

*YOLOv11m achieves higher accuracy while YOLOv8m offers faster real-time performance.*

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- Webcam

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/postureguard.git
cd postureguard

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Setup

```bash
cd frontend
npm install
```

### Running the Application

1. **Start the Flask backend:**
   ```bash
   python app.py
   ```

2. **Start the React frontend (in a new terminal):**
   ```bash
   cd frontend
   npm start
   ```

3. Open `http://localhost:3000` in your browser


## Dataset

The model was trained on a custom grayscale sitting posture dataset sourced from Roboflow, featuring:

- **Classes:** Good Sitting Posture, Bad Sitting Posture
- **Preprocessing:** Grayscale conversion, resizing
- **Augmentation:** Geometric transformations, brightness variation, Mosaic, MixUp

## Usage

1. Launch the application and allow webcam access
2. Select your preferred model (YOLOv8m or YOLOv11m)
3. Click "Start Detection" to begin monitoring
4. Adjust overlay transparency as needed
5. Receive real-time feedback on your sitting posture

## Demo

📹 [Watch Demo Video](link-to-demo-video)

## Acknowledgments

- [Ultralytics YOLO](https://github.com/ultralytics/ultralytics)
- [Roboflow](https://roboflow.com/) for dataset hosting
- COMP7116001 Computer Vision course instructors

## License

This project is developed for educational purposes as part of the Computer Vision course at Bina Nusantara University.

---

*Built with ❤️ for better posture*
