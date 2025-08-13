import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

/**
 * Vehicle Lookup API - Caching Strategy
 * 
 * This API implements intelligent caching to minimize external API calls:
 * 1. First checks Supabase cache for existing vehicle data
 * 2. Only calls UK Vehicle Data API if no cached data exists
 * 3. Caches all retrieved data in Supabase for future use
 * 
 * This ensures UK Vehicle Data API is called only ONCE per unique vehicle registration.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { registration } = req.body;

  try {
    // First, check if vehicle data already exists in Supabase
    console.log(`Checking cache for vehicle registration: ${registration}`);
    
    const { data: existingVehicle, error: dbError } = await supabase
      .from('MasterCustomer')
      .select(`
        vehicle_reg,
        brand,
        model,
        year,
        colour,
        type,
        style,
        door,
        otr_price
      `)
      .eq('vehicle_reg', registration)
      .not('brand', 'is', null)
      .not('model', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!dbError && existingVehicle) {
      console.log('Found cached vehicle data:', existingVehicle);
      
      // Calculate quote price from cached OTR value
      let quotePrice = 70; // Default minimum price
      
      if (existingVehicle.otr_price && !isNaN(existingVehicle.otr_price)) {
        const calculatedPrice = Math.round(existingVehicle.otr_price * 0.01);
        quotePrice = Math.max(calculatedPrice, 70);
        console.log(`Using cached OTR Price: £${existingVehicle.otr_price}, Calculated Quote: £${calculatedPrice}, Final Quote: £${quotePrice}`);
      } else {
        console.log('No cached OTR price available, using minimum price');
      }

      const vehicleDetails = {
        manufacturer: existingVehicle.brand || 'Unknown',
        model: existingVehicle.model || 'Unknown',
        year: existingVehicle.year || 'Unknown',
        colour: existingVehicle.colour || 'Unknown',
        type: existingVehicle.type || 'Unknown',
        style: existingVehicle.style || 'Unknown',
        doorPlan: existingVehicle.door ? `${existingVehicle.door} Doors` : 'Unknown',
        registration: registration,
        quotePrice: quotePrice,
        otrPrice: existingVehicle.otr_price || null
      };

      console.log('Returning cached vehicle details:', vehicleDetails);
      return res.status(200).json({ 
        success: true, 
        vehicleDetails,
        fromCache: true 
      });
    }

    console.log('No cached data found, fetching from external API...');
    
    const apiKey = process.env.UK_VEHICLE_DATA_API_KEY;
    
    if (!apiKey) {
      console.error('UK_VEHICLE_DATA_API_KEY environment variable is not set');
      return res.status(500).json({ 
        success: false, 
        message: 'Vehicle data API key not configured' 
      });
    }

    // Fetch vehicle data
    const vehicleResponse = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleData?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_VRM=${registration}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const vehicleData = await vehicleResponse.json();
    console.log('Raw Vehicle API response:', JSON.stringify(vehicleData, null, 2));

    // Fetch valuation data
    const valuationResponse = await fetch(
      `https://uk1.ukvehicledata.co.uk/api/datapackage/ValuationData?v=2&api_nullitems=1&auth_apikey=${apiKey}&key_VRM=${registration}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    const valuationData = await valuationResponse.json();
    console.log('Raw Valuation API response:', JSON.stringify(valuationData, null, 2));

    if (vehicleData.Response?.StatusCode === "Success") {
      const vehicleInfo = vehicleData.Response.DataItems;
      console.log('Vehicle Info:', vehicleInfo);

      // Calculate quote price from valuation data
      let quotePrice = 70; // Default minimum price
      
      if (valuationData.Response?.StatusCode === "Success" && valuationData.Response.DataItems?.ValuationDetails) {
        const otrValue = valuationData.Response.DataItems.ValuationDetails.PartExchange;
        
        if (otrValue && !isNaN(otrValue)) {
          // Calculate 1% of OTR (On The Road) price value
          const calculatedPrice = Math.round(otrValue * 0.01);
          // Ensure minimum price is £70
          quotePrice = Math.max(calculatedPrice, 70);
          console.log(`OTR Price: £${otrValue}, Calculated Quote: £${calculatedPrice}, Final Quote: £${quotePrice}`);
        } else {
          console.log('OTR price not available or invalid, using minimum price');
        }
      } else {
        console.log('Valuation data not available, using minimum price');
      }

      const vehicleDetails = {
        manufacturer: vehicleInfo.ClassificationDetails?.Dvla?.Make || 'Unknown',
        model: vehicleInfo.ClassificationDetails?.Dvla?.Model || 'Unknown',
        year: vehicleInfo.VehicleRegistration?.YearOfManufacture || 'Unknown',
        colour: vehicleInfo.VehicleRegistration?.Colour || 'Unknown',
        type: vehicleInfo.VehicleRegistration?.VehicleClass || 'Unknown',
        style: vehicleInfo.SmmtDetails?.BodyStyle || 'Unknown',
        doorPlan: `${vehicleInfo.TechnicalDetails?.Dimensions?.NumberOfDoors || '?'} Doors`,
        registration: registration,
        quotePrice: quotePrice,
        otrPrice: valuationData.Response?.DataItems?.ValuationDetails?.PartExchange || null
      };

      console.log('Processed vehicle details:', vehicleDetails);
      
      // Store the fetched vehicle data in Supabase for future use
      try {
        const { data: insertedData, error: insertError } = await supabase
          .from('MasterCustomer')
          .insert({
            vehicle_reg: registration,
            brand: vehicleDetails.manufacturer,
            model: vehicleDetails.model,
            year: vehicleDetails.year,
            colour: vehicleDetails.colour,
            type: vehicleDetails.type,
            style: vehicleDetails.style,
            door: vehicleDetails.doorPlan.split(' ')[0],
            otr_price: vehicleDetails.otrPrice,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.log('Note: Could not cache vehicle data (possibly duplicate):', insertError.message);
        } else {
          console.log('Successfully cached vehicle data for future use');
        }
      } catch (cacheError) {
        console.log('Note: Error caching vehicle data:', cacheError);
        // Continue execution even if caching fails
      }
      
      res.status(200).json({ 
        success: true, 
        vehicleDetails,
        fromCache: false 
      });
    } else {
      console.log('API returned non-success status:', vehicleData.Response?.StatusMessage);
      res.status(200).json({ 
        success: true, 
        vehicleDetails: {
          manufacturer: 'Unknown',
          model: 'Unknown',
          year: 'Unknown',
          colour: 'Unknown',
          type: 'Unknown',
          style: 'Unknown',
          doorPlan: 'Unknown',
          registration: registration,
          quotePrice: 70,
          otrPrice: null
        },
        fromCache: false
      });
    }
  } catch (error) {
    console.error('Error in vehicle lookup:', error);
    res.status(200).json({ 
      success: true, 
      vehicleDetails: {
        manufacturer: 'Unknown',
        model: 'Unknown',
        year: 'Unknown',
        colour: 'Unknown',
        type: 'Unknown',
        style: 'Unknown',
        doorPlan: 'Unknown',
        registration: registration,
        quotePrice: 70,
        otrPrice: null
      },
      fromCache: false
    });
  }
} 