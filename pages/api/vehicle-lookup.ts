import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { registration } = req.body;

  try {
    const apiKey = '89feec4c-7f22-43b1-b77a-980aea4ff74e';
    const response = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleData?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_VRM=${registration}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const data = await response.json();
    console.log('Raw API response:', JSON.stringify(data, null, 2));

    if (data.Response?.StatusCode === "Success") {
      const vehicleInfo = data.Response.DataItems;
      console.log('Vehicle Info:', vehicleInfo);

      const vehicleDetails = {
        manufacturer: vehicleInfo.ClassificationDetails?.Dvla?.Make || 'Unknown',
        model: vehicleInfo.ClassificationDetails?.Dvla?.Model || 'Unknown',
        year: vehicleInfo.VehicleRegistration?.YearOfManufacture || 'Unknown',
        colour: vehicleInfo.VehicleRegistration?.Colour || 'Unknown',
        type: vehicleInfo.VehicleRegistration?.VehicleClass || 'Unknown',
        style: vehicleInfo.SmmtDetails?.BodyStyle || 'Unknown',
        doorPlan: `${vehicleInfo.TechnicalDetails?.Dimensions?.NumberOfDoors || '?'} Doors`,
        registration: registration
      };

      console.log('Processed vehicle details:', vehicleDetails);
      res.status(200).json({ success: true, vehicleDetails });
    } else {
      console.log('API returned non-success status:', data.Response?.StatusMessage);
      res.status(200).json({ 
        success: true, 
        vehicleDetails: {
          manufacturer: 'Unknown',
          model: 'Unknown',
          year: 'Unknown',
          colour: 'Unknown',
          type: 'Unknown',
          style: 'Unknown',
          doorPlan: 'Unknown',
          registration: registration
        }
      });
    }
  } catch (error) {
    console.error('Error in vehicle lookup:', error);
    res.status(200).json({ 
      success: true, 
      vehicleDetails: {
        manufacturer: 'Unknown',
        model: 'Unknown',
        year: 'Unknown',
        colour: 'Unknown',
        type: 'Unknown',
        style: 'Unknown',
        doorPlan: 'Unknown',
        registration: registration
      }
    });
  }
} 