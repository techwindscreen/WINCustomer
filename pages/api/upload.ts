import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { uploadRateLimit } from '../../lib/rateLimiter';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const uploadDir = path.join(process.cwd(), '/public/uploads');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Define allowed file types and sizes
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp'
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Configure multer storage with security checks
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate secure random filename
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomName}${ext}`);
  },
});

// File filter for security
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
  }
  
  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
    return cb(new Error('Invalid file extension.'));
  }
  
  cb(null, true);
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  }
});

const uploadMiddleware = upload.single('file');

// Convert the middleware to a promise-based function for use with Next.js
const runMiddleware = promisify(uploadMiddleware);

export default async function handler(req: MulterRequest, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Apply rate limiting
  const rateLimitResult = uploadRateLimit(req as any, res as any);
  if (rateLimitResult !== true) {
    return; // Rate limit response already sent
  }

  try {
    // Run multer middleware to handle the file upload
    await runMiddleware(req, res);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Additional security: validate file content
    const fileBuffer = fs.readFileSync(req.file.path);
    
    // Basic magic number validation for images
    const isValidImage = validateImageFile(fileBuffer, req.file.mimetype);
    if (!isValidImage) {
      // Delete the uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Invalid image file content' });
    }

    // Create a public URL to access the file
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to upload file: ${errorMessage}` });
  }
}

// Validate image file by checking magic numbers
function validateImageFile(buffer: Buffer, mimetype: string): boolean {
  const jpeg = [0xFF, 0xD8, 0xFF];
  const png = [0x89, 0x50, 0x4E, 0x47];
  const webp = [0x52, 0x49, 0x46, 0x46];

  switch (mimetype) {
    case 'image/jpeg':
    case 'image/jpg':
      return jpeg.every((byte, index) => buffer[index] === byte);
    case 'image/png':
      return png.every((byte, index) => buffer[index] === byte);
    case 'image/webp':
      return webp.every((byte, index) => buffer[index] === byte) && 
             buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    default:
      return false;
  }
}

// Next.js configuration to disable the default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
