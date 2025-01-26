// /pages/api/loadCsvData.ts
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { NextApiRequest, NextApiResponse } from 'next';
import { ParseError } from 'papaparse';

interface CarData {
  Brand: string;
  Model: string;
  Year: string;
  style?: string;
  door?: string;
  questions?: string;
  'Competitor Price'?: string;
  'WinC - New Price'?: string;
  'Basic Price'?: string;
  'Fastest Price'?: string;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const filePath = path.join(process.cwd(), 'public/data/AIRTABLEWindscreen Compare UK_CAR_data (1).csv');
  const file = fs.readFileSync(filePath, 'utf8');

  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  Papa.parse<CarData>(file, {
    header: true,
    complete: (results) => {
      const paginatedData = results.data.slice(startIndex, endIndex);
      res.status(200).json(paginatedData);
    },
    error: (error: Error) => {
      console.error('CSV parsing error:', error);
      res.status(500).json({ error: 'Error reading CSV file' });
    },
  });
}
