import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY }).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Log environment variables to ensure they are being read correctly
    console.log("Airtable API Key:", process.env.NEXT_PUBLIC_AIRTABLE_API_KEY);
    console.log("Airtable Base ID:", process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID);

    // Set the table name to `quoteTable`
    const tableName = 'quoteTable';

    // Retrieve the first 10 records with specified fields
    const records = await base(tableName)
      .select({
        maxRecords: 10,
        fields: [
          'Brand',
          'Model',
          'Year',
          'style',
          'door',
          'question1',
          'Q1Answer',
          'question2',
          'Q2Answer',
          'question3',
          'Q3Answer',
          'Competitor Price ',
          'WinC - New Price ',
          'Basic Price',
          'Fastest Price',
        ],
      })
      .firstPage();

    // Format the records to return only fields with values
    const formattedRecords = records.map((record) => record.fields);

    res.status(200).json(formattedRecords);
  } catch (error) {
    // Assert error as an instance of Error to access the message property
    if (error instanceof Error) {
      console.error('Error fetching records from Airtable:', error.message);
    } else {
      console.error('Unexpected error:', error);
    }
    res.status(500).json({ message: 'Failed to fetch records from Airtable' });
  }
}
