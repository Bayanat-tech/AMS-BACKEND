import * as faceapi from "@vladmandic/face-api";
import { AppDataSource } from "../../database/connection";
import { EmployeeFace } from "../../entity/Attendance/employee_face.entity";
import logger from "../../utils/logger";
import * as path from "path";
import * as fs from "fs";

let faceMatcher: faceapi.FaceMatcher | null = null;
let faceMatcherLastUpdate: number = 0;
const FACE_MATCHER_CACHE_TTL = 10 * 60 * 1000; // 10 min

export class FaceRecognitionService {
  private static instance: FaceRecognitionService;
  private modelsLoaded = false;
  private static readonly MATCH_THRESHOLD = 0.52;

  private readonly tinyFaceDetectorOptions = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  private constructor() {}

  static async getInstance(): Promise<FaceRecognitionService> {
    if (!FaceRecognitionService.instance) {
      FaceRecognitionService.instance = new FaceRecognitionService();
      await FaceRecognitionService.instance.loadModels();
    }
    return FaceRecognitionService.instance;
  }

  private async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    const modelPath = path.join(process.cwd(), "models");
    if (!fs.existsSync(modelPath)) {
      logger.warn(`Model path not found: ${modelPath}`);
      return;
    }
    try {
      await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
      this.modelsLoaded = true;
      logger.info("Face models loaded successfully");
    } catch (error) {
      logger.error("Failed to load face models:", error);
    }
  }

  private parseDescriptor(raw: any): number[] | null {
    if (!raw) return null;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      try {
        return this.parseDescriptor(JSON.parse(raw));
      } catch {
        return null;
      }
    }
    if (typeof raw === "object") {
      const keys = Object.keys(raw)
        .filter(k => !isNaN(Number(k)))
        .sort((a, b) => Number(a) - Number(b));
      if (keys.length === 128) return keys.map(k => raw[k]);
    }
    return null;
  }

  private async getCachedFaceMatcher(): Promise<faceapi.FaceMatcher> {
    const now = Date.now();
    if (faceMatcher && now - faceMatcherLastUpdate < FACE_MATCHER_CACHE_TTL) {
      return faceMatcher;
    }

    const activeFaces = await AppDataSource.getRepository(EmployeeFace).find({
      where: { is_active: "1" },
      select: ["employee_id", "descriptor"],
    });

    if (activeFaces.length === 0) {
      throw new Error("No registered faces found in database");
    }

    const grouped = new Map<string, Float32Array[]>();

    for (const face of activeFaces) {
      const arr = this.parseDescriptor(face.descriptor);
      if (!arr || arr.length !== 128) continue;
      if (!grouped.has(face.employee_id)) grouped.set(face.employee_id, []);
      grouped.get(face.employee_id)!.push(new Float32Array(arr));
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
    logger.info(`Face matcher cache updated with ${labeledDescriptors.length} employees`);
    return faceMatcher;
  }

  // public async extractFaceDescriptor(imageBuffer: Buffer): Promise<Float32Array> {
  //   if (!this.modelsLoaded) {
  //     await this.loadModels();
  //     if (!this.modelsLoaded) throw new Error("Face models not loaded");
  //   }

  //   try {
  //     const tensor = (faceapi.tf as any).node.decodeImage(imageBuffer, 3);

  //     const detection = await faceapi
  //       .detectSingleFace(tensor, this.tinyFaceDetectorOptions)
  //       .withFaceLandmarks()
  //       .withFaceDescriptor();

  //     tensor.dispose();

  //     if (!detection) throw new Error("No face detected in image");

  //     return detection.descriptor;
  //   } catch (error: any) {
  //     logger.error(`Face extraction failed: ${error.message}`);
  //     throw error;
  //   }
  // }

  public async extractFaceDescriptor(imageBuffer: Buffer): Promise<Float32Array> {
  if (!this.modelsLoaded) {
    await this.loadModels();
    if (!this.modelsLoaded) throw new Error("Face models not loaded");
  }

  try {
    const tf = faceapi.tf as any;
    let tensor;

    // Use node decoder on Linux, fallback for Windows
    if (tf.node && tf.node.decodeImage) {
      tensor = tf.node.decodeImage(imageBuffer, 3);
    } else {
      // Windows fallback — decode manually
      const sharp = require('sharp');
      const { data, info } = await sharp(imageBuffer)
        .resize(320, 320, { fit: 'cover' })
        .raw()
        .toBuffer({ resolveWithObject: true });
      tensor = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
    }

    const detection = await faceapi
      .detectSingleFace(tensor, this.tinyFaceDetectorOptions)
      .withFaceLandmarks()
      .withFaceDescriptor();

    tensor.dispose();

    if (!detection) throw new Error("No face detected in image");

    return detection.descriptor;
  } catch (error: any) {
    logger.error(`Face extraction failed: ${error.message}`);
    throw error;
  }
  }

  public async findBestMatch(
    descriptor: Float32Array,
    company_code?: string
  ): Promise<{ employeeId: string; confidence: number } | null> {
    try {
      const matcher = await this.getCachedFaceMatcher();
      const best = matcher.findBestMatch(descriptor);
      const confidence = (1 - best.distance) * 100;

      if (best.label !== "unknown" && best.distance <= FaceRecognitionService.MATCH_THRESHOLD) {
        logger.info(`Match: ${best.label} confidence ${confidence.toFixed(1)}% distance ${best.distance.toFixed(3)}`);
        return { employeeId: best.label, confidence };
      }

      logger.warn(`No match. Best distance: ${best.distance.toFixed(3)}`);
      return null;
    } catch (error: any) {
      logger.error(`findBestMatch error: ${error.message}`);
      throw error;
    }
  }

  public clearFaceMatcherCache(): void {
    faceMatcher = null;
    faceMatcherLastUpdate = 0;
    logger.info("Face matcher cache cleared");
  }
}

export const getFaceRecognitionService = () => FaceRecognitionService.getInstance();