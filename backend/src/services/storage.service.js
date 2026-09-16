import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config.js';

/**
 * Pluggable Storage Service.
 * Controlled by STORAGE_PROVIDER environment variable: 'local' | 's3' | 'cloudinary'.
 * Returns uniform { fileUrl, fileKey } structure across all providers.
 */

// ─── Local Disk Storage (Default for Development) ────────────────────────────
const saveLocal = async (file) => {
  const uploadDir = path.join(process.cwd(), config.STORAGE_LOCAL_DIR);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const fileKey = `${uuidv4()}${ext}`;
  const destPath = path.join(uploadDir, fileKey);

  fs.writeFileSync(destPath, file.buffer);

  const fileUrl = `/uploads/${fileKey}`;
  return { fileUrl, fileKey };
};

const deleteLocal = async (fileKey) => {
  const filePath = path.join(process.cwd(), config.STORAGE_LOCAL_DIR, fileKey);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// ─── AWS S3 Provider (Pluggable) ─────────────────────────────────────────────
const saveS3 = async (file) => {
  // Dynamic import for AWS SDK when provider is 's3'
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const { AWS } = config;
  const client = new S3Client({
    region: AWS.region,
    credentials: { accessKeyId: AWS.accessKeyId, secretAccessKey: AWS.secretAccessKey },
  });

  const ext = path.extname(file.originalname).toLowerCase();
  const fileKey = `submissions/${uuidv4()}${ext}`;

  await client.send(
    new PutObjectCommand({
      Bucket: AWS.bucket,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  const fileUrl = `https://${AWS.bucket}.s3.${AWS.region}.amazonaws.com/${fileKey}`;
  return { fileUrl, fileKey };
};

const deleteS3 = async (fileKey) => {
  const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const { AWS } = config;
  const client = new S3Client({
    region: AWS.region,
    credentials: { accessKeyId: AWS.accessKeyId, secretAccessKey: AWS.secretAccessKey },
  });
  await client.send(new DeleteObjectCommand({ Bucket: AWS.bucket, Key: fileKey }));
};

// ─── Cloudinary Provider (Pluggable) ─────────────────────────────────────────
const saveCloudinary = async (file) => {
  const cloudinary = (await import('cloudinary')).v2;
  const { CLOUDINARY } = config;
  cloudinary.config({
    cloud_name: CLOUDINARY.cloudName,
    api_key: CLOUDINARY.apiKey,
    api_secret: CLOUDINARY.apiSecret,
  });

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: 'yuwa-ecolympics' }, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
    stream.end(file.buffer);
  });

  return { fileUrl: result.secure_url, fileKey: result.public_id };
};

// ─── Public Interface ────────────────────────────────────────────────────────
export const saveFile = async (file) => {
  switch (config.STORAGE_PROVIDER) {
    case 's3':
      return saveS3(file);
    case 'cloudinary':
      return saveCloudinary(file);
    default:
      return saveLocal(file);
  }
};

export const deleteFile = async (fileKey) => {
  switch (config.STORAGE_PROVIDER) {
    case 's3':
      return deleteS3(fileKey);
    case 'cloudinary':
      break;
    default:
      return deleteLocal(fileKey);
  }
};

/**
 * Determine MIME category from MIME type string.
 */
export const getMimeCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (
    [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ].includes(mimeType)
  ) {
    return 'document';
  }
  return 'other';
};

export default { saveFile, deleteFile, getMimeCategory };
