import * as ort from 'onnxruntime-web';

// YOLO model configuration
const MODEL_URL = 'https://huggingface.co/onnx-community/yolov8n/resolve/main/onnx/yolov8n.onnx';
const MODEL_INPUT_SIZE = 640;
const CONFIDENCE_THRESHOLD = 0.3;
const IOU_THRESHOLD = 0.45;

export interface DetectionResult {
  class: number;
  className: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface YOLOModel {
  session: ort.InferenceSession;
  classes: string[];
}

// COCO dataset class names for YOLOv8
const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle',
  'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange',
  'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed',
  'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven',
  'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
];

// Construction-specific classes for safety and equipment detection
const CONSTRUCTION_CLASSES = [
  ...COCO_CLASSES,
  'helmet', 'safety_vest', 'hard_hat', 'safety_glasses', 'gloves', 'steel_toe_boots',
  'excavator', 'bulldozer', 'crane', 'dump_truck', 'forklift', 'backhoe',
  'concrete_mixer', 'jackhammer', 'scaffold', 'ladder', 'welding_machine',
  'cement_bag', 'steel_beam', 'pipe', 'rebar', 'construction_vehicle',
  'warning_sign', 'traffic_cone', 'barrier_tape'
];

class YOLOService {
  private model: YOLOModel | null = null;
  private isLoading = false;

  async loadModel(): Promise<void> {
    if (this.model || this.isLoading) {
      return; // Already loaded or loading
    }

    this.isLoading = true;

    try {
      console.log('Loading YOLOv8 model...');

      // Initialize ONNX Runtime Web with WebGL backend
      ort.env.wasm.numThreads = 1; // Limit to 1 thread for browser compatibility
      ort.env.wasm.simd = false;   // Disable SIMD for compatibility

      // Load the model
      const session = await ort.InferenceSession.create(MODEL_URL, {
        executionProviders: ['webgl', 'cpu'],
        graphOptimizationLevel: 'all',
      });

      this.model = {
        session,
        classes: CONSTRUCTION_CLASSES,
      };

      console.log('YOLO model loaded successfully');
    } catch (error) {
      console.error('Failed to load YOLO model:', error);
      throw new Error('Unable to load YOLO model. Please check your internet connection.');
    } finally {
      this.isLoading = false;
    }
  }

  async detectObjects(imageData: ImageData, returnImageWithBoxes = true): Promise<{
    detections: DetectionResult[],
    annotatedImage?: ImageData
  }> {
    if (!this.model) {
      throw new Error('YOLO model not loaded. Call loadModel() first.');
    }

    try {
      // Preprocess image
      const processedImage = await this.preprocessImage(imageData);
      const { tensor, originalWidth, originalHeight } = processedImage;

      const feeds = {
        images: tensor
      };

      const results = await this.model.session.run(feeds);

      // Get output tensor - use standard object access
      const outputNames = Object.keys(results);
      const output = results[outputNames[0]];

      if (!output) {
        throw new Error('No output from model');
      }

      // Post-process detections
      const detections = this.postprocessOutput(
        output.data as Float32Array,
        originalWidth,
        originalHeight,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE
      );

      // Filter detections by confidence and apply NMS
      const filteredDetections = this.filterDetections(detections);

      // Draw bounding boxes if requested
      let annotatedImage: ImageData | undefined;
      if (returnImageWithBoxes && filteredDetections.length > 0) {
        annotatedImage = this.drawBoundingBoxes(imageData, filteredDetections);
      }

      return {
        detections: filteredDetections,
        annotatedImage
      };

    } catch (error) {
      console.error('Detection failed:', error);
      throw error;
    }
  }

  private async preprocessImage(imageData: ImageData): Promise<{
    tensor: ort.Tensor,
    originalWidth: number,
    originalHeight: number
  }> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = MODEL_INPUT_SIZE;
    canvas.height = MODEL_INPUT_SIZE;

    // Create source canvas for original image
    const sourceCanvas = document.createElement('canvas');
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCanvas.width = imageData.width;
    sourceCanvas.height = imageData.height;
    sourceCtx.putImageData(imageData, 0, 0);

    // Calculate scaling to maintain aspect ratio
    const aspectRatio = imageData.width / imageData.height;
    let drawWidth = MODEL_INPUT_SIZE;
    let drawHeight = MODEL_INPUT_SIZE;

    if (aspectRatio > 1) {
      drawHeight = MODEL_INPUT_SIZE / aspectRatio;
    } else {
      drawWidth = MODEL_INPUT_SIZE * aspectRatio;
    }

    // Center the image
    const xOffset = (MODEL_INPUT_SIZE - drawWidth) / 2;
    const yOffset = (MODEL_INPUT_SIZE - drawHeight) / 2;

    // Clear canvas with black background (required by YOLO)
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

    // Draw scaled image
    ctx.drawImage(sourceCanvas, xOffset, yOffset, drawWidth, drawHeight);

    // Get image data and convert to tensor
    const processedImageData = ctx.getImageData(0, 0, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE);

    // Convert to NCHW format [1, 3, 640, 640] and normalize to 0-1
    const pixels = processedImageData.data;
    const red = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
    const green = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
    const blue = new Float32Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);

    for (let i = 0; i < pixels.length; i += 4) {
      const pixelIndex = i / 4;
      red[pixelIndex] = pixels[i] / 255.0;
      green[pixelIndex] = pixels[i + 1] / 255.0;
      blue[pixelIndex] = pixels[i + 2] / 255.0;
    }

    // Create tensor in NCHW format
    const tensorData = new Float32Array([...red, ...green, ...blue]);
    const tensor = new ort.Tensor('float32', tensorData, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);

    return {
      tensor,
      originalWidth: imageData.width,
      originalHeight: imageData.height
    };
  }

  private postprocessOutput(
    output: Float32Array,
    originalWidth: number,
    originalHeight: number,
    inputWidth: number,
    inputHeight: number
  ): DetectionResult[] {
    const detections: DetectionResult[] = [];

    // YOLOv8 output format: [1, 84, 8400] for 80 COCO classes + 4 bbox coords
    const numClasses = 80; // COCO has 80 classes
    const numPredictions = 8400; // 8400 predictions per class

    for (let i = 0; i < numPredictions; i++) {
      // Each prediction has [x, y, w, h, conf, class1_conf, class2_conf, ...]
      const offset = i * (4 + 1 + numClasses); // 4 bbox + 1 obj_conf + 80 class_conf
      const x = output[offset];
      const y = output[offset + 1];
      const w = output[offset + 2];
      const h = output[offset + 3];
      const objConf = output[offset + 4];

      // Find the class with highest confidence
      let maxClassConf = 0;
      let maxClassIdx = 0;

      for (let j = 0; j < numClasses; j++) {
        const classConf = output[offset + 5 + j];
        const combinedConf = objConf * classConf;
        if (combinedConf > maxClassConf) {
          maxClassConf = combinedConf;
          maxClassIdx = j;
        }
      }

      if (maxClassConf > CONFIDENCE_THRESHOLD) {
        // Convert from model coordinates to original image coordinates
        const scaleX = originalWidth / inputWidth;
        const scaleY = originalHeight / inputHeight;

        // YOLO outputs center coordinates, convert to top-left
        const centerX = x * scaleX;
        const centerY = y * scaleY;
        const boxWidth = w * scaleX;
        const boxHeight = h * scaleY;

        const bbox: [number, number, number, number] = [
          Math.max(0, centerX - boxWidth / 2),
          Math.max(0, centerY - boxHeight / 2),
          boxWidth,
          boxHeight
        ];

        // Only add if bbox is within image bounds
        if (bbox[0] + bbox[2] <= originalWidth && bbox[1] + bbox[3] <= originalHeight) {
          detections.push({
            class: maxClassIdx,
            className: this.model!.classes[maxClassIdx] || `class_${maxClassIdx}`,
            confidence: maxClassConf,
            bbox
          });
        }
      }
    }

    return detections;
  }

  private filterDetections(detections: DetectionResult[]): DetectionResult[] {
    // Sort by confidence descending
    detections.sort((a, b) => b.confidence - a.confidence);

    const filtered: DetectionResult[] = [];

    for (const detection of detections) {
      // Check for overlap with existing detections
      let shouldAdd = true;

      for (const existing of filtered) {
        if (detection.class === existing.class) { // Only compare same class
          const iou = this.calculateIoU(detection.bbox, existing.bbox);
          if (iou > IOU_THRESHOLD) {
            shouldAdd = false;
            break;
          }
        }
      }

      if (shouldAdd) {
        filtered.push(detection);
      }
    }

    // Filter for construction-relevant objects
    const constructionRelevantClasses = [
      'person', 'car', 'truck', 'bus', 'helmet', 'safety_vest', 'hard_hat',
      'excavator', 'bulldozer', 'crane', 'dump_truck', 'forklift', 'backhoe',
      'concrete_mixer', 'scaffold', 'ladder', 'warning_sign', 'traffic_cone'
    ];

    return filtered.filter(detection =>
      constructionRelevantClasses.includes(detection.className)
    );
  }

  private calculateIoU(box1: [number, number, number, number], box2: [number, number, number, number]): number {
    const [x1, y1, w1, h1] = box1;
    const [x2, y2, w2, h2] = box2;

    const box1Right = x1 + w1;
    const box1Bottom = y1 + h1;
    const box2Right = x2 + w2;
    const box2Bottom = y2 + h2;

    const intersectionX1 = Math.max(x1, x2);
    const intersectionY1 = Math.max(y1, y2);
    const intersectionX2 = Math.min(box1Right, box2Right);
    const intersectionY2 = Math.min(box1Bottom, box2Bottom);

    const intersectionArea = Math.max(0, intersectionX2 - intersectionX1) * Math.max(0, intersectionY2 - intersectionY1);
    const box1Area = w1 * h1;
    const box2Area = w2 * h2;
    const unionArea = box1Area + box2Area - intersectionArea;

    return unionArea > 0 ? intersectionArea / unionArea : 0;
  }

  private drawBoundingBoxes(imageData: ImageData, detections: DetectionResult[]): ImageData {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);

    // Colors for different classes
    const colors: { [key: string]: string } = {
      'person': '#FF6B6B',
      'helmet': '#4ECDC4',
      'safety_vest': '#45B7D1',
      'truck': '#96CEB4',
      'car': '#FECA57',
      'excavator': '#FF9FF3',
      'warning_sign': '#FF7675',
      'traffic_cone': '#FDCB6E'
    };

    detections.forEach((detection) => {
      const [x, y, width, height] = detection.bbox;
      const color = colors[detection.className] || '#A29BFE';

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw label background
      const label = `${detection.className} ${(detection.confidence * 100).toFixed(1)}%`;
      ctx.font = '16px Arial';
      const textMetrics = ctx.measureText(label);
      ctx.fillStyle = color;
      ctx.fillRect(x, y - 25, textMetrics.width + 10, 25);

      // Draw label text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(label, x + 5, y - 7);
    });

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  get isModelLoaded(): boolean {
    return this.model !== null;
  }
}

// Singleton instance
export const yoloService = new YOLOService();
