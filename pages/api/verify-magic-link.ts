import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import crypto from 'crypto';

// Simple JWT verification without external library
function verifySimpleToken(token: string, secret: string) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }

        const [headerB64, payloadB64, signatureB64] = parts;
        
        // Verify signature
        const data = `${headerB64}.${payloadB64}`;
        const signature = crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('base64url');

        if (signature !== signatureB64) {
            throw new Error('Invalid token signature');
        }

        // Decode payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        
        // Check expiration
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            throw new Error('Token expired');
        }

        return payload;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-development-only';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ message: 'Token is required' });
        }

        // Verify the token
        let tokenPayload;
        try {
            tokenPayload = verifySimpleToken(token, JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }

        // Validate token type
        if (tokenPayload.type !== 'magic_link') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        // Check if token exists in database and hasn't been used (optional security check)
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { data: tokenData, error: tokenError } = await supabase
            .from('magic_links')
            .select('used, expires_at')
            .eq('token_hash', tokenHash)
            .single();

        // If magic_links table exists, check token status
        if (!tokenError && tokenData) {
            if (tokenData.used) {
                return res.status(401).json({ message: 'Token has already been used' });
            }

            // Mark token as used
            await supabase
                .from('magic_links')
                .update({ used: true, used_at: new Date().toISOString() })
                .eq('token_hash', tokenHash);
        }

        // Verify the quote still exists
        const { data: quoteData, error: quoteError } = await supabase
            .from('MasterCustomer')
            .select('quote_id')
            .eq('quote_id', tokenPayload.quoteId)
            .eq('email', tokenPayload.email)
            .single();

        if (quoteError || !quoteData) {
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Redirect to the quote page
        const redirectUrl = `/quote/${encodeURIComponent(tokenPayload.quoteId)}`;
        
        return res.redirect(302, redirectUrl);

    } catch (error) {
        console.error('Error verifying magic link:', error);
        return res.status(500).json({
            message: 'Failed to verify magic link',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 