import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId, contactDetails } = req.body;

    if (!quoteId) {
      return res.status(400).json({ message: 'Quote ID is required' });
    }

    const { data, error } = await supabase
      .from('MasterCustomer')
      .update({
        full_name: contactDetails.fullName,
        email: contactDetails.email,
        mobile: contactDetails.mobile,
        postcode: contactDetails.postcode,
        location: contactDetails.location,
        appointment_date: contactDetails.date,
        time_slot: contactDetails.timeSlot
      })
      .eq('quote_id', quoteId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    if (!data) {
      return res.status(404).json({ message: 'Record not found' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Contact details updated successfully',
      record: data 
    });
  } catch (error) {
    console.error('Error updating details:', error);
    return res.status(500).json({ 
      message: 'Failed to update details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 