import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const base = new Airtable({ 
            apiKey: process.env.AIRTABLE_API_KEY || process.env.NEXT_PUBLIC_AIRTABLE_API_KEY 
        }).base(process.env.AIRTABLE_BASE_ID || process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

        const { formData, quoteId } = req.body;

        if (!quoteId) {
            return res.status(400).json({ message: 'Quote ID is required' });
        }

        // Find the record by QuoteID first
        const records = await base('Submissions').select({
            filterByFormula: `{QuoteID} = '${quoteId}'`
        }).firstPage();

        let recordId;

        if (records.length === 0) {
            // Create a new record if one doesn't exist
            const newRecords = await base('Submissions').create([{
                fields: {
                    'QuoteID': quoteId,
                    'Full Name': formData.fullName,
                    'Email': formData.email,
                    'Mobile': formData.mobile,
                    'PostcodeAccident': formData.postcode,
                    'Appointment Date': formData.date,
                    'Time Slot': formData.timeSlot,
                    'Insurance Provider': formData.insuranceProvider,
                    'Policy Number': formData.policyNumber,
                    'Incident Date': formData.incidentDate,
                    'Policy Excess': formData.policyExcessAmount,
                    'Policy Expiry': formData.policyExpiryDate
                }
            }]);
            recordId = newRecords[0].id;
        } else {
            // Update existing record
            const updatedRecords = await base('Submissions').update([{
                id: records[0].id,
                fields: {
                    'Full Name': formData.fullName,
                    'Email': formData.email,
                    'Mobile': formData.mobile,
                    'PostcodeAccident': formData.postcode,
                    'Appointment Date': formData.date,
                    'Time Slot': formData.timeSlot,
                    'Insurance Provider': formData.insuranceProvider,
                    'Policy Number': formData.policyNumber,
                    'Incident Date': formData.incidentDate,
                    'Policy Excess': formData.policyExcessAmount,
                    'Policy Expiry': formData.policyExpiryDate
                }
            }]);
            recordId = updatedRecords[0].id;
        }

        return res.status(200).json({ 
            success: true, 
            message: 'Form submitted successfully',
            recordId
        });
    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ 
            message: error instanceof Error ? error.message : 'Error updating data',
            error: error
        });
    }
}