import { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

const base = new Airtable({ 
  apiKey: process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY 
}).base(process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId, contactDetails } = req.body;

    if (!quoteId) {
      return res.status(400).json({ message: 'Quote ID is required' });
    }

    const records = await base('Submissions').select({
      filterByFormula: `{QuoteID} = '${quoteId}'`
    }).firstPage();

    if (records.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }

    const updatedRecords = await base('Submissions').update([{
      id: records[0].id,
      fields: {
        'Full Name': contactDetails.fullName,
        'Email': contactDetails.email,
        'Mobile': contactDetails.mobile,
        'PostcodeAccident': contactDetails.postcode,
        'Location': contactDetails.location,
        'Appointment Date': contactDetails.date,
        'Time Slot': contactDetails.timeSlot
      }
    }]);

    return res.status(200).json({ 
      success: true, 
      message: 'Contact details updated successfully',
      record: updatedRecords[0] 
    });
  } catch (error) {
    console.error('Error updating details:', error);
    return res.status(500).json({ 
      message: 'Failed to update details',
      error 
    });
  }
} 