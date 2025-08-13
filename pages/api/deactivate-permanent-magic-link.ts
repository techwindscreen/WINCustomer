import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

/**
 * Deactivate a permanent magic link for security or customer request
 * This doesn't delete the link but marks it as inactive
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { quoteId, email } = req.body;

        if (!quoteId || !email) {
            return res.status(400).json({ message: 'Quote ID and email are required' });
        }

        // Verify the quote exists and belongs to the provided email
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

        // Deactivate all permanent magic links for this quote and email
        const { error: updateError } = await supabase
            .from('permanent_magic_links')
            .update({ 
                is_active: false,
                deactivated_at: new Date().toISOString()
            })
            .eq('quote_id', quoteId)
            .eq('email', email);

        if (updateError) {
            console.error('Error deactivating permanent magic links:', updateError);
            return res.status(500).json({ 
                message: 'Failed to deactivate permanent magic link',
                error: updateError.message
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Permanent magic link deactivated successfully',
            quoteId,
            email
        });

    } catch (error) {
        console.error('Error deactivating permanent magic link:', error);
        return res.status(500).json({
            message: 'Failed to deactivate permanent magic link',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}