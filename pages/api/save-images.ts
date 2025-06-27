import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId, imageUrls, action = 'append' } = req.body;

    if (!quoteId) {
      return res.status(400).json({ message: 'Quote ID is required' });
    }

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return res.status(400).json({ message: 'Image URLs must be an array' });
    }

    // First, let's check if the record exists and what fields are available
    const { data: existingRecord, error: selectError } = await supabase
      .from('MasterCustomer')
      .select('*')
      .eq('quote_id', quoteId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (!existingRecord) {
      return res.status(404).json({ message: 'Quote record not found. Please ensure vehicle details are saved first.' });
    }

    console.log('Existing record structure:', Object.keys(existingRecord));

    // Handle different actions
    let allImages: string[] = [];
    
    if (action === 'replace') {
      // Replace all images with the new array
      allImages = imageUrls;
    } else {
      // Append new images to existing ones (default behavior)
      let existingImages: string[] = [];
      if (existingRecord.damage_images) {
        existingImages = Array.isArray(existingRecord.damage_images) 
          ? existingRecord.damage_images 
          : [];
      }
      allImages = [...existingImages, ...imageUrls];
    }

    // Try to update with damage_images field
    try {
      const { data, error } = await supabase
        .from('MasterCustomer')
        .update({
          damage_images: allImages
        })
        .eq('quote_id', quoteId)
        .select()
        .single();

      if (error) {
        // If the column doesn't exist, we'll get an error here
        console.error('Error updating with damage_images field:', error);
        
        // Fallback: store images as JSON string in a text field (e.g., comments or create a general notes field)
        const imagesJson = JSON.stringify(allImages);
        const fallbackUpdate = await supabase
          .from('MasterCustomer')
          .update({
            // Using a field that likely exists - we can store as JSON string
            argic_code: existingRecord.argic_code + '\n\nIMAGES:' + imagesJson
          })
          .eq('quote_id', quoteId)
          .select()
          .single();

        if (fallbackUpdate.error) {
          throw fallbackUpdate.error;
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Images saved to fallback field successfully',
          totalImages: allImages.length,
          note: 'Images stored in text format due to missing damage_images column'
        });
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Images saved successfully',
        totalImages: allImages.length 
      });

    } catch (updateError) {
      throw updateError;
    }

  } catch (error) {
    console.error('Error saving images:', error);
    return res.status(500).json({ 
      message: 'Failed to save images',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 