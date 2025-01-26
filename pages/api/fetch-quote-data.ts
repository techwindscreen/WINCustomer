import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { quoteID } = req.query;

  if (!quoteID) {
    return res.status(400).json({ message: 'Quote ID is required' });
  }

  try {
    const base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

    const records = await base('Submissions').select({
      filterByFormula: `{QuoteID} = '${quoteID}'`
    }).firstPage();

    if (records.length === 0) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    res.status(200).json({ data: records[0].fields });
  } catch (error) {
    console.error('Error fetching quote data:', error);
    res.status(500).json({ message: 'Error fetching quote data' });
  }
} 