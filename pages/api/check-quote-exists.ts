import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId } = req.query;

    if (!quoteId || typeof quoteId !== 'string') {
      return res.status(400).json({ message: 'Quote ID is required' });
    }

    // Check if quote exists and get appointment data
    const { data, error } = await supabase
      .from('MasterCustomer')
      .select('quote_id, appointment_date, time_slot, quote_price, full_name, email')
      .eq('quote_id', quoteId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          exists: false, 
          message: 'Quote not found in database',
          quoteId 
        });
      }
      throw error;
    }

    return res.status(200).json({
      exists: true,
      quoteId: data.quote_id,
      appointmentDate: data.appointment_date,
      timeSlot: data.time_slot,
      quotePrice: data.quote_price,
      customerName: data.full_name,
      customerEmail: data.email,
      hasAppointmentData: !!(data.appointment_date && data.time_slot)
    });
  } catch (error) {
    console.error('Error checking quote:', error);
    return res.status(500).json({ 
      message: 'Error checking quote',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 