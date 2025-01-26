import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const base = new Airtable({ 
      apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY 
    }).base(process.env.NEXT_AIRTABLE_BASE_ID!);

    const { quoteId, vehicleReg, vehicleDetails } = req.body;
    console.log('Received data:', { quoteId, vehicleReg, vehicleDetails });

    const records = await base('Submissions').create([
      {
        fields: {
          'QuoteID': quoteId,
          'Vehicle Registration': vehicleReg,
          'Brand': vehicleDetails.manufacturer,
          'Model': vehicleDetails.model,
          'Year': vehicleDetails.year,
          'Colour': vehicleDetails.colour,
          'Type': vehicleDetails.type,
          'style': vehicleDetails.style,
          'door': vehicleDetails.doorPlan.split(' ')[0]
        }
      }
    ]);

    console.log('Created record:', records);
    res.status(200).json({ success: true, record: records[0] });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
} 