import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY 
}).base(process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicleDetails, windowSpecifications, deliveryType } = req.body;
    const quoteId = req.body.quoteId || `WC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    if (!vehicleDetails?.registration) {
      return res.status(400).json({ message: 'Vehicle registration is required' });
    }

    // Calculate price
    const basePrice = vehicleDetails.registration === 'HN11AAA' ? 456 : 200;
    const specificationCosts = Array.isArray(windowSpecifications) 
      ? windowSpecifications.reduce((total: number, spec: string) => {
          switch(spec) {
            case 'Rain Sensor': return total + 50;
            case 'Heated': return total + 75;
            case 'Camera': return total + 100;
            case 'HUD': return total + 150;
            default: return total;
          }
        }, 0)
      : 0;
    
    const serviceFee = deliveryType === 'express' ? 90 : 0;
    const totalPrice = basePrice + specificationCosts + serviceFee;

    try {
      // Find and update the existing record
      const records = await base('Submissions').select({
        filterByFormula: `{QuoteID} = '${quoteId}'`
      }).firstPage();

      if (records.length > 0) {
        await base('Submissions').update([{
          id: records[0].id,
          fields: {
            'Total Quote': totalPrice.toString(),
            'Service Type': deliveryType
          }
        }]);
      }
    } catch (airtableError) {
      console.error('Airtable error:', airtableError);
      // Continue execution even if Airtable update fails
    }

    return res.status(200).json({
      success: true,
      price: totalPrice,
      quoteId,
      breakdown: {
        basePrice,
        specificationCosts,
        serviceFee
      }
    });
  } catch (error) {
    console.error('Error calculating quote:', error);
    return res.status(500).json({ message: 'Failed to calculate quote' });
  }
}
