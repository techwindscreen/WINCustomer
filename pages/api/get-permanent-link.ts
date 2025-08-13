import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePermanentMagicLink } from '../../lib/permanentMagicLink';

/**
 * API endpoint for easy access to permanent magic links
 * Useful for email templates, marketing campaigns, and customer service
 * 
 * Usage:
 * GET /api/get-permanent-link?quoteId=WIN123&email=customer@example.com
 * 
 * Returns: Redirects to the quote access page or returns JSON with the link
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { quoteId, email, format } = req.query;

        if (!quoteId || !email) {
            return res.status(400).json({ 
                message: 'Quote ID and email are required',
                usage: 'GET /api/get-permanent-link?quoteId=WIN123&email=customer@example.com'
            });
        }

        if (typeof quoteId !== 'string' || typeof email !== 'string') {
            return res.status(400).json({ message: 'Quote ID and email must be strings' });
        }

        // Generate the permanent magic link
        const result = await generatePermanentMagicLink({
            quoteId,
            email
        });

        if (!result.success) {
            return res.status(404).json({ 
                message: result.error || 'Failed to generate permanent magic link',
                quoteId,
                email
            });
        }

        // If format=json, return JSON response (useful for API calls)
        if (format === 'json') {
            return res.status(200).json({
                success: true,
                permanentMagicLink: result.permanentMagicLink,
                quoteId,
                email,
                quoteName: result.quoteName,
                quotePrice: result.quotePrice,
                message: 'Permanent magic link generated successfully'
            });
        }

        // Default behavior: redirect to the quote access page
        if (result.permanentMagicLink) {
            return res.redirect(302, result.permanentMagicLink);
        } else {
            return res.status(500).json({ message: 'Failed to generate permanent magic link' });
        }

    } catch (error) {
        console.error('Error in get-permanent-link:', error);
        return res.status(500).json({
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}