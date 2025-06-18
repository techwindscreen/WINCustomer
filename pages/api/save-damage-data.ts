import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { 
            quoteId, 
            selectedWindows, 
            windowDamage, 
            specifications, 
            chipSize, 
            comments, 
            glassColor,
            uploadedImages 
        } = req.body;

        if (!quoteId) {
            return res.status(400).json({ message: 'Quote ID is required' });
        }

        // Prepare data for update
        const updateData: any = {};
        
        if (selectedWindows) {
            updateData.selected_windows = [selectedWindows];
        }
        
        if (windowDamage) {
            updateData.window_damage = [windowDamage];
        }
        
        if (specifications) {
            updateData.window_spec = [specifications];
        }
        
        // Note: chip_size, comments, glass_color, uploaded_images columns don't exist in MasterCustomer table
        // These fields are being passed but will be ignored for now
        if (chipSize) {
            console.log('Received chip_size but column does not exist:', chipSize);
        }
        
        if (comments) {
            console.log('Received comments but column does not exist:', comments);
        }
        
        if (glassColor && Object.keys(glassColor).length > 0) {
            console.log('Received glass_color but column does not exist:', glassColor);
        }
        
        if (uploadedImages && uploadedImages.length > 0) {
            console.log('Received uploaded_images but column does not exist:', uploadedImages);
        }

        // Update the record
        const { data, error } = await supabase
            .from('MasterCustomer')
            .update(updateData)
            .eq('quote_id', quoteId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'Damage data saved successfully',
            data: data
        });
    } catch (error) {
        console.error('Error saving damage data:', error);
        return res.status(500).json({
            message: 'Failed to save damage data',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
} 