import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Request, Response } from 'express';

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const uploadDir = path.join(process.cwd(), '/public/uploads');

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage });
const uploadMiddleware = upload.single('file');

// Convert the middleware to a promise-based function for use with Next.js
const runMiddleware = promisify(uploadMiddleware);

export default async function handler(req: MulterRequest, res: Response) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Run multer middleware to handle the file upload
    await runMiddleware(req, res);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Create a public URL to access the file
    const fileUrl = `${req.headers.origin}/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: `Failed to upload file: ${errorMessage}` });
  }
}

// Next.js configuration to disable the default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};
