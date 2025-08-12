import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';
import pricingConfig from '../../config/WINCpricing.json';

// Window IDs - these match the SVG map element IDs
type WindowId = 'jqvmap1_ws' | 'jqvmap1_rw' | 'jqvmap1_df' | 'jqvmap1_dg' | 'jqvmap1_dr' | 'jqvmap1_dd' | 'jqvmap1_vp' | 'jqvmap1_vf' | 'jqvmap1_vr' | 'jqvmap1_vg' | 'jqvmap1_qr' | 'jqvmap1_qg';
// Note: damage types are collected but not used in pricing calcs (yet)
type SpecificationType = 'Rain Sensor' | 'Sensor' | 'Heated' | 'Camera' | 'Heads Up Display' | 'HUD' | 'Aerial Antenna' | 'No Modification' | 'Not Sure?';
type GlassType = 'OEM' | 'OEE' | 'standard';

// Ensure pricing config exists and contains required keys
function assertPricingConfig(cfg: any) {
  const requiredKeys = [
    'percentages',
    'names',
    'minMaterialsCost',
    'defaultWindowPercentage',
    'tintedPrivacySurcharge',
    'baseLabourPerWindow',
    'specifications',
    'glassTypes',
    'serviceFeeRate',
    'vatRate',
    'expressDeliveryFee',
    'minTotalPrice'
  ];
  for (const key of requiredKeys) {
    if (pricingConfig == null || (pricingConfig as any)[key] === undefined) {
      throw new Error(`Missing pricing configuration: ${key}`);
    }
  }
}

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
function calculateMaterialsCost(
  otrPrice: number | null,
  selectedWindows: string[],
  glassColor: Record<string, string> | undefined,
  cfg: any
): { totalCost: number; windowBreakdown: WindowCost[] } {
  if (!otrPrice || isNaN(otrPrice)) {
    const minMaterialsCost = cfg.minMaterialsCost;
    console.log(`OTR price not available, using min materials cost of £${minMaterialsCost}`);
    return {
      totalCost: minMaterialsCost,
      windowBreakdown: [{
        windowId: 'fallback',
        name: 'Minimum Glass Cost',
        baseCost: minMaterialsCost,
        privacyCost: 0,
        totalCost: minMaterialsCost
      }]
    };
  }

  // Window type percentage multipliers based on OTR price
  // Pulled from JSON config for easier updates
  const { percentages: windowOTRPercentages, names: windowNames, defaultWindowPercentage, tintedPrivacySurcharge } = cfg;

  let totalMaterialsCost = 0;
  const windowBreakdown: WindowCost[] = [];

  if (selectedWindows && Array.isArray(selectedWindows)) {
    for (const windowId of selectedWindows) {
      const percentage = windowOTRPercentages?.[windowId];
      const windowName = (windowNames && windowNames[windowId]) || windowId;
      
      if (percentage) {
        const windowCost = otrPrice * percentage;
        
        // Check for privacy/tinting and add surcharge if applicable
        let privacyCost = 0;
        if (glassColor && glassColor[windowId] === 'Tinted Black') {
          privacyCost = tintedPrivacySurcharge;
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
        const fallbackPercentage = defaultWindowPercentage;
        console.log(`Unknown window type: ${windowId}, using default ${fallbackPercentage * 100}% of OTR`);
        const windowCost = otrPrice * fallbackPercentage; // Default from config
        
        // Check for privacy/tinting
        let privacyCost = 0;
        if (glassColor && glassColor[windowId] === 'Tinted Black') {
          privacyCost = tintedPrivacySurcharge;
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

  // Make sure min materials cost obeys config
  const minMaterialsCost = cfg.minMaterialsCost;
  const finalCost = Math.max(totalMaterialsCost, minMaterialsCost);
  console.log(`Total materials cost: £${totalMaterialsCost.toFixed(2)}, Final cost (min £${minMaterialsCost}): £${finalCost.toFixed(2)}`);
  
  return {
    totalCost: Math.round(finalCost * 100) / 100,
    windowBreakdown
  };
}

// Note: All pricing and names are sourced from WINCpricing.json

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Validate pricing config upfront
    assertPricingConfig(pricingConfig);
    const cfg: any = pricingConfig as any;
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
    const baseLabourPerWindow = cfg.baseLabourPerWindow;
    
    // Calculate total labour cost based on number of windows
    const labourCost = Math.round(baseLabourPerWindow);

    console.log(`Labour calculation: fixed base £${baseLabourPerWindow} = £${labourCost}`);
    
    // Calculate materials cost based on OTR price and window types
    const materialsResult = calculateMaterialsCost(otrValue, selectedWindows, glassColor, cfg);
    let materialsCost = materialsResult.totalCost;
    
    // Apply specification costs to materials
    let specificationsCost = 0;
    if (windowSpecifications && Array.isArray(windowSpecifications)) {
      specificationsCost = windowSpecifications.reduce((total, spec) => {
        const specPricing = cfg.specifications;
        const specCost = (spec as SpecificationType) in specPricing
          ? specPricing[spec as SpecificationType]
          : 0;
        return total + specCost;
      }, 0);
    }
    materialsCost += specificationsCost;
    
    // Apply glass type multiplier to materials
    const glassTypeMultipliers = cfg.glassTypes;
    const glassMultiplier = glassType && (glassType as GlassType) in glassTypeMultipliers
      ? glassTypeMultipliers[glassType as GlassType]
      : 1.0;
    materialsCost *= glassMultiplier;
    
    // Calculate subtotal (labour + materials)
    const subtotal = labourCost + materialsCost;
    
    // Add service fee on labour + materials
    const serviceFeeRate = cfg.serviceFeeRate;
    const serviceFee = subtotal * serviceFeeRate;
    const totalBeforeVAT = subtotal + serviceFee;
    
    // Add VAT on the total
    const vatRate = cfg.vatRate;
    const vat = totalBeforeVAT * vatRate;
    let totalPrice = totalBeforeVAT + vat;
    
    // Apply delivery type fee
    if (deliveryType === 'express') {
      const expressDeliveryFee = cfg.expressDeliveryFee;
      totalPrice += expressDeliveryFee;
    }
    
    // Round to nearest pound
    totalPrice = Math.round(totalPrice);
    
    // Ensure minimum total price obeys config
    const minTotalPrice = cfg.minTotalPrice;
    totalPrice = Math.max(totalPrice, minTotalPrice);

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
