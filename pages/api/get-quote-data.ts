import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import { sanitizeQuoteId } from '../../lib/inputValidation';
import { normalRateLimit } from '../../lib/rateLimiter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Apply rate limiting
    const rateLimitResult = normalRateLimit(req, res);
    if (rateLimitResult !== true) {
        return; // Rate limit response already sent
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

        // Fetch complete quote data from Supabase
        const { data, error } = await supabase
            .from('MasterCustomer')
            .select('*')
            .eq('quote_id', sanitizedQuoteId)
            .single();

        if (error) {
            console.error('Supabase error:', error);
            if (error.code === 'PGRST116') {
                return res.status(404).json({ message: 'Quote not found' });
            }
            throw error;
        }

        console.log('Successfully fetched data for quote:', quoteId);
        console.log('Available fields:', Object.keys(data || {}));

        // Helper function to safely parse JSON
        const safeJsonParse = (jsonString: string | null, fallback: any = null) => {
            if (!jsonString) return fallback;
            try {
                return JSON.parse(jsonString);
            } catch (e) {
                console.warn('Failed to parse JSON:', jsonString, e);
                return fallback;
            }
        };

        // Transform the data to match frontend expectations
        const transformedData = {
            quoteID: data.quote_id,
            vehicleReg: data.vehicle_reg || '',
            vehicleDetails: {
                manufacturer: data.brand || '',
                model: data.model || '',
                year: data.year || '',
                colour: data.colour || '',
                type: data.type || '',
                style: data.style || '',
                doorPlan: data.door ? `${data.door} Door` : ''
            },
            contactDetails: {
                fullName: data.full_name || '',
                email: data.email || '',
                mobile: data.mobile || '',
                postcode: data.postcode || '',
                location: data.location || '',
                date: data.appointment_date || '',
                timeSlot: data.time_slot || ''
            },
            insuranceDetails: data.insurance_provider ? {
                provider: data.insurance_provider,
                policyNumber: data.policy_number || '',
                incidentDate: data.incident_date || '',
                excessAmount: data.policy_excess || '',
                expiryDate: data.policy_expiry || ''
            } : null,
            selectedWindows: data.selected_windows && data.selected_windows[0] ? data.selected_windows[0] : [],
            windowDamage: data.window_damage && data.window_damage[0] ? data.window_damage[0] : {},
            specifications: data.window_spec && data.window_spec[0] ? data.window_spec[0] : [],
            paymentOption: data.payment_option || 'self',
            quotePrice: data.quote_price || 0,

            comments: data.comments || '',
            chipSize: data.chip_size || '',
            glassColor: safeJsonParse(data.glass_color, {}),
            uploadedImages: safeJsonParse(data.uploaded_images, safeJsonParse(data.damage_images, [])),
            glassType: data.glass_type || null,
            adasCalibration: data.adas_calibration || null
        };

        return res.status(200).json({
            success: true,
            data: transformedData
        });
    } catch (error) {
        console.error('Error fetching quote data:', error);
        return res.status(500).json({
            message: 'Failed to fetch quote data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 