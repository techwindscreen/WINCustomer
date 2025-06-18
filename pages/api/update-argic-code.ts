import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId, argicCode } = req.body;

    if (!quoteId || !argicCode) {
      return res.status(400).json({ message: 'Quote ID and ARGIC code are required' });
    }

    const { data, error } = await supabase
      .from('MasterCustomer')
      .update({
        argic_code: argicCode
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
      message: 'ARGIC code updated successfully',
      record: data 
    });
  } catch (error) {
    console.error('Error updating ARGIC code:', error);
    return res.status(500).json({ 
      message: 'Failed to update ARGIC code',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 