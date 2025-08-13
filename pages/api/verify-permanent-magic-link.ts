import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';
import { supabase } from '../../lib/supabaseClient';

// Verify permanent token (no expiration check)
function verifyPermanentToken(token: string, secret: string) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Invalid token format');
        }

        const [headerB64, payloadB64, signature] = parts;
        
        // Verify signature
        const data = `${headerB64}.${payloadB64}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('base64url');

        if (signature !== expectedSignature) {
            throw new Error('Invalid signature');
        }

        // Parse payload
        const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
        
        return payload;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}

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
            tokenPayload = verifyPermanentToken(token, JWT_SECRET);
        } catch (error) {
            return res.status(401).json({ message: 'Invalid permanent token' });
        }

        // Validate token type
        if (tokenPayload.type !== 'permanent_quote_access') {
            return res.status(401).json({ message: 'Invalid token type' });
        }

        // Check if token exists in database and is still active
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const { data: tokenData, error: tokenError } = await supabase
            .from('permanent_magic_links')
            .select('is_active, quote_id, email')
            .eq('token_hash', tokenHash)
            .single();

        // If permanent magic links table exists, check token status
        if (!tokenError && tokenData) {
            if (!tokenData.is_active) {
                return res.status(401).json({ message: 'Token has been deactivated' });
            }

            // Update last accessed timestamp
            await supabase
                .from('permanent_magic_links')
                .update({ last_accessed: new Date().toISOString() })
                .eq('token_hash', tokenHash);
        }

        // Verify the quote still exists and get all quote data
        const { data: quoteData, error: quoteError } = await supabase
            .from('MasterCustomer')
            .select('*')
            .eq('quote_id', tokenPayload.quoteId)
            .eq('email', tokenPayload.email)
            .single();

        if (quoteError || !quoteData) {
            console.error('Quote verification failed:', quoteError);
            return res.status(404).json({ message: 'Quote not found' });
        }

        // Return successful verification with quote data
        return res.status(200).json({
            success: true,
            verified: true,
            quoteData: {
                quoteId: quoteData.quote_id,
                email: quoteData.email,
                customerName: quoteData.full_name,
                quotePrice: quoteData.quote_price,
                vehicleReg: quoteData.vehicle_reg,
                glassType: quoteData.glass_type,
                deliveryType: quoteData.delivery_type || 'standard',
                // Include all relevant quote data
                rawData: quoteData
            },
            message: 'Token verified successfully'
        });

    } catch (error) {
        console.error('Error verifying permanent magic link:', error);
        return res.status(500).json({
            message: 'Failed to verify permanent magic link',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}