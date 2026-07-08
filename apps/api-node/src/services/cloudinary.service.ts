import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { isConfigured } from "../utils/configured.js";
import { HttpError } from "../utils/http-error.js";

export interface UploadedAsset {
  secureUrl: string;
  thumbnailUrl?: string;
  optimizedUrl?: string;
  publicId: string;
  resourceType: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
}

function configured() {
  return (
    isConfigured(env.cloudinary.cloudName) &&
    isConfigured(env.cloudinary.apiKey) &&
    isConfigured(env.cloudinary.apiSecret)
  );
}

function ensureConfigured() {
  if (!configured()) {
    console.warn("Cloudinary is not configured. Configure CLOUDINARY_* variables.");
    throw new HttpError(503, "Cloudinary is not configured");
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });
}

function streamUpload(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        overwrite: false,
        eager: [
          { width: 360, height: 260, crop: "fill", gravity: "auto", quality: "auto", fetch_format: "auto" },
          { width: 1280, crop: "limit", quality: "auto", fetch_format: "auto" }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        if (!result) {
          reject(new Error("Cloudinary upload returned no result"));
          return;
        }
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export const cloudinaryService = {
  async uploadImage(buffer: Buffer, folder: string): Promise<UploadedAsset> {
    ensureConfigured();
    const result = await streamUpload(buffer, folder);

    return {
      secureUrl: result.secure_url,
      thumbnailUrl: result.eager?.[0]?.secure_url,
      optimizedUrl: result.eager?.[1]?.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes
    };
  },

  async deleteAsset(publicId: string): Promise<void> {
    ensureConfigured();
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
  }
};
