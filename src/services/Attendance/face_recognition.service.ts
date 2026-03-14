import * as tf from "@tensorflow/tfjs";
import * as faceapi from "face-api.js";
import { createCanvas, Image, ImageData } from "canvas";
import sharp from "sharp";
import logger from "../../utils/logger";
import { EmployeeFace } from "../../entity/Attendance/employee_face.entity";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import { AppDataSource } from "../../database/connection";
 
let tfjsNodeAttempted = false;
let tfjsNodeLoaded = false;
 
let canvas: any = null;
let isSetup = false;
let faceMatcher: faceapi.FaceMatcher | null = null;
let faceMatcherLastUpdate: number = 0;
const FACE_MATCHER_CACHE_TTL = 10 * 60 * 1000;
 
let performanceStats = {
  totalProcesses: 0,
  totalTime: 0,
  averageTime: 0,
};
 
const setupFaceAPI = () => {
  if (isSetup) return;
 
  canvas = createCanvas(1, 1);
  faceapi.env.monkeyPatch({
    Canvas: canvas.constructor as any,
    Image: Image as any,
    ImageData: ImageData as any,
  });
 
  isSetup = true;
};
 
class FaceApiResponse implements Response {
  constructor(private nodeFetchResponse: any) {}
 
  get ok() {
    return this.nodeFetchResponse.ok;
  }
  get status() {
    return this.nodeFetchResponse.status;
  }
  get statusText() {
    return this.nodeFetchResponse.statusText;
  }
  get url() {
    return this.nodeFetchResponse.url;
  }
  get headers() {
    return {
      get: (name: string) => this.nodeFetchResponse.headers.get(name),
      has: (name: string) => this.nodeFetchResponse.headers.has(name),
      entries: () => this.nodeFetchResponse.headers.entries(),
      [Symbol.iterator]: () =>
        this.nodeFetchResponse.headers[Symbol.iterator](),
      getSetCookie: () => [],
    } as unknown as Headers;
  }
  get body() {
    return this.nodeFetchResponse.body;
  }
  get bodyUsed() {
    return this.nodeFetchResponse.bodyUsed;
  }
  get type() {
    return "basic" as ResponseType;
  }
  get redirected() {
    return false;
  }
 
  arrayBuffer() {
    return this.nodeFetchResponse.arrayBuffer();
  }
  text() {
    return this.nodeFetchResponse.text();
  }
  json() {
    return this.nodeFetchResponse.json();
  }
  blob() {
    return Promise.reject(new Error("Blob not implemented"));
  }
  formData() {
    return Promise.reject(new Error("FormData not implemented"));
  }
  clone() {
    return new FaceApiResponse(this.nodeFetchResponse.clone());
  }
 
  bytes(): Promise<Uint8Array<ArrayBuffer>> {
    return this.arrayBuffer().then((buf: ArrayBuffer) => new Uint8Array(buf));
  }
}
 
export class FaceRecognitionService {
  private static instance: FaceRecognitionService;
  private static isInitialized = false;
  public modelsLoaded = false;
 
  private readonly tinyFaceDetectorOptions =
    new faceapi.TinyFaceDetectorOptions({
      inputSize: 128,
      scoreThreshold: 0.3,
    });
 
  private static readonly MATCH_THRESHOLD = 0.45;
  private static readonly OPTIMIZED_IMAGE_SIZE = 224;
 
  private constructor() {
    logger.info(
      "FaceRecognitionService instance created with performance optimizations"
    );
  }
 
  public static async getInstance(): Promise<FaceRecognitionService> {
    if (!FaceRecognitionService.instance) {
      setupFaceAPI();
      FaceRecognitionService.instance = new FaceRecognitionService();
      await FaceRecognitionService.initialize();
    }
    return FaceRecognitionService.instance;
  }
 
  private static async initialize(): Promise<void> {
    if (FaceRecognitionService.isInitialized) return;
 
    try {
      await this.initializeTensorFlow();
      const instance = FaceRecognitionService.instance;
      await instance.loadModels();
      FaceRecognitionService.isInitialized = true;
      logger.info("FaceRecognitionService initialized successfully");
    } catch (error) {
      logger.error("Initialization failed", error);
      throw error;
    }
  }
 
  private static async initializeTensorFlow(): Promise<void> {
    try {
      if (!tfjsNodeAttempted) {
        tfjsNodeAttempted = true;
        if (process.env.ENABLE_TFJS_NODE !== "false") {
          try {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            require("@tensorflow/tfjs-node");
            tfjsNodeLoaded = true;
            logger.info("Optional @tensorflow/tfjs-node loaded (native backend).");
          } catch (err: any) {
            tfjsNodeLoaded = false;
            logger.warn(
              "@tensorflow/tfjs-node failed to load - falling back to JS backend. " +
                "If you want the native addon, run: npm rebuild @tensorflow/tfjs-node build-addon-from-source " +
                "and see https://github.com/tensorflow/tfjs/blob/master/tfjs-node/WINDOWS_TROUBLESHOOTING.md for troubleshooting."
            );
            logger.debug(err?.stack || err);
          }
        } else {
          logger.info("Skipping attempt to load @tensorflow/tfjs-node (ENABLE_TFJS_NODE=false). Using JS backend.");
        }
      }
 
      // Prefer 'tensorflow' backend if native loaded, otherwise fallback to cpu
      try {
        if (tfjsNodeLoaded) {
          if (tf.getBackend() !== "tensorflow") await tf.setBackend("tensorflow");
        } else {
          if (tf.getBackend() !== "cpu") await tf.setBackend("cpu");
        }
      } catch (backendErr) {
        // last-resort fallback to cpu
        try { await tf.setBackend("cpu"); } catch (_) { /* ignore */ }
      }
      await tf.ready();
      tf.enableProdMode();
      logger.info(`TensorFlow.js backend initialized: ${tf.getBackend()}`);
 
      if (!(faceapi.tf as any).platform) {
        faceapi.tf.setPlatform("node", {
          fetch: async (path: string) => {
            const response = await fetch(path);
            return new FaceApiResponse(response);
          },
          now: () => Date.now(),
          encode: (text: string) => new TextEncoder().encode(text),
          decode: (bytes: Uint8Array) => new TextDecoder().decode(bytes),
        });
      }
    } catch (error) {
      logger.error("TensorFlow initialization failed", error);
      throw error;
    }
  }
 
  private async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
 
    try {
      logger.info("Loading optimized face recognition models...");
 
      const modelPath = path.join(__dirname, "../../../models");
      if (!fs.existsSync(modelPath)) {
        throw new Error(`Model path not found: ${modelPath}`);
      }
 
      // **LOAD ONLY ESSENTIAL MODELS FOR SPEED**
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath),
        faceapi.nets.faceLandmark68TinyNet.loadFromDisk(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath),
      ]);
 
      this.modelsLoaded = true;
      // expose instance flag
      (this as any).modelsLoaded = true;
      // Warm up TF backend (cheap op) to reduce first-inference latency
      try {
        // small tensor build + dispose to trigger backend JIT/init
        tf.tidy(() => {
          const t = (tf as any).zeros([1]);
          t.dataSync();
        });
        logger.info("TensorFlow backend warm-up completed");
      } catch (warmErr) {
        logger.warn("TensorFlow warm-up failed (non-fatal):", warmErr);
      }
      logger.info("Optimized face recognition models loaded successfully");
    } catch (error) {
      logger.error("Model loading failed", error);
      throw error;
    }
  }
 
  // Public API: ensure models are loaded (wait if required)
  public async ensureModelsLoaded(timeoutMs = 10000): Promise<void> {
    if (this.modelsLoaded) return;
    const start = Date.now();
    while (!this.modelsLoaded && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 200));
    }
    if (!this.modelsLoaded) {
      throw new Error("FaceRecognition models not loaded within timeout");
    }
  }
 
  // **HIGH-SPEED face descriptor extraction**
  public async extractFaceDescriptor(imageBuffer: Buffer): Promise<number[]> {
    const startTime = Date.now();
 
    try {
      if (!this.modelsLoaded) {
        // Friendly message to help debugging "load model before inference"
        throw new Error("Models not loaded - call ensureModelsLoaded() before inference");
      }
      // **FAST PREPROCESSING**
      const processedImage = await this.fastPreprocessImage(imageBuffer);
 
      const img = new Image();
      img.src = processedImage;
 
      const input = faceapi.createCanvasFromMedia(img as any);
 
      // **USE TINY FACE DETECTOR + TINY LANDMARKS FOR MAXIMUM SPEED**
      const detections = await faceapi
        .detectAllFaces(input, this.tinyFaceDetectorOptions)
        .withFaceLandmarks(true) // true = use tiny landmarks (68TinyNet)
        .withFaceDescriptors();
 
      if (detections.length === 0) {
        throw new Error("No face detected in the image");
      }
 
      if (detections.length > 1) {
        const bestDetection = detections[0];
        logger.warn(
          `Multiple faces detected, using first face: ${bestDetection.detection.score}`
        );
        return Array.from(bestDetection.descriptor);
      }
 
      const processingTime = Date.now() - startTime;
      this.updatePerformanceStats(processingTime);
 
      logger.info(`Face descriptor extracted in ${processingTime}ms`);
      return Array.from(detections[0].descriptor);
    } catch (error) {
      logger.error("Face descriptor extraction failed:", error);
      throw error;
    }
  }
 
  // **ULTRA-FAST image preprocessing**
  private async fastPreprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .rotate() // Auto-rotate based on EXIF
        .resize(224, 224, {
          // Smaller size for speed
          fit: "cover",
          withoutEnlargement: true,
          fastShrinkOnLoad: true,
        })
        .jpeg({
          quality: 70, // Lower quality for speed
          mozjpeg: true,
        })
        .toBuffer();
    } catch (error) {
      logger.error("Image preprocessing failed", error);
      throw error;
    }
  }
 
  // **OPTIMIZED cached face matcher**
  private async getCachedFaceMatcher(): Promise<faceapi.FaceMatcher> {
    const now = Date.now();
 
    if (faceMatcher && now - faceMatcherLastUpdate < FACE_MATCHER_CACHE_TTL) {
      return faceMatcher;
    }
 
    const Employeeface = AppDataSource.getRepository(EmployeeFace);
    const activeFaces = await Employeeface.find({
      where: { is_active: "1" },
      select: ["employee_id", "descriptor"],
     // raw: true, // Faster database query
    });
 
    if (activeFaces.length === 0) {
      throw new Error("No registered faces found in database");
    }
 
  // Group descriptors by employee_id
  const grouped = new Map<string, Float32Array[]>();

 for (const face of activeFaces) {
  let descriptorArray: number[];

  if (Array.isArray(face.descriptor)) {
    descriptorArray = face.descriptor;
  } else if (typeof face.descriptor === "string") {
    descriptorArray = JSON.parse(face.descriptor);
  } else {
    descriptorArray = Object.values(face.descriptor as object);
  }

  if (!grouped.has(face.employee_id)) {
    grouped.set(face.employee_id, []);
  }

  grouped
    .get(face.employee_id)!
    .push(new Float32Array(descriptorArray));
 }

const labeledDescriptors = Array.from(grouped.entries()).map(
  ([employeeId, descriptors]) =>
    new faceapi.LabeledFaceDescriptors(employeeId, descriptors)
);

    faceMatcher = new faceapi.FaceMatcher(
      labeledDescriptors,
      FaceRecognitionService.MATCH_THRESHOLD
    );
    faceMatcherLastUpdate = now;
 
    logger.info(
      `Face matcher cache updated with ${labeledDescriptors.length} employees`
    );
    return faceMatcher;
  }
 
 
  public async findBestMatch(
    descriptor: number[]
  ): Promise<{ employeeId: string; confidence: number } | null> {
    const startTime = Date.now();
 
    try {
      const faceMatcher = await this.getCachedFaceMatcher();
      const bestMatch = faceMatcher.findBestMatch(new Float32Array(descriptor));
 
      const confidence = (1 - bestMatch.distance) * 100;
      const matchingTime = Date.now() - startTime;
 
      if (
        bestMatch.distance <= FaceRecognitionService.MATCH_THRESHOLD &&
        bestMatch.label !== "unknown"
      ) {
        logger.info(
          `Match found: ${
            bestMatch.label
          } in ${matchingTime}ms (${confidence.toFixed(1)}% confidence)`
        );
        return {
          employeeId: bestMatch.label,
          confidence: confidence,
        };
      }
 
      logger.warn(
        `No match found in ${matchingTime}ms. Distance: ${bestMatch.distance.toFixed(
          3
        )}`
      );
      return null;
    } catch (error) {
      logger.error("Face matching failed", error);
      throw error;
    }
  }
 
  // **Performance monitoring**
  private updatePerformanceStats(processingTime: number): void {
    performanceStats.totalProcesses++;
    performanceStats.totalTime += processingTime;
    performanceStats.averageTime =
      performanceStats.totalTime / performanceStats.totalProcesses;
 
    // Log performance every 10 processes
    if (performanceStats.totalProcesses % 10 === 0) {
      logger.info(
        `Performance stats - Avg: ${performanceStats.averageTime.toFixed(
          0
        )}ms, Total: ${performanceStats.totalProcesses}`
      );
    }
  }
 
  public getPerformanceStats() {
    return { ...performanceStats };
  }
 
 
  public async quickFaceCheck(imageBuffer: Buffer): Promise<boolean> {
    try {
      const processedImage = await this.fastPreprocessImage(imageBuffer);
      const img = new Image();
      img.src = processedImage;
      const input = faceapi.createCanvasFromMedia(img as any);
 
      const detections = await faceapi.detectAllFaces(
        input,
        this.tinyFaceDetectorOptions
      );
      return detections.length > 0;
    } catch (error) {
      return false;
    }
  }
 
  static async warmUp(): Promise<void> {
    try {
      const instance = await this.getInstance();
 
      // create a tiny valid JPEG so sharp won't reject the buffer
      const testBuffer = await sharp({
        create: {
          width: 16,
          height: 16,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .jpeg({ quality: 60 })
        .toBuffer();
 
      try {
        await instance.quickFaceCheck(testBuffer);
        logger.info("✅ Face recognition quickWarmUp completed (no-face expected)");
      } catch (quickErr) {
        logger.warn("⚠️ quickFaceCheck warm-up returned an error (non-fatal):", quickErr);
      }
 
      try {
        tf.tidy(() => {
          const t = (tf as any).zeros([1]);
          t.dataSync();
        });
        logger.info("✅ TensorFlow backend warm-up completed");
      } catch (tfErr) {
        logger.warn("⚠️ TensorFlow warm-up failed (non-fatal):", tfErr);
      }
 
    } catch (error) {
      logger.warn("Face recognition warm-up encountered error (non-fatal):", error);
    }
  }
 
  public clearFaceMatcherCache(): void {
    faceMatcher = null;
    faceMatcherLastUpdate = 0;
    logger.info("Face matcher cache cleared");
  }
}
 
export const getFaceRecognitionService = () =>
  FaceRecognitionService.getInstance();
export default getFaceRecognitionService;