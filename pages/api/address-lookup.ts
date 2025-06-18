import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { postcode } = req.body;

  if (!postcode) {
    return res.status(400).json({ 
      success: false, 
      message: 'Postcode is required' 
    });
  }

  try {
    const apiKey = process.env.UK_VEHICLE_DATA_API_KEY;
    
    if (!apiKey) {
      console.error('UK_VEHICLE_DATA_API_KEY environment variable is not set');
      return res.status(500).json({ 
        success: false, 
        message: 'Vehicle data API key not configured' 
      });
    }

    const response = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/PostcodeLookup?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_POSTCODE=${postcode}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const data = await response.json();
    console.log('Address API response:', data);

    if (data.Response?.StatusCode === "Success" && data.Response.DataItems?.AddressDetails) {
      const addressList = data.Response.DataItems.AddressDetails.AddressList || [];
      const addresses = Array.isArray(addressList) ? addressList : [addressList];
      
      res.status(200).json({ 
        success: true, 
        addresses: addresses 
      });
    } else {
      res.status(200).json({ 
        success: false, 
        message: 'No addresses found for this postcode',
        addresses: []
      });
    }
  } catch (error) {
    console.error('Error in address lookup:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch addresses. Please try again.',
      addresses: []
    });
  }
} 