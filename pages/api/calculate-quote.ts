import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

// Window IDs - these match the SVG map element IDs
type WindowId = 'jqvmap1_ws' | 'jqvmap1_rw' | 'jqvmap1_df' | 'jqvmap1_dg' | 'jqvmap1_dr' | 'jqvmap1_dd' | 'jqvmap1_vp' | 'jqvmap1_vf' | 'jqvmap1_vr' | 'jqvmap1_vg' | 'jqvmap1_qr' | 'jqvmap1_qg';
// Note: damage types are collected but not used in pricing calcs (yet)
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

// Fetch vehicle val data from UK Vehicle Data API
async function fetchVehicleValuation(registration: string) {
  try {
    const apiKey = process.env.UK_VEHICLE_DATA_API_KEY;
    
    if (!apiKey) {
      console.error('UK_VEHICLE_DATA_API_KEY environment variable is not set');
      return null;
    }

    console.log(`Fetching valuation data for reg: ${registration}`);
    
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
    // console.log('Full Val API response:', JSON.stringify(data, null, 2)); // debug - remove later

    if (data.Response?.StatusCode === "Success") {
      console.log('API call successful, checking for val data...');
      
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
// Example calc: For OTR price £20,000 with Windscreen + Front Driver Door + Rear Window + etc:
// - Windscreen: 1.2% × £20,000 = £240
// - Front Driver Door: 0.25% × £20,000 = £50  
// - Rear Window: 0.5% × £20,000 = £100
// - etc... Total: £540 (+ £30 per window if tinted)
function calculateMaterialsCost(otrPrice: number | null, selectedWindows: string[], glassColor?: Record<string, string>): { totalCost: number, windowBreakdown: WindowCost[] } {
  if (!otrPrice || isNaN(otrPrice)) {
    console.log('OTR price not available, using min materials cost of £70');
    return { 
      totalCost: 70, 
      windowBreakdown: [{ 
        windowId: 'fallback', 
        name: 'Minimum Glass Cost', 
        baseCost: 70, 
        privacyCost: 0, 
        totalCost: 70 
      }] 
    };
  }

  // Window type percentage multipliers based on OTR price
  // These percentages are based on industry standards... sort of
  const windowOTRPercentages = {
    'jqvmap1_ws': 0.012,    // Windscreen - 1.2%
    'jqvmap1_rw': 0.005,    // Rear Window - 0.5%
    'jqvmap1_df': 0.0025,   // Front Pass Door - 0.25% (sides)
    'jqvmap1_dg': 0.0025,   // Front Driver Door - 0.25% (sides)
    'jqvmap1_dr': 0.0025,   // Rear Pass Door - 0.25% (sides)
    'jqvmap1_dd': 0.0025,   // Rear Driver Door - 0.25% (sides)
    'jqvmap1_vp': 0.005,    // Front Pass Vent - 0.5% (quart light)
    'jqvmap1_vf': 0.005,    // Front Driver Vent - 0.5% (quart light)
    'jqvmap1_vr': 0.005,    // Rear Pass Vent - 0.5% (quart light)
    'jqvmap1_vg': 0.005,    // Rear Driver Vent - 0.5% (quart light)
    'jqvmap1_qr': 0.004,    // Rear Pass Quarter - 0.4% (quarter)
    'jqvmap1_qg': 0.004     // Rear Driver Quarter - 0.4% (quarter)
  } as Record<string, number>;

  let totalMaterialsCost = 0;
  const windowBreakdown: WindowCost[] = [];

  if (selectedWindows && Array.isArray(selectedWindows)) {
    for (const windowId of selectedWindows) {
      const percentage = windowOTRPercentages[windowId];
      const windowName = GLASS_PRICING.windows[windowId as WindowId]?.name || windowId;
      
      if (percentage) {
        const windowCost = otrPrice * percentage;
        
        // Check for privacy/tinting and add £30 if applicable
        let privacyCost = 0;
        if (glassColor && glassColor[windowId] === 'Tinted Black') {
          privacyCost = 30;
        }
        
        const totalWindowCost = windowCost + privacyCost;
        totalMaterialsCost += totalWindowCost;
        
        windowBreakdown.push({
          windowId,
          name: windowName,
          baseCost: Math.round(windowCost * 100) / 100,
          privacyCost,
          totalCost: Math.round(totalWindowCost * 100) / 100
        });
        
        const privacyNote = privacyCost > 0 ? ` + £${privacyCost} (privacy)` : '';
        console.log(`Window ${windowId}: ${percentage * 100}% of £${otrPrice} = £${windowCost.toFixed(2)}${privacyNote} = £${totalWindowCost.toFixed(2)}`);
      } else {
        console.log(`Unknown window type: ${windowId}, using default 0.25% of OTR`);
        const windowCost = otrPrice * 0.0025; // Default fallback
        
        // Check for privacy/tinting
        let privacyCost = 0;
        if (glassColor && glassColor[windowId] === 'Tinted Black') {
          privacyCost = 30;
        }
        
        const totalWindowCost = windowCost + privacyCost;
        totalMaterialsCost += totalWindowCost;
        
        windowBreakdown.push({
          windowId,
          name: windowName,
          baseCost: Math.round(windowCost * 100) / 100,
          privacyCost,
          totalCost: Math.round(totalWindowCost * 100) / 100
        });
        
        const privacyNote = privacyCost > 0 ? ` + £${privacyCost} (privacy)` : '';
        console.log(`Window ${windowId} (unknown): 0.25% of £${otrPrice} = £${windowCost.toFixed(2)}${privacyNote} = £${totalWindowCost.toFixed(2)}`);
      }
    }
  }

  // Make sure min materials cost is £70
  const finalCost = Math.max(totalMaterialsCost, 70);
  console.log(`Total materials cost: £${totalMaterialsCost.toFixed(2)}, Final cost (min £70): £${finalCost.toFixed(2)}`);
  
  return {
    totalCost: Math.round(finalCost * 100) / 100,
    windowBreakdown
  };
}

// Pricing constants for modifiers and add-ons
const GLASS_PRICING = {
  // Window type multipliers (relative to base quote price)
  windows: {
    'jqvmap1_ws': { multiplier: 1.0, name: 'Windscreen' },      // Base multiplier
    'jqvmap1_rw': { multiplier: 0.8, name: 'Rear Window' },     // 80% of windscreen
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
  
  // Note: Damage type multipliers now handled in calculateMaterialsCost func
  
  // Spec add-ons (flat fees)
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
    
    const quoteId = req.body.quoteId || `WIN${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
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
    // Base labour cost per window (scales with number of windows)
    const baseLabourPerWindow = 140;
    
    // Calculate total labour cost based on number of windows
    const numWindows = selectedWindows ? selectedWindows.length : 1;
    const labourMultiplier = numWindows === 1 ? 1 : 
                           numWindows === 2 ? 1.6 : 
                           numWindows === 3 ? 2.0 : 
                           numWindows >= 4 ? 2.3 : 1;
    
    const labourCost = Math.round(baseLabourPerWindow * labourMultiplier);
    
    console.log(`Labour calculation: ${numWindows} windows × base £${baseLabourPerWindow} × ${labourMultiplier} multiplier = £${labourCost}`);
    
    // Calculate materials cost based on OTR price and window types
    const materialsResult = calculateMaterialsCost(otrValue, selectedWindows, glassColor);
    let materialsCost = materialsResult.totalCost;
    
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
      windowCosts: materialsResult.windowBreakdown, // Include detailed window costs
      specificationCosts: specificationsCost,
      serviceFee: Math.round(serviceFee * 100) / 100,
      glassTypeMultiplier: glassMultiplier,
      baseTotal: Math.round(subtotal * 100) / 100,
      vehicleBasedPrice: materialsResult.totalCost,
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
