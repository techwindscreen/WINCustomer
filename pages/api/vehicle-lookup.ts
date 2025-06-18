import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { registration } = req.body;

  try {
    const apiKey = process.env.UK_VEHICLE_DATA_API_KEY;
    
    if (!apiKey) {
      console.error('UK_VEHICLE_DATA_API_KEY environment variable is not set');
      return res.status(500).json({ 
        success: false, 
        message: 'Vehicle data API key not configured' 
      });
    }

    // Fetch vehicle data
    const vehicleResponse = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleData?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_VRM=${registration}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const vehicleData = await vehicleResponse.json();
    console.log('Raw Vehicle API response:', JSON.stringify(vehicleData, null, 2));

    // Fetch valuation data
    const valuationResponse = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/ValuationData?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_VRM=${registration}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const valuationData = await valuationResponse.json();
    console.log('Raw Valuation API response:', JSON.stringify(valuationData, null, 2));

    if (vehicleData.Response?.StatusCode === "Success") {
      const vehicleInfo = vehicleData.Response.DataItems;
      console.log('Vehicle Info:', vehicleInfo);

      // Calculate quote price from valuation data
      let quotePrice = 70; // Default minimum price
      
      if (valuationData.Response?.StatusCode === "Success" && valuationData.Response.DataItems?.ValuationDetails) {
        const otrValue = valuationData.Response.DataItems.ValuationDetails.PartExchange;
        
        if (otrValue && !isNaN(otrValue)) {
          // Calculate 1% of OTR (On The Road) price value
          const calculatedPrice = Math.round(otrValue * 0.01);
          // Ensure minimum price is £70
          quotePrice = Math.max(calculatedPrice, 70);
          console.log(`OTR Price: £${otrValue}, Calculated Quote: £${calculatedPrice}, Final Quote: £${quotePrice}`);
        } else {
          console.log('OTR price not available or invalid, using minimum price');
        }
      } else {
        console.log('Valuation data not available, using minimum price');
      }

      const vehicleDetails = {
        manufacturer: vehicleInfo.ClassificationDetails?.Dvla?.Make || 'Unknown',
        model: vehicleInfo.ClassificationDetails?.Dvla?.Model || 'Unknown',
        year: vehicleInfo.VehicleRegistration?.YearOfManufacture || 'Unknown',
        colour: vehicleInfo.VehicleRegistration?.Colour || 'Unknown',
        type: vehicleInfo.VehicleRegistration?.VehicleClass || 'Unknown',
        style: vehicleInfo.SmmtDetails?.BodyStyle || 'Unknown',
        doorPlan: `${vehicleInfo.TechnicalDetails?.Dimensions?.NumberOfDoors || '?'} Doors`,
        registration: registration,
        quotePrice: quotePrice,
        otrPrice: valuationData.Response?.DataItems?.ValuationDetails?.PartExchange || null
      };

      console.log('Processed vehicle details:', vehicleDetails);
      res.status(200).json({ success: true, vehicleDetails });
    } else {
      console.log('API returned non-success status:', vehicleData.Response?.StatusMessage);
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
          registration: registration,
          quotePrice: 70,
          otrPrice: null
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
        registration: registration,
        quotePrice: 70,
        otrPrice: null
      }
    });
  }
} 