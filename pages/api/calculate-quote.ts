import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

// Type definitions
type WindowId = 'jqvmap1_ws' | 'jqvmap1_rw' | 'jqvmap1_df' | 'jqvmap1_dg' | 'jqvmap1_dr' | 'jqvmap1_dd' | 'jqvmap1_vp' | 'jqvmap1_vf' | 'jqvmap1_vr' | 'jqvmap1_vg' | 'jqvmap1_qr' | 'jqvmap1_qg';
// Note: Damage types are collected but not used in pricing calculations
type SpecificationType = 'Rain Sensor' | 'Sensor' | 'Heated' | 'Camera' | 'Heads Up Display' | 'HUD' | 'Aerial Antenna' | 'No Modification' | 'Not Sure?';
type GlassType = 'OEM' | 'OEE' | 'standard';

interface WindowCost {
  windowId: string;
  name: string;
  baseCost: number;
  privacyCost: number;
  totalCost: number;
}

interface PriceBreakdown {
  windowCosts: WindowCost[];
  specificationCosts: number;
  serviceFee: number;
  glassTypeMultiplier: number;
  baseTotal: number;
  vehicleBasedPrice?: number;
  otrPrice?: number | null;
}

// Fetch vehicle valuation data
async function fetchVehicleValuation(registration: string) {
  try {
    const apiKey = process.env.UK_VEHICLE_DATA_API_KEY;
    
    if (!apiKey) {
      console.error('UK_VEHICLE_DATA_API_KEY environment variable is not set');
      return null;
    }

    console.log(`Fetching valuation data for registration: ${registration}`);
    
    const response = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/ValuationData?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_VRM=${registration}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const data = await response.json();
    console.log('Full Valuation API response:', JSON.stringify(data, null, 2));

    if (data.Response?.StatusCode === "Success") {
      console.log('API call successful, checking for valuation data...');
      
      // Check the correct path for valuation data
      const dataItems = data.Response.DataItems;
      if (dataItems && dataItems.ValuationList) {
        console.log('ValuationList found:', JSON.stringify(dataItems.ValuationList, null, 2));
        
        const otrValue = dataItems.ValuationList.OTR;
        
        if (otrValue) {
          console.log(`OTR value found: £${otrValue}`);
          return parseFloat(otrValue);
        } else {
          console.log('OTR value not found in ValuationList');
          console.log('Available fields in ValuationList:', Object.keys(dataItems.ValuationList));
        }
      } else {
        console.log('ValuationList not found in DataItems');
        console.log('Available DataItems fields:', dataItems ? Object.keys(dataItems) : 'None');
      }
    } else {
      console.log(`API call failed with status: ${data.Response?.StatusCode}`);
      console.log(`Status message: ${data.Response?.StatusMessage}`);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching vehicle valuation:', error);
    return null;
  }
}

// Calculate materials cost based on OTR price and window type
// Example: For OTR price £20,000 with Windscreen + Front Driver Door + Rear Window + Rear Driver Door + Rear Passenger Door + Front Passenger Door:
// - Windscreen: 1.2% × £20,000 = £240
// - Front Driver Door: 0.25% × £20,000 = £50  
// - Rear Window: 0.5% × £20,000 = £100
// - Rear Driver Door: 0.25% × £20,000 = £50
// - Rear Passenger Door: 0.25% × £20,000 = £50
// - Front Passenger Door: 0.25% × £20,000 = £50
// Total: £540 (+ £30 per window if tinted)
function calculateMaterialsCost(otrPrice: number | null, selectedWindows: string[], glassColor?: Record<string, string>): number {
  if (!otrPrice || isNaN(otrPrice)) {
    console.log('OTR price not available, using minimum materials cost of £70');
    return 70;
  }

  // Window type percentage multipliers based on OTR price
  const windowOTRPercentages = {
    'jqvmap1_ws': 0.012,    // Windscreen - 1.2%
    'jqvmap1_rw': 0.005,    // Rear Window - 0.5%
    'jqvmap1_df': 0.0025,   // Front Passenger Door - 0.25% (sides)
    'jqvmap1_dg': 0.0025,   // Front Driver Door - 0.25% (sides)
    'jqvmap1_dr': 0.0025,   // Rear Passenger Door - 0.25% (sides)
    'jqvmap1_dd': 0.0025,   // Rear Driver Door - 0.25% (sides)
    'jqvmap1_vp': 0.005,    // Front Passenger Vent - 0.5% (quart light)
    'jqvmap1_vf': 0.005,    // Front Driver Vent - 0.5% (quart light)
    'jqvmap1_vr': 0.005,    // Rear Passenger Vent - 0.5% (quart light)
    'jqvmap1_vg': 0.005,    // Rear Driver Vent - 0.5% (quart light)
    'jqvmap1_qr': 0.004,    // Rear Passenger Quarter Light - 0.4% (quarter)
    'jqvmap1_qg': 0.004     // Rear Driver Quarter - 0.4% (quarter)
  } as Record<string, number>;

  let totalMaterialsCost = 0;

  if (selectedWindows && Array.isArray(selectedWindows)) {
    for (const windowId of selectedWindows) {
      const percentage = windowOTRPercentages[windowId];
      if (percentage) {
        const windowCost = otrPrice * percentage;
        totalMaterialsCost += windowCost;
        
        // Check for privacy/tinting and add £30 if applicable
        let privacyCost = 0;
        if (glassColor && glassColor[windowId] === 'Tinted Black') {
          privacyCost = 30;
          totalMaterialsCost += privacyCost;
        }
        
        const privacyNote = privacyCost > 0 ? ` + £${privacyCost} (privacy)` : '';
        console.log(`Window ${windowId}: ${percentage * 100}% of £${otrPrice} = £${windowCost.toFixed(2)}${privacyNote} = £${(windowCost + privacyCost).toFixed(2)}`);
      } else {
        console.log(`Unknown window type: ${windowId}, using default 0.25% of OTR`);
        const windowCost = otrPrice * 0.0025; // Default 0.25%
        totalMaterialsCost += windowCost;
        
        // Check for privacy/tinting and add £30 if applicable
        let privacyCost = 0;
        if (glassColor && glassColor[windowId] === 'Tinted Black') {
          privacyCost = 30;
          totalMaterialsCost += privacyCost;
        }
        
        const privacyNote = privacyCost > 0 ? ` + £${privacyCost} (privacy)` : '';
        console.log(`Window ${windowId} (unknown): 0.25% of £${otrPrice} = £${windowCost.toFixed(2)}${privacyNote} = £${(windowCost + privacyCost).toFixed(2)}`);
      }
    }
  }

  // Ensure minimum materials cost is £70
  const finalCost = Math.max(totalMaterialsCost, 70);
  console.log(`Total materials cost: £${totalMaterialsCost.toFixed(2)}, Final cost (min £70): £${finalCost.toFixed(2)}`);
  
  return Math.round(finalCost * 100) / 100; // Round to 2 decimal places
}

// Pricing constants for modifiers and add-ons
const GLASS_PRICING = {
  // Window type multipliers (relative to base quote price)
  windows: {
    'jqvmap1_ws': { multiplier: 1.0, name: 'Windscreen' },      // Base multiplier for windscreen
    'jqvmap1_rw': { multiplier: 0.8, name: 'Rear Window' },     // 80% of windscreen price
    'jqvmap1_df': { multiplier: 0.5, name: 'Front Passenger Door' },
    'jqvmap1_dg': { multiplier: 0.5, name: 'Front Driver Door' },
    'jqvmap1_dr': { multiplier: 0.45, name: 'Rear Passenger Door' },
    'jqvmap1_dd': { multiplier: 0.45, name: 'Rear Driver Door' },
    'jqvmap1_vp': { multiplier: 0.25, name: 'Front Passenger Vent' },
    'jqvmap1_vf': { multiplier: 0.25, name: 'Front Driver Vent' },
    'jqvmap1_vr': { multiplier: 0.2, name: 'Rear Passenger Vent' },
    'jqvmap1_vg': { multiplier: 0.2, name: 'Rear Driver Vent' },
    'jqvmap1_qr': { multiplier: 0.3, name: 'Rear Passenger Quarter' },
    'jqvmap1_qg': { multiplier: 0.3, name: 'Rear Driver Quarter' }
  } as Record<WindowId, { multiplier: number; name: string }>,
  
  // Note: Damage type multipliers are now handled within calculateMaterialsCost function
  
  // Specification add-ons (flat fees)
  specifications: {
    'Rain Sensor': 25,
    'Sensor': 25,
    'Heated': 35,
    'Camera': 50,
    'Heads Up Display': 75,
    'HUD': 75,
    'Aerial Antenna': 15,
    'No Modification': 0,
    'Not Sure?': 10  // Small buffer for unknown specs
  } as Record<SpecificationType, number>,
  
  // Glass type multipliers
  glassTypes: {
    'OEM': 1.4,    // Original Equipment Manufacturer - more expensive
    'OEE': 1.0,    // Original Equipment Equivalent - standard price
    'standard': 1.0
  } as Record<GlassType, number>
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { 
      vehicleDetails, 
      windowSpecifications, 
      selectedWindows,
      windowDamage,
      deliveryType,
      glassType,
      glassColor
    } = req.body;
    
    const quoteId = req.body.quoteId || `WC${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    if (!vehicleDetails?.registration) {
      return res.status(400).json({ message: 'Vehicle registration is required' });
    }

    console.log('Calculating quote with data:', {
      selectedWindows,
      windowDamage,
      windowSpecifications,
      glassType,
      deliveryType,
      glassColor,
      registration: vehicleDetails.registration
    });

    // Fetch vehicle valuation data
    const otrValue = await fetchVehicleValuation(vehicleDetails.registration);

    // NEW PRICING STRUCTURE
    // Fixed labour cost
    const labourCost = 140;
    
    // Calculate materials cost based on OTR price and window types
    let materialsCost = calculateMaterialsCost(otrValue, selectedWindows, glassColor);
    
    // Apply specification costs to materials
    let specificationsCost = 0;
    if (windowSpecifications && Array.isArray(windowSpecifications)) {
      specificationsCost = windowSpecifications.reduce((total, spec) => {
        const specCost = (spec as SpecificationType) in GLASS_PRICING.specifications
          ? GLASS_PRICING.specifications[spec as SpecificationType]
          : 0;
        return total + specCost;
      }, 0);
    }
    materialsCost += specificationsCost;
    
    // Apply glass type multiplier to materials
    const glassMultiplier = glassType && (glassType as GlassType) in GLASS_PRICING.glassTypes
      ? GLASS_PRICING.glassTypes[glassType as GlassType]
      : 1.0;
    materialsCost *= glassMultiplier;
    
    // Calculate subtotal (labour + materials)
    const subtotal = labourCost + materialsCost;
    
    // Add 20% service fee on labour + materials
    const serviceFee = subtotal * 0.2;
    const totalBeforeVAT = subtotal + serviceFee;
    
    // Add 20% VAT on the total
    const vat = totalBeforeVAT * 0.2;
    let totalPrice = totalBeforeVAT + vat;
    
    // Apply delivery type fee
    if (deliveryType === 'express') {
      totalPrice += 90; // £90 additional for express delivery
    }
    
    // Round to nearest pound
    totalPrice = Math.round(totalPrice);
    
    // Ensure minimum total price is still £70
    totalPrice = Math.max(totalPrice, 70);

    // Create detailed breakdown for transparency
    const breakdown: PriceBreakdown = {
      windowCosts: [], // Keep empty for compatibility
      specificationCosts: specificationsCost,
      serviceFee: Math.round(serviceFee * 100) / 100,
      glassTypeMultiplier: glassMultiplier,
      baseTotal: Math.round(subtotal * 100) / 100,
      vehicleBasedPrice: calculateMaterialsCost(otrValue, selectedWindows, glassColor),
      otrPrice: otrValue
    };

    // Add detailed breakdown info for debugging
    console.log('Price Breakdown:', {
      labourCost,
      materialsCost: Math.round(materialsCost * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      serviceFee: Math.round(serviceFee * 100) / 100,
      totalBeforeVAT: Math.round(totalBeforeVAT * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      finalPrice: totalPrice,
      glassType,
      deliveryType
    });

    try {
      // First, try to update the existing record in Supabase
      const { data: updateData, error: updateError } = await supabase
        .from('MasterCustomer')
        .update({
          quote_price: totalPrice,
          service_type: deliveryType,
          glass_type: glassType,
          otr_price: otrValue
        })
        .eq('quote_id', quoteId)
        .select();

      if (updateError || !updateData || updateData.length === 0) {
        console.log('Update failed or no record found, attempting upsert...');
        
        // If update fails or no record exists, create a new record
        const { data: insertData, error: insertError } = await supabase
          .from('MasterCustomer')
          .insert({
            quote_id: quoteId,
            quote_price: totalPrice,
            service_type: deliveryType,
            glass_type: glassType,
            otr_price: otrValue,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();

        if (insertError) {
          console.error('Supabase insert error:', insertError);
        } else {
          console.log('Successfully created new quote record with price:', totalPrice);
        }
      } else {
        console.log('Successfully updated quote price in Supabase:', totalPrice);
      }
    } catch (supabaseError) {
      console.error('Supabase error:', supabaseError);
      // Continue execution even if Supabase operation fails
    }

    return res.status(200).json({
      success: true,
      price: totalPrice,
      quoteId,
      breakdown: {
        ...breakdown,
        // Add detailed breakdown for frontend display
        labourCost: labourCost,
        materialsCost: Math.round(materialsCost * 100) / 100,
        subtotal: Math.round(subtotal * 100) / 100,
        serviceFee: Math.round(serviceFee * 100) / 100,
        totalBeforeVAT: Math.round(totalBeforeVAT * 100) / 100,
        vat: Math.round(vat * 100) / 100,
        finalPrice: totalPrice,
        glassType: glassType,
        deliveryType: deliveryType
      }
    });
  } catch (error) {
    console.error('Error calculating quote:', error);
    return res.status(500).json({ message: 'Failed to calculate quote' });
  }
}
