import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId, glassType, adasCalibration } = req.body;

    if (!quoteId) {
      return res.status(400).json({ message: 'Quote ID is required' });
    }

    // Update the existing record
    const { data, error } = await supabase
      .from('MasterCustomer')
      .update({
        glass_type: glassType || null,
        adas_calibration: adasCalibration || null,
        updated_at: new Date().toISOString()
      })
      .eq('quote_id', quoteId)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    if (!data) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Quote settings updated successfully',
      record: data 
    });
  } catch (error) {
    console.error('Error updating quote settings:', error);
    return res.status(500).json({ 
      message: 'Failed to update quote settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 