import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { sanitizeQuoteId } from '../../lib/inputValidation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { quoteId } = req.query;

        if (!quoteId || typeof quoteId !== 'string') {
            return res.status(400).json({ message: 'Quote ID is required' });
        }

        // Sanitize the quote ID
        const sanitizedQuoteId = sanitizeQuoteId(quoteId);
        if (!sanitizedQuoteId) {
            return res.status(400).json({ message: 'Invalid Quote ID format' });
        }

        // Fetch raw data from Supabase without transformation
        const { data, error, count } = await supabase
            .from('MasterCustomer')
            .select('*', { count: 'exact' })
            .eq('quote_id', sanitizedQuoteId);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ 
                message: 'Database error',
                error: error.message,
                code: error.code
            });
        }

        return res.status(200).json({
            success: true,
            debug: {
                quoteId: sanitizedQuoteId,
                recordCount: count,
                hasData: !!data,
                dataLength: data?.length || 0,
                rawData: data,
                specificFields: data?.[0] ? {
                    quote_id: data[0].quote_id,
                    vehicle_reg: data[0].vehicle_reg,
                    selected_windows: data[0].selected_windows,
                    window_damage: data[0].window_damage,
                    contact_details: data[0].full_name || data[0].email,
                    timestamp: data[0].created_at
                } : null
            }
        });
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 