import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { supabase } from '../../lib/supabaseClient';

// Create a simple token without expiration (permanent magic link)
function createPermanentToken(payload: any, secret: string): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const data = Buffer.from(JSON.stringify(header)).toString('base64url') + '.' +
                 Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64url');

    return `${data}.${signature}`;
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';

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
            .select('quote_id, email, full_name, quote_price')
            .eq('quote_id', quoteId)
            .eq('email', email)
            .single();

        if (quoteError || !quoteData) {
            console.error('Quote verification failed:', quoteError);
            return res.status(404).json({ message: 'Quote not found or email mismatch' });
        }

        // Generate permanent token (no expiration)
        const tokenPayload = {
            quoteId,
            email,
            type: 'permanent_quote_access',
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomUUID(), // Unique token ID
            purpose: 'quote_payment_access'
        };

        const token = createPermanentToken(tokenPayload, JWT_SECRET);

        // Store the permanent token in the database
        const { error: tokenError } = await supabase
            .from('permanent_magic_links')
            .upsert({
                quote_id: quoteId,
                email: email,
                token_id: tokenPayload.jti,
                token_hash: crypto.createHash('sha256').update(token).digest('hex'),
                created_at: new Date().toISOString(),
                is_active: true,
                last_accessed: null
            }, {
                onConflict: 'quote_id,email'
            });

        if (tokenError) {
            console.warn('Permanent magic links table may not exist, creating token anyway:', tokenError);
        }

        // Generate the permanent magic link URL for quote access
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                       (req.headers.host?.includes('localhost') 
                        ? `http://${req.headers.host}` 
                        : `https://${req.headers.host}`);
        
        const permanentMagicLink = `${baseUrl}/quote-access?token=${encodeURIComponent(token)}`;

        return res.status(200).json({
            success: true,
            permanentMagicLink,
            tokenId: tokenPayload.jti,
            quoteName: quoteData.full_name,
            quotePrice: quoteData.quote_price,
            message: 'Permanent magic link generated successfully'
        });

    } catch (error) {
        console.error('Error generating permanent magic link:', error);
        return res.status(500).json({
            message: 'Failed to generate permanent magic link',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}