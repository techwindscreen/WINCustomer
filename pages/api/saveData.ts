import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

// Define the shape of the incoming request body
interface RequestBody {
  name: string;
  email: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { data: submissionData } = req.body;

    if (!submissionData) {
      return res.status(400).json({ message: 'Submission data is required' });
    }

    // Insert into Supabase instead of Airtable
    const { data, error } = await supabase
      .from('submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      throw error;
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Data saved successfully',
      data 
    });
  } catch (error) {
    console.error('Error saving data:', error);
    return res.status(500).json({ 
      message: 'Failed to save data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
