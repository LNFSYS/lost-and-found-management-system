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
    throw new HttpError(503, "Dịch vụ tải ảnh chưa sẵn sàng. Vui lòng dùng dữ liệu demo hoặc liên hệ quản trị viên.");
  }

  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true
  });
}

function assertTrustedCloudinaryUrl(value: string) {
  ensureConfigured();
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new HttpError(422, "Invalid media URL");
  }

  const expectedPathPrefix = `/${env.cloudinary.cloudName}/image/upload/`;
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com" || !url.pathname.startsWith(expectedPathPrefix)) {
    throw new HttpError(422, "Untrusted media source");
  }
  return url;
}

function assertPublicIdInFolder(publicId: string, folder: string) {
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, "");
  if (!/^[a-zA-Z0-9/_-]{1,255}$/.test(publicId) || !publicId.startsWith(`${normalizedFolder}/`)) {
    throw new HttpError(422, "Invalid media identifier");
  }
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
  },

  async resolveUploadedImage(publicId: string, folder: string): Promise<UploadedAsset> {
    ensureConfigured();
    assertPublicIdInFolder(publicId, folder);
    try {
      const result = (await cloudinary.api.resource(publicId, { resource_type: "image" })) as {
        public_id?: string;
        secure_url?: string;
        resource_type?: string;
        format?: string;
        width?: number;
        height?: number;
        bytes?: number;
      };
      if (result.public_id !== publicId || result.resource_type !== "image" || !result.secure_url) {
        throw new HttpError(404, "Uploaded image not found");
      }
      assertTrustedCloudinaryUrl(result.secure_url);
      return {
        secureUrl: result.secure_url,
        publicId,
        resourceType: result.resource_type,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes
      };
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      throw new HttpError(404, "Uploaded image not found");
    }
  },

  async downloadTrustedImage(imageUrl: string) {
    assertTrustedCloudinaryUrl(imageUrl);
    const upstream = await fetch(imageUrl, { signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok) {
      throw new HttpError(502, "Unable to load protected image");
    }

    const contentType = upstream.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      throw new HttpError(502, "Protected media source did not return an image");
    }

    const maxBytes = 15 * 1024 * 1024;
    const declaredLength = Number(upstream.headers.get("content-length") ?? 0);
    if (declaredLength > maxBytes) {
      throw new HttpError(413, "Protected image is too large");
    }
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > maxBytes) {
      throw new HttpError(413, "Protected image is too large");
    }
    return { bytes, contentType };
  }
};
