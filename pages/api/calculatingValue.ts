import type { NextApiRequest, NextApiResponse } from 'next';
import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY }).base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicleDetails, windowSpecifications } = req.body;

    if (!vehicleDetails?.registration || !Array.isArray(windowSpecifications)) {
      return res.status(400).json({ message: 'Invalid input data' });
    }

    console.log("Received vehicle details:", vehicleDetails);
    console.log("Received window specifications:", windowSpecifications);

    // Step 1: Fetch vehicle details from the external API
    const vehicleReg = vehicleDetails.registration;
    const response = await fetch(`https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleData?v=2&api_nullitems=1&auth_apikey=89feec4c-7f22-43b1-b77a-980aea4ff74e&key_VRM=${vehicleReg}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.Response.StatusCode !== "Success") {
      throw new Error('Failed to fetch vehicle data');
    }

    const vehicleInfo = data.Response.DataItems;
    const brand = vehicleInfo.ClassificationDetails?.Dvla?.Make || 'Unknown';
    const model = vehicleInfo.ClassificationDetails?.Dvla?.Model || 'Unknown';
    const year = vehicleInfo.VehicleRegistration?.YearOfManufacture || 'Unknown';
    const style = vehicleInfo.SmmtDetails?.BodyStyle || 'Unknown';
    const door = vehicleInfo.TechnicalDetails?.Dimensions?.NumberOfDoors || '?';

    // Step 2: Query Airtable for matching records in quoteTable
    const records = await base('quoteTable').select({
      filterByFormula: `AND({Brand} = "${brand}", {Model} = "${model}", {Year} = "${year}", {style} = "${style}", {door} = "${door}")`,
    }).firstPage();

    if (records.length === 0) {
      return res.status(404).json({ message: 'No matching records found' });
    }

    const matchedRecord = records[0];
    const price = matchedRecord.fields.Price || 100;

    res.status(200).json({ price });
  } catch (error) {
    console.error('Error calculating quote:', error);
    res.status(500).json({ message: 'Error calculating quote' });
  }
}
