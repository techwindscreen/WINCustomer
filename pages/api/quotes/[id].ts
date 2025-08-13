import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabaseClient';

// Window ID to name mapping
const WINDOW_NAMES: { [key: string]: string } = {
  'jqvmap1_ws': 'Windscreen',
  'jqvmap1_rw': 'Rear Window',
  'jqvmap1_df': 'Front Passenger Door',
  'jqvmap1_dg': 'Front Driver Door',
  'jqvmap1_dr': 'Rear Passenger Door',
  'jqvmap1_dd': 'Rear Driver Door',
  'jqvmap1_vp': 'Front Passenger Vent',
  'jqvmap1_vf': 'Front Driver Vent',
  'jqvmap1_vr': 'Rear Passenger Vent',
  'jqvmap1_vg': 'Rear Driver Vent',
  'jqvmap1_qr': 'Rear Passenger Quarter',
  'jqvmap1_qg': 'Rear Driver Quarter'
};

// Helper function to get window name from ID
const getWindowName = (windowId: string): string => {
  return WINDOW_NAMES[windowId] || windowId;
};

interface QuoteData {
  id: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postcode: string;
  };
  vehicle: {
    registration: string;
    make: string;
    model: string;
    year: string;
  };
  service: {
    glassType: 'OEE' | 'OEM';
    damageLocations: string[];
    damageTypes: string[];
    appointmentType: 'mobile' | 'workshop';
  };
  pricing: {
    materialsCost: number;
    labourCost: number;
    serviceFee: number;
    subtotal: number;
    totalBeforeVAT: number;
    vatAmount: number;
    totalPrice: number;
  };
  payment: {
    method: string;
    type: 'pay_in_full' | 'pay_deposit' | 'split_payment';
    depositAmount?: number;
    remainingAmount?: number;
    status: 'pending' | 'paid' | 'partially_paid';
  };
  appointment?: {
    date: string;
    time: string;
    address: string;
    technician?: {
      name: string;
      phone: string;
      experience: string;
    };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Quote ID is required' });
  }

  try {
    // Fetch quote data from Supabase MasterCustomer table
    const { data: quoteData, error } = await supabase
      .from('MasterCustomer')
      .select('*')
      .eq('quote_id', id)
      .single();

    if (error || !quoteData) {
      console.error('Quote not found:', error);
      return res.status(404).json({ message: 'Quote not found' });
    }

    console.log('Found quote data:', quoteData);

    // If vehicle details are missing, try to fetch from another record with the same vehicle_reg
    let vehicleDetails = {
      make: quoteData.brand || quoteData.vehicle_make || 'Unknown',
      model: quoteData.model || quoteData.vehicle_model || 'Unknown',
      year: quoteData.year || quoteData.vehicle_year || 'Unknown'
    };

    if (vehicleDetails.make === 'Unknown' && vehicleDetails.model === 'Unknown' && quoteData.vehicle_reg) {
      console.log('Vehicle details missing, trying to fetch from other records...');
      const { data: vehicleRecord } = await supabase
        .from('MasterCustomer')
        .select('brand, model, year, vehicle_make, vehicle_model, vehicle_year')
        .eq('vehicle_reg', quoteData.vehicle_reg)
        .not('brand', 'is', null)
        .limit(1)
        .single();

      if (vehicleRecord) {
        vehicleDetails = {
          make: vehicleRecord.brand || vehicleRecord.vehicle_make || 'Unknown',
          model: vehicleRecord.model || vehicleRecord.vehicle_model || 'Unknown',
          year: vehicleRecord.year || vehicleRecord.vehicle_year || 'Unknown'
        };
        console.log('Found vehicle details from other record:', vehicleDetails);
      }
    }

    // Convert database data to expected format
    const quote: QuoteData = {
      id: quoteData.quote_id,
      status: 'confirmed', // You may want to add a status field to your database
      createdAt: quoteData.created_at || new Date().toISOString(),
      customer: {
        name: quoteData.full_name || 'Unknown',
        email: quoteData.email || '',
        phone: quoteData.mobile || '',
        address: quoteData.location || '',
        postcode: quoteData.postcode || ''
      },
      vehicle: {
        registration: quoteData.vehicle_reg || '',
        make: vehicleDetails.make,
        model: vehicleDetails.model,
        year: vehicleDetails.year
      },
      service: {
        glassType: (quoteData.glass_type as 'OEE' | 'OEM') || 'OEE',
        damageLocations: Array.isArray(quoteData.selected_windows) 
          ? quoteData.selected_windows.flat().map(getWindowName)
          : quoteData.selected_windows 
            ? [getWindowName(quoteData.selected_windows)] 
            : [],
        damageTypes: quoteData.window_damage 
          ? Array.isArray(quoteData.window_damage) 
            ? Object.values(quoteData.window_damage.flat()[0] || {}).filter(Boolean)
            : Object.values(quoteData.window_damage || {}).filter(Boolean)
          : [],
        appointmentType: 'mobile' // You may want to add this field to your database
      },
      pricing: {
        // Calculate components based on total price (reverse engineering)
        // Total includes VAT, so we need to extract the VAT portion first
        materialsCost: Math.round(((quoteData.quote_price || 0) / 1.2) * 0.42), // ~42% of pre-VAT price for materials
        labourCost: Math.round(((quoteData.quote_price || 0) / 1.2) * 0.50), // ~50% of pre-VAT price for labour
        serviceFee: Math.round(((quoteData.quote_price || 0) / 1.2) * 0.08), // ~8% of pre-VAT price for service fee
        subtotal: Math.round(((quoteData.quote_price || 0) / 1.2) * 0.92), // Materials + Labour (before service fee)
        totalBeforeVAT: Math.round((quoteData.quote_price || 0) / 1.2), // Total before VAT
        vatAmount: Math.round((quoteData.quote_price || 0) - ((quoteData.quote_price || 0) / 1.2)), // VAT is 20%
        totalPrice: quoteData.quote_price || 0
      },
      payment: {
        method: 'card',
        type: quoteData.payment_option === 'deposit' ? 'pay_deposit' : 
              quoteData.payment_option === 'split' ? 'split_payment' : 'pay_in_full',
        depositAmount: quoteData.payment_option === 'deposit' ? Math.round((quoteData.quote_price || 0) * 0.2) : undefined,
        remainingAmount: quoteData.payment_option === 'deposit' ? Math.round((quoteData.quote_price || 0) * 0.8) : undefined,
        status: 'pending' // You may want to add payment status to your database
      },
      appointment: quoteData.appointment_date ? {
        date: quoteData.appointment_date,
        time: quoteData.time_slot || 'TBC',
        address: quoteData.location || '',
        technician: {
          name: 'TBC',
          phone: 'TBC',
          experience: 'TBC'
        }
      } : undefined
    };

    res.status(200).json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 