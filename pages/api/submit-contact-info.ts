import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import KlaviyoService from '../../lib/klaviyo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { formData, quoteId, selectedWindows, windowDamage, specifications, paymentOption, glassType, quotePrice, adasCalibration } = req.body;

        if (!quoteId) {
            return res.status(400).json({ message: 'Quote ID is required' });
        }

        // Map payment option to standardized vals - bit messy but works
        let standardizedPaymentOption = 'full';
        if (paymentOption) {
            const option = paymentOption.toLowerCase();
            if (option.includes('deposit') || option.includes('20%')) {
                standardizedPaymentOption = 'deposit';
            } else if (option.includes('split') || option.includes('monthly')) {
                standardizedPaymentOption = 'split';
            } else if (option.includes('full') || option.includes('one-time')) {
                standardizedPaymentOption = 'full';
            }
        }

        console.log('Processing contact info submission:', {
            quoteId,
            paymentOption,
            standardizedPaymentOption,
            quotePrice,
            glassType
        });

        // Check if record already exists
        const { data: existingRecord } = await supabase
            .from('MasterCustomer')
            .select()
            .eq('quote_id', quoteId)
            .single();

        let result;
        if (existingRecord) {
            // Update existing record
            const { data, error } = await supabase
                .from('MasterCustomer')
                .update({
                    full_name: formData.fullName,
                    email: formData.email,
                    mobile: formData.mobile,
                    postcode: formData.postcode,
                    location: formData.location,
                    appointment_date: formData.date,
                    time_slot: formData.timeSlot,
                    insurance_provider: formData.insuranceProvider,
                    policy_number: formData.policyNumber,
                    incident_date: formData.incidentDate,
                    policy_excess: formData.policyExcessAmount,
                    policy_expiry: formData.policyExpiryDate,
                    selected_windows: selectedWindows && selectedWindows.length > 0 ? [selectedWindows] : null,
                    window_damage: windowDamage && Object.keys(windowDamage).length > 0 ? [windowDamage] : null,
                    window_spec: specifications && specifications.length > 0 ? [specifications] : null,
                    payment_option: standardizedPaymentOption,
                    glass_type: glassType || null,
                    quote_price: quotePrice || existingRecord.quote_price,
                    adas_calibration: adasCalibration || null
                })
                .eq('quote_id', quoteId)
                .select()
                .single();

            if (error) throw error;
            result = data;
        } else {
            // Insert new record - first time customer
            const { data, error } = await supabase
                .from('MasterCustomer')
                .insert([{
                    quote_id: quoteId,
                    vehicle_reg: formData.vehicleReg || '',
                    full_name: formData.fullName,
                    email: formData.email,
                    mobile: formData.mobile,
                    postcode: formData.postcode,
                    location: formData.location,
                    appointment_date: formData.date,
                    time_slot: formData.timeSlot,
                    insurance_provider: formData.insuranceProvider,
                    policy_number: formData.policyNumber,
                    incident_date: formData.incidentDate,
                    policy_excess: formData.policyExcessAmount,
                    policy_expiry: formData.policyExpiryDate,
                    selected_windows: selectedWindows && selectedWindows.length > 0 ? [selectedWindows] : null,
                    window_damage: windowDamage && Object.keys(windowDamage).length > 0 ? [windowDamage] : null,
                    window_spec: specifications && specifications.length > 0 ? [specifications] : null,
                    payment_option: standardizedPaymentOption,
                    glass_type: glassType || null,
                    quote_price: quotePrice,
                    adas_calibration: adasCalibration || null
                }])
                .select()
                .single();

            if (error) throw error;
            result = data;
        }

        // Track quote completion in Klaviyo - this might fail sometimes
        try {
            await KlaviyoService.trackQuoteCompleted({
                vehicleReg: formData.vehicleReg || result.vehicle_reg || '',
                userEmail: formData.email,
                userName: formData.fullName,
                userPhone: formData.mobile,
                userLocation: formData.location,
                selectedWindows: selectedWindows || [],
                windowDamage: windowDamage || {},
                specifications: specifications || [],
                glassType: glassType || 'OEE', // fallback to OEE if not specified
                quotePrice: quotePrice || result.quote_price || 0,
                quoteId: quoteId,
                timestamp: new Date().toISOString(),
                // Additional data for enhanced admin notification
                appointmentDate: formData.date,
                appointmentTime: formData.timeSlot,
                paymentOption: standardizedPaymentOption,
                vehicleMake: result.vehicle_make || existingRecord?.vehicle_make,
                vehicleModel: result.vehicle_model || existingRecord?.vehicle_model,
                vehicleYear: result.vehicle_year || existingRecord?.vehicle_year
            });
        } catch (klaviyoError) {
            console.error('Klaviyo tracking error:', klaviyoError);
            // Don't fail the main request if Klaviyo fails - not the end of the world
        }

        return res.status(200).json({
            message: 'Contact information saved successfully',
            recordId: result.id
        });
    } catch (error) {
        console.error('Error saving contact info:', error);
        return res.status(500).json({
            message: 'Failed to save contact information',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}