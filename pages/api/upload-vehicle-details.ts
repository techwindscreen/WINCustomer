import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId, vehicleReg, vehicleDetails } = req.body;
    console.log('Received data:', { quoteId, vehicleReg, vehicleDetails });

    // Insert data into Supabase
    const { data, error } = await supabase
      .from('MasterCustomer')
      .insert([{
        quote_id: quoteId,
        vehicle_reg: vehicleReg,
        brand: vehicleDetails.manufacturer,
        model: vehicleDetails.model,
        year: vehicleDetails.year,
        colour: vehicleDetails.colour,
        type: vehicleDetails.type,
        style: vehicleDetails.style,
        door: vehicleDetails.doorPlan.split(' ')[0]
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    console.log('Created record:', data);
    res.status(200).json({ success: true, record: data });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
} 