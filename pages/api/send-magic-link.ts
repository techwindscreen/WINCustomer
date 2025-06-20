import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAndSendMagicLink } from '../../lib/magicLink';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { quoteId, email } = req.body;

        if (!quoteId || !email) {
            return res.status(400).json({ message: 'Quote ID and email are required' });
        }

        // Verify the quote exists and get customer details
        const { data: quoteData, error: quoteError } = await supabase
            .from('MasterCustomer')
            .select('quote_id, email, full_name')
            .eq('quote_id', quoteId)
            .eq('email', email)
            .single();

        if (quoteError || !quoteData) {
            console.error('Quote verification failed:', quoteError);
            return res.status(404).json({ message: 'Quote not found or email mismatch' });
        }

        // Generate and send the magic link
        const result = await generateAndSendMagicLink({
            quoteId: quoteData.quote_id,
            email: quoteData.email,
            customerName: quoteData.full_name
        });

        if (!result.success) {
            return res.status(500).json({ 
                message: 'Failed to send magic link',
                error: result.error 
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Magic link sent successfully',
            sentTo: email,
            quoteId: quoteId
        });

    } catch (error) {
        console.error('Error sending magic link:', error);
        return res.status(500).json({
            message: 'Failed to send magic link',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 