import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteID } = req.body;

    if (!quoteID) {
      return res.status(400).json({ message: 'Quote ID is required' });
    }

    const { data, error } = await supabase
      .from('MasterCustomer')
      .select(`
        full_name,
        email,
        mobile,
        postcode,
        location,
        appointment_date,
        time_slot,
        insurance_provider,
        policy_number,
        incident_date,
        policy_excess,
        policy_expiry,
        payment_option
      `)
      .eq('quote_id', quoteID)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      throw error;
    }

    if (!data) {
      return res.status(200).json({ 
        success: false, 
        message: 'No existing data found',
        existingData: null 
      });
    }

    return res.status(200).json({ 
      success: true, 
      existingData: {
        fullName: data.full_name,
        email: data.email,
        mobile: data.mobile,
        postcode: data.postcode,
        location: data.location,
        date: data.appointment_date,
        timeSlot: data.time_slot,
        insuranceProvider: data.insurance_provider,
        policyNumber: data.policy_number,
        incidentDate: data.incident_date,
        policyExcessAmount: data.policy_excess,
        policyExpiryDate: data.policy_expiry,
        paymentOption: data.payment_option
      }
    });
  } catch (error) {
    console.error('Error fetching existing data:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch existing data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 