import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import crypto from 'crypto';

// Simple JWT creation without external library
function createSimpleToken(payload: any, secret: string): string {
    const header = {
        alg: 'HS256',
        typ: 'JWT'
    };

    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    
    const data = `${headerB64}.${payloadB64}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('base64url');

    return `${data}.${signature}`;
}

// Secret for JWT signing - in production, use environment variable
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
            .select('quote_id, email, full_name')
            .eq('quote_id', quoteId)
            .eq('email', email)
            .single();

        if (quoteError || !quoteData) {
            console.error('Quote verification failed:', quoteError);
            return res.status(404).json({ message: 'Quote not found or email mismatch' });
        }

        // Generate secure token with expiration (24 hours)
        const tokenPayload = {
            quoteId,
            email,
            type: 'magic_link',
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours from now
            iat: Math.floor(Date.now() / 1000),
            jti: crypto.randomUUID(), // Unique token ID
        };

        const token = createSimpleToken(tokenPayload, JWT_SECRET);

        // Store the token in the database for additional security (optional - for token revocation)
        const { error: tokenError } = await supabase
            .from('magic_links')
            .insert({
                quote_id: quoteId,
                email: email,
                token_id: tokenPayload.jti,
                token_hash: crypto.createHash('sha256').update(token).digest('hex'),
                expires_at: new Date(tokenPayload.exp * 1000).toISOString(),
                created_at: new Date().toISOString(),
                used: false
            });

        if (tokenError) {
            // If magic_links table doesn't exist, create it first
            console.warn('Magic links table may not exist:', tokenError);
        }

        // Generate the magic link URL
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                       (req.headers.host?.includes('localhost') 
                        ? `http://${req.headers.host}` 
                        : `https://${req.headers.host}`);
        
        const magicLink = `${baseUrl}/api/verify-magic-link?token=${encodeURIComponent(token)}`;

        return res.status(200).json({
            success: true,
            magicLink,
            expiresAt: new Date(tokenPayload.exp * 1000).toISOString(),
            quoteName: quoteData.full_name
        });

    } catch (error) {
        console.error('Error generating magic link:', error);
        return res.status(500).json({
            message: 'Failed to generate magic link',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 