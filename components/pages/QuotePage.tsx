import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Image from 'next/image';
import { loadStripe, Appearance } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Define a mapping object for window names
const windowNameMapping: { [key: string]: string } = {
  'jqvmap1_ws': 'Windscreen',
  'jqvmap1_rw': 'Rear Window',
  'jqvmap1_vp': 'Front Passenger Vent',
  'jqvmap1_df': 'Front Passenger Door',
  'jqvmap1_dr': 'Rear Passenger Door',
  'jqvmap1_vr': 'Rear Passenger Vent',
  'jqvmap1_qr': 'Rear Passenger Quarter',
  'jqvmap1_vf': 'Front Driver Vent',
  'jqvmap1_dg': 'Front Driver Door',
  'jqvmap1_dd': 'Rear Driver Door',
  'jqvmap1_vg': 'Rear Driver Vent',
  'jqvmap1_qg': 'Rear Driver Quarter'
};

const CheckoutForm = ({ amount, paymentType, isDisabled = false, customerEmail, quoteId, totalPrice }: { amount: number, paymentType: 'full' | 'deposit' | 'split', isDisabled?: boolean, customerEmail?: string, quoteId?: string, totalPrice?: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || 'An error occurred');
      setProcessing(false);
      return;
    }

    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount,
        paymentType,
        totalAmount: totalPrice || amount,
        quoteId: quoteId || window.location.pathname.split('/').pop() || 'unknown',
        customerEmail: customerEmail
      }),
    });

    const { clientSecret } = await response.json();

    const { error: paymentError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: typeof window !== 'undefined' ? `${window.location.origin}/payment-success` : '/payment-success',
      },
    });

    if (paymentError) {
      setError(paymentError.message || 'An error occurred');
    }
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        type="submit"
        disabled={!stripe || processing || isDisabled}
        className="w-full py-4 bg-[#0FB8C1] text-white rounded-xl text-lg font-semibold hover:bg-[#0DA6AE] transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
      >
        {processing ? 'Processing...' : isDisabled ? 'Select Glass Type First' : `Pay ${paymentType === 'full' ? 'in Full' : paymentType === 'deposit' ? 'Deposit' : 'Split Payment'} Now`}
      </button>
    </form>
  );
};

interface ContactDetails {
  fullName: string;
  email: string;
  mobile: string;
  postcode: string;
  location: string;
  date?: string;
  timeSlot?: string;
}

interface WindowCost {
  windowId: string;
  name: string;
  baseCost: number;
  privacyCost: number;
  totalCost: number;
}

interface BaseQuoteData {
  labourCost: number;
  baseMaterialsCost: number;
  specificationsCost: number;
  vehicleBasedPrice: number;
  otrPrice: number | null;
  windowBreakdown?: WindowCost[];
}

const QuotePage: React.FC = () => {
  const router = useRouter();
  const { vehicleReg, selectedWindows, windowDamage, specifications, paymentOption, insuranceDetails, contactDetails, quoteID, glassType: queryGlassType } = router.query;

  // State for storing fetched quote data (for magic link functionality)
  const [fetchedQuoteData, setFetchedQuoteData] = useState<any>(null);
  const [isLoadingQuoteData, setIsLoadingQuoteData] = useState(false);

  // Determine if this is a magic link (only quoteID provided)
  const isMagicLink = quoteID && !vehicleReg && !selectedWindows;

  const parsedData = fetchedQuoteData || {
    vehicleReg: vehicleReg as string,
    quoteID: quoteID as string,
    selectedWindows: selectedWindows ? JSON.parse(selectedWindows as string || '[]') : [],
    windowDamage: windowDamage ? JSON.parse(windowDamage as string || '{}') : {},
    specifications: specifications ? JSON.parse(specifications as string || '[]') : [],
    paymentOption: paymentOption as 'self' | 'insurance',
    insuranceDetails: insuranceDetails ? JSON.parse(insuranceDetails as string) : null,
    contactDetails: contactDetails ? JSON.parse(contactDetails as string) : null,
    queryGlassType: queryGlassType as string,
    vehicleDetails: null,
    comments: '',
    chipSize: null,
    glassColor: {},
    uploadedImages: []
  };

  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editedContactData, setEditedContactData] = useState({
    fullName: parsedData.contactDetails?.fullName || '',
    email: parsedData.contactDetails?.email || '',
    mobile: parsedData.contactDetails?.mobile || '',
    postcode: parsedData.contactDetails?.postcode || '',
    location: parsedData.contactDetails?.location || ''
  });

  const [quotePrice, setQuotePrice] = useState<number | null>(null);
  const [baseQuoteData, setBaseQuoteData] = useState<BaseQuoteData | null>(null); // Store base calculation data
  const [quoteBreakdown, setQuoteBreakdown] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quoteRange] = useState({
    min: 100,
    max: 1000,
    average: 550
  });
  const [deliveryType, setDeliveryType] = useState<'standard' | 'express'>('standard');
  const [paymentType, setPaymentType] = useState<'full' | 'deposit' | 'split'>('full');
  const [isExpired, setIsExpired] = useState(false);
  const [countdown, setCountdown] = useState(15 * 60); // 15 minutes in seconds
  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [isQuoteDetailsCollapsed, setIsQuoteDetailsCollapsed] = useState(true);

  const [displayedContactDetails, setDisplayedContactDetails] = useState<ContactDetails>(
    parsedData.contactDetails || {
      fullName: '',
      email: '',
      mobile: '',
      postcode: '',
      location: ''
    }
  );

  const [editedAppointmentData, setEditedAppointmentData] = useState({
    date: parsedData.contactDetails?.date || '',
    timeSlot: parsedData.contactDetails?.timeSlot || ''
  });

  const [recordId, setRecordId] = useState<string | null>(null);

  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [glassType, setGlassType] = useState<'OEM' | 'OEE' | null>(
    (router.query.glassType as 'OEM' | 'OEE') || 
    (parsedData.queryGlassType as 'OEM' | 'OEE') || 
    null
  );
  
  const [adasCalibration, setAdasCalibration] = useState<'yes' | 'no' | null>(null);
  
  // Add mounted state to prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Update glass type when router query changes (for navigation back)
  useEffect(() => {
    const urlGlassType = router.query.glassType as 'OEM' | 'OEE' | undefined;
    if (urlGlassType && urlGlassType !== glassType) {
      setGlassType(urlGlassType);
    }
  }, [router.query.glassType]);

  // Remove hardcoded business prices - we'll use the actual API-calculated price
  const [apiQuotePrice, setApiQuotePrice] = useState<number | null>(null);
  
  // Company pricing with random variations
  const [companyPrices, setCompanyPrices] = useState<{name: string, price: number, rating: number, delivery: string}[]>([]);

  // Create a function that updates the selected business
  const handleBusinessChange = (business: string) => {
    setSelectedBusiness(business);
    // Don't override the price here - use the API calculated price
  };

  // Add a new handleGlassTypeChange function
  const handleGlassTypeChange = (type: 'OEM' | 'OEE' | null) => {
    setGlassType(type);
    
    // Update URL with glass type to persist across page navigation
    const currentQuery = { ...router.query };
    if (type) {
      currentQuery.glassType = type;
    } else {
      delete currentQuery.glassType;
    }
    
    router.replace({
      pathname: router.pathname,
      query: currentQuery
    }, undefined, { shallow: true });
    
    // Calculate price locally instead of calling API
    if (baseQuoteData && type) {
      calculatePriceLocally(type);
    }
    
    // Update quote settings in database
    updateQuoteSettings(type, adasCalibration);
  };

  const updateQuoteSettings = async (glassType: 'OEM' | 'OEE' | null, adasCalibration: 'yes' | 'no' | null) => {
    try {
      const dataToUse = fetchedQuoteData || parsedData;
      const quoteID = router.query.quoteID || dataToUse.quoteID;
      
      if (quoteID) {
        await fetch('/api/update-quote-settings', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteId: quoteID,
            glassType: glassType,
            adasCalibration: adasCalibration
          }),
        });
      }
    } catch (error) {
      console.error('Error updating quote settings:', error);
      // Continue execution even if update fails
    }
  };

  // Generate deterministic price variations for companies
  const generateCompanyPrices = (basePrice: number) => {
    const companies = [
      { name: 'Auto Bond Co', rating: 5, delivery: '1 Day Delivery' },
      { name: 'Windscreen Wizard', rating: 5, delivery: '1 Day Delivery' },
      { name: 'Glass Express', rating: 4, delivery: '2 Day Delivery' }
    ];

    // Create a deterministic seed based on the base price and vehicle data
    const dataToUse = fetchedQuoteData || parsedData;
    const seedString = `${basePrice}-${dataToUse.vehicleReg || ''}-${JSON.stringify(dataToUse.selectedWindows || [])}`;
    
    // Simple deterministic random number generator
    const seededRandom = (seed: string, index: number) => {
      let hash = 0;
      const fullSeed = seed + index;
      for (let i = 0; i < fullSeed.length; i++) {
        const char = fullSeed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return Math.abs(hash) / 2147483647; // Normalize to 0-1
    };

    const companiesWithPrices = companies.map((company, index) => {
      // Generate deterministic variation between -2% and +2%
      const randomValue = seededRandom(seedString, index);
      const variation = (randomValue - 0.5) * 0.04; // -0.02 to +0.02
      const adjustedPrice = Math.round(basePrice * (1 + variation));
      
      return {
        ...company,
        price: adjustedPrice
      };
    });

    // Sort by price (cheapest first)
    companiesWithPrices.sort((a, b) => a.price - b.price);
    
    setCompanyPrices(companiesWithPrices);
    
    // Auto-select the cheapest option
    if (companiesWithPrices.length > 0) {
      setSelectedBusiness(companiesWithPrices[0].name);
    }
  };

  // Local price calculation based on glass type
  const calculatePriceLocally = (selectedGlassType: 'OEM' | 'OEE') => {
    if (!baseQuoteData) return;

    const { labourCost, baseMaterialsCost, specificationsCost } = baseQuoteData;
    
    // Apply glass type multiplier to materials
    const glassMultiplier = selectedGlassType === 'OEM' ? 1.4 : 1.0;
    const materialsCost = (baseMaterialsCost + specificationsCost) * glassMultiplier;
    
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
    
    // Update state with calculated values
    setQuotePrice(totalPrice);
    setQuoteBreakdown({
      labourCost: labourCost,
      materialsCost: Math.round(materialsCost * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      serviceFee: Math.round(serviceFee * 100) / 100,
      totalBeforeVAT: Math.round(totalBeforeVAT * 100) / 100,
      vat: Math.round(vat * 100) / 100,
      finalPrice: totalPrice,
      glassType: selectedGlassType,
      deliveryType: deliveryType
    });
    
    // Generate company prices with random variations
    generateCompanyPrices(totalPrice);
  };

  const calculateQuoteWithGlassType = async (type: 'standard' | 'express', glassTypeOverride?: 'OEM' | 'OEE' | null) => {
    try {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      setQuotePrice(null);
      
      // Use OEE as default for initial API call to get base data
      const apiGlassType = glassTypeOverride !== undefined ? glassTypeOverride : (glassType || 'OEE');
      
      // Use fetched data if available (for magic links), otherwise use parsed data
      const dataToUse = fetchedQuoteData || parsedData;
      
      console.log('calculateQuoteWithGlassType - Data being used:', {
        fetchedQuoteData: fetchedQuoteData ? 'available' : 'null',
        parsedData: parsedData ? 'available' : 'null',
        dataToUse,
        vehicleReg: dataToUse.vehicleReg,
        selectedWindows: dataToUse.selectedWindows,
        windowDamage: dataToUse.windowDamage
      });
      
      if (!dataToUse.vehicleReg) {
        console.error('No vehicle registration available! Data:', dataToUse);
        throw new Error('Vehicle registration not found. Please restart the quote process.');
      }

      // Check if we have selected windows and damage data
      console.log('Checking selected windows:', dataToUse.selectedWindows);
      console.log('Checking window damage:', dataToUse.windowDamage);
      
      if (!dataToUse.selectedWindows || (Array.isArray(dataToUse.selectedWindows) && dataToUse.selectedWindows.length === 0)) {
        console.error('No selected windows data available! Data:', dataToUse);
        setError('No window selection found. Please start over from damage location page.');
        setIsLoading(false);
        return;
      }

      if (!dataToUse.windowDamage || Object.keys(dataToUse.windowDamage).length === 0) {
        console.error('No window damage data available! Data:', dataToUse);
        setError('No damage information found. Please start over from damage location page.');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch('/api/calculate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleDetails: {
            registration: dataToUse.vehicleReg,
          },
          windowSpecifications: Array.isArray(dataToUse.specifications) 
            ? dataToUse.specifications 
            : [],
          selectedWindows: Array.isArray(dataToUse.selectedWindows)
            ? dataToUse.selectedWindows
            : [],
          windowDamage: dataToUse.windowDamage || {},
          glassColor: dataToUse.glassColor || {},
          deliveryType: type,
          quoteId: router.query.quoteID || dataToUse.quoteID,
          glassType: apiGlassType
        }),
      });

      const responseText = await response.text();
      console.log('Quote Response:', response.status, responseText);

      if (!response.ok) {
        throw new Error(`Failed to calculate quote: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      console.log('Quote calculation breakdown:', data.breakdown);
      
      // Store base calculation data for local price calculations
      setBaseQuoteData({
        labourCost: data.breakdown.labourCost,
        baseMaterialsCost: data.breakdown.materialsCost / (apiGlassType === 'OEM' ? 1.4 : 1.0), // Remove glass type multiplier to get base
        specificationsCost: data.breakdown.specificationCosts || 0,
        vehicleBasedPrice: data.breakdown.vehicleBasedPrice,
        otrPrice: data.breakdown.otrPrice,
        windowBreakdown: data.breakdown.windowCosts || []
      });
      
      setQuotePrice(data.price);
      setApiQuotePrice(data.price);
      setQuoteBreakdown(data.breakdown);
      
      // Generate company prices with random variations
      generateCompanyPrices(data.price);
    } catch (err) {
      console.error('Quote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate quote');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateQuoteWithType = async (type: 'standard' | 'express') => {
    return calculateQuoteWithGlassType(type);
  };

  // Function to fetch quote data for magic links
  const fetchQuoteData = async (quoteId: string) => {
    try {
      setIsLoadingQuoteData(true);
      console.log('Fetching quote data from API for:', quoteId);
      
      const response = await fetch(`/api/get-quote-data?quoteId=${quoteId}`);
      console.log('API response status:', response.status);
      
      const responseText = await response.text();
      console.log('API response text:', responseText);
      
      if (!response.ok) {
        console.error('API error response:', responseText);
        throw new Error(`Failed to fetch quote data: ${responseText}`);
      }
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}...`);
      }
      console.log('API response data:', result);
      
      if (result.success && result.data) {
        console.log('Setting fetchedQuoteData with:', result.data);
        console.log('Selected windows in fetched data:', result.data.selectedWindows);
        console.log('Window damage in fetched data:', result.data.windowDamage);
        console.log('Glass type in fetched data:', result.data.glassType);
        console.log('Vehicle reg in fetched data:', result.data.vehicleReg);
        
        // Additional validation and logging
        if (!result.data.vehicleReg) {
          console.warn('Quote data found but missing vehicle registration:', result.data);
        }
        
        setFetchedQuoteData(result.data);
        
        // Set glass type if available
        if (result.data.glassType) {
          setGlassType(result.data.glassType);
        } else if (result.data.argicCode) {
          // Try to extract glass type from argic code or set default
          setGlassType('OEE'); // Default, could be enhanced to parse from argic code
        }
        
        return result.data;
      } else {
        console.error('API returned unsuccessful result:', result);
        throw new Error('Quote data not found in response');
      }
    } catch (error) {
      console.error('Error fetching quote data:', error);
      // For magic links, don't show error immediately - the user might be in the middle of the flow
      // setError('Failed to load quote data. Please check your link or start a new quote.');
      return null;
    } finally {
      setIsLoadingQuoteData(false);
    }
  };

  useEffect(() => {
    // Clear stored form data when reaching the quote page
    if (typeof window !== 'undefined') {
      localStorage.removeItem('windscreenCompareData');
      localStorage.removeItem('damageLocationData');
    }
    
    const initializeQuote = async () => {
      if (isMagicLink && quoteID) {
        // Magic link: fetch data from Supabase
        console.log('Magic link detected, fetching data for quoteID:', quoteID);
        const fetchedData = await fetchQuoteData(quoteID as string);
        console.log('Fetched data result:', fetchedData);
        
        if (fetchedData) {
          // Check if vehicle registration exists
          if (!fetchedData.vehicleReg) {
            console.warn('Quote found but missing vehicle registration. Data:', fetchedData);
            setError('This quote is missing vehicle information. Please start over or contact support if this continues.');
            setIsLoading(false);
            return;
          }
          
          console.log('Vehicle reg found in fetched data:', fetchedData.vehicleReg);
          
          // Check if this is a complete quote or just partial data
          if (!fetchedData.selectedWindows || !fetchedData.windowDamage) {
            console.warn('Incomplete quote data - missing windows/damage info');
            setError('This quote is incomplete. Please start over from the beginning.');
            setIsLoading(false);
            return;
          }
          
          // Quote calculation will be triggered by the useEffect when fetchedQuoteData is set
        } else {
          console.warn('No data returned from fetchQuoteData for quoteID:', quoteID);
          
          // Try to fetch debug information to help diagnose the issue
          try {
            const debugResponse = await fetch(`/api/debug-quote?quoteId=${quoteID}`);
            const debugResponseText = await debugResponse.text();
            let debugData;
            try {
              debugData = JSON.parse(debugResponseText);
            } catch (parseError) {
              console.error('Failed to parse debug response JSON:', debugResponseText);
              debugData = { success: false };
            }
            console.error('Debug information for failed quote:', debugData);
            
            if (debugData.success && debugData.debug.recordCount > 0) {
              setError('Quote found but missing vehicle data. Please contact support with quote ID: ' + quoteID);
            } else {
              setError('Quote not found. The link may be invalid or expired. Please start a new quote.');
            }
          } catch (debugError) {
            console.error('Failed to fetch debug info:', debugError);
            setError('Quote not found. The link may be invalid or expired. Please start a new quote.');
          }
          
          setIsLoading(false);
        }
      } else {
        // Regular flow: use URL parameters
        console.log('Regular flow detected');
    // Initialize glassType from query parameter if available
    if (parsedData.queryGlassType === 'OEM' || parsedData.queryGlassType === 'OEE') {
      setGlassType(parsedData.queryGlassType);
    }
    
    // Only call API once on initial load
    if (parsedData.vehicleReg) {
      calculateQuoteWithType(deliveryType);
    } else {
      // If no vehicle reg, stop loading
      console.warn('No vehicle registration found, stopping loading state');
      setIsLoading(false);
      setError('Vehicle registration not found. Please start over.');
    }
      }
    };

    initializeQuote();
  }, [quoteID, vehicleReg, selectedWindows, isMagicLink]);

  // Trigger local calculation when glass type changes (after initial load)
  useEffect(() => {
    if (baseQuoteData && glassType && !isLoading) {
      calculatePriceLocally(glassType);
    }
  }, [glassType, baseQuoteData, deliveryType]);

  useEffect(() => {
    if (!isLoading && quotePrice && isMounted) {
      const timer = setInterval(() => {
        setCountdown((prevTime) => {
          if (prevTime <= 0) {
            clearInterval(timer);
            setIsExpired(true);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isLoading, quotePrice, isMounted]);

  useEffect(() => {
    if (!isLoading && quotePrice && selectedBusiness) {
      // The quote price is already calculated by the API
      // No need to apply additional multipliers here
    }
  }, [isLoading]);

  // Add another useEffect to initialize when selectedBusiness changes
  useEffect(() => {
    if (selectedBusiness && !isLoading) {
      // The price is already set by the API calculation
      // No additional calculation needed
    }
  }, [selectedBusiness]);

  // Update states when fetchedQuoteData becomes available (for magic links)
  useEffect(() => {
    if (fetchedQuoteData) {
      console.log('fetchedQuoteData useEffect triggered with data:', fetchedQuoteData);
      
      // Update contact details
      if (fetchedQuoteData.contactDetails) {
        setDisplayedContactDetails(fetchedQuoteData.contactDetails);
        setEditedContactData({
          fullName: fetchedQuoteData.contactDetails.fullName || '',
          email: fetchedQuoteData.contactDetails.email || '',
          mobile: fetchedQuoteData.contactDetails.mobile || '',
          postcode: fetchedQuoteData.contactDetails.postcode || '',
          location: fetchedQuoteData.contactDetails.location || ''
        });
        setEditedAppointmentData({
          date: fetchedQuoteData.contactDetails.date || '',
          timeSlot: fetchedQuoteData.contactDetails.timeSlot || ''
        });
      }
      
      // Update glass type and ADAS calibration from fetched data
      if (fetchedQuoteData.glassType) {
        setGlassType(fetchedQuoteData.glassType);
      }
      if (fetchedQuoteData.adasCalibration) {
        setAdasCalibration(fetchedQuoteData.adasCalibration);
      }
      
      // Trigger quote calculation for magic links after data is loaded
      if (isMagicLink && fetchedQuoteData.vehicleReg && !baseQuoteData) {
        console.log('Triggering quote calculation for magic link with vehicle reg:', fetchedQuoteData.vehicleReg);
        calculateQuoteWithType(deliveryType);
      }
    }
  }, [fetchedQuoteData, isMagicLink, deliveryType]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePayment = async () => {
    try {
      // Use fetched data if available (for magic links), otherwise use parsed data
      const dataToUse = fetchedQuoteData || parsedData;
      
      // Create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: currentPrice,
          vehicleReg: dataToUse.vehicleReg,
          selectedWindows: dataToUse.selectedWindows,
          specifications: dataToUse.specifications,
          glassType: glassType, // Add the glass type to the checkout session
          selectedCompany: selectedBusiness, // Add the selected company
          adasCalibration: adasCalibration // Add ADAS calibration preference
        }),
      });

      const responseText = await response.text();
      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${responseText}`);
      }
      
      let session;
      try {
        session = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Invalid response from payment service: ${responseText.substring(0, 100)}...`);
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const result = await stripe?.redirectToCheckout({
        sessionId: session.id,
      });

      if (result?.error) {
        console.error(result.error);
        setError('Payment failed. Please try again.');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Payment failed. Please try again.');
    }
  };

  const handleUpdateContact = async () => {
    try {
      // Use fetched data if available (for magic links), otherwise use parsed data
      const dataToUse = fetchedQuoteData || parsedData;
      const quoteID = router.query.quoteID || dataToUse.quoteID;
      if (!quoteID) {
        console.error('Missing quoteID. Router query:', router.query);
        console.error('Data to use:', dataToUse);
        throw new Error('Quote ID is missing');
      }

      const response = await fetch('/api/update-contact-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quoteID,
          contactDetails: editedContactData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update contact details');
      }

      // Update the displayed contact details with the new state
      setDisplayedContactDetails(editedContactData);
      setIsEditingContact(false);
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update contact details');
    }
  };

  const handleDeliveryTypeChange = (type: 'standard' | 'express') => {
    setDeliveryType(type);
    // Only call API for delivery type changes since it affects final pricing
    calculateQuoteWithType(type);
  };

  const handleUpdateAppointment = async () => {
    try {
      const quoteID = router.query.quoteID || parsedData.quoteID;
      if (!quoteID) {
        throw new Error('Quote ID is missing');
      }

      const response = await fetch('/api/update-contact-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quoteId: quoteID,
          contactDetails: {
            ...displayedContactDetails,
            date: editedAppointmentData.date,
            timeSlot: editedAppointmentData.timeSlot
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update appointment details');
      }

      // Update the displayed contact details
      setDisplayedContactDetails(prev => ({
        ...prev,
        date: editedAppointmentData.date,
        timeSlot: editedAppointmentData.timeSlot
      }));
      setIsEditingAppointment(false);
    } catch (err) {
      console.error('Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update appointment details');
    }
  };

  const handleRestart = () => {
    router.push('/');
  };

  const appearance: Appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: '#0FB8C1',
    },
  };

  // COMMENTED OUT: Company-specific pricing logic
  // const getSelectedCompanyPrice = () => {
  //   if (!selectedBusiness || companyPrices.length === 0) {
  //     return quotePrice || 0;
  //   }
  //   const company = companyPrices.find(c => c.name === selectedBusiness);
  //   return company ? company.price : quotePrice || 0;
  // };
  // const currentCompanyPrice = getSelectedCompanyPrice();

  // Simplified pricing using base quote price
  const currentPrice = quotePrice || 0;

  // Derived pricing calculations from API breakdown (using base price)
  const labourCost = quoteBreakdown?.labourCost?.toFixed(2) || '140.00';
  const materialsCost = quoteBreakdown?.materialsCost?.toFixed(2) || '0.00';
  const subtotal = quoteBreakdown?.subtotal?.toFixed(2) || '0.00';
  const serviceFee = quoteBreakdown?.serviceFee?.toFixed(2) || '0.00';
  const totalBeforeVAT = quoteBreakdown?.totalBeforeVAT?.toFixed(2) || '0.00';
  const vat = quoteBreakdown?.vat?.toFixed(2) || '0.00';
  const totalIncVat = currentPrice.toFixed(2);

  const fullPaymentPrice = currentPrice ? (currentPrice * 0.95).toFixed(2) : '0.00';
  const depositPaymentPrice = currentPrice ? (currentPrice * 0.2).toFixed(2) : '0.00';
  const remainingOnCompletion = currentPrice ? (currentPrice * 0.8).toFixed(2) : '0.00';
  const splitPaymentPrice = currentPrice ? (currentPrice / 3).toFixed(2) : '0.00';

  // Update the displayPrice function to use individual company prices
  const displayPrice = (type: 'OEM' | 'OEE' | null, companyName: string) => {
    // Don't show price if no glass type is selected
    if (!type) {
      return <span className="text-gray-500 text-sm">Select glass type</span>;
    }
    
    if (!quotePrice || companyPrices.length === 0) {
      return <span className="text-gray-500">Calculating...</span>;
    }
    
    // Find the specific company price
    const company = companyPrices.find(c => c.name === companyName);
    if (!company) {
      return <span className="text-gray-500">Price unavailable</span>;
    }
    
    return <span className="text-2xl font-bold text-gray-800">£{company.price.toFixed(2)}</span>;
  };

  // Add helper methods for displaying different price values with loading states
  const displayPriceValue = (value: string, loading: boolean = false) => {
    // Don't show price breakdown values if no glass type is selected
    if (!glassType) {
      return <span className="text-gray-400">-</span>;
    }
    
    if (loading || !quoteBreakdown) {
      return <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>;
    }
    return <span>£{value}</span>;
  };

  // Helper function to get human-readable window names
  const getWindowDisplayName = (windowId: string): string => {
    const windowNames: Record<string, string> = {
      'jqvmap1_ws': 'Front Windscreen',
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
    return windowNames[windowId] || windowId;
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0FB8C1]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Header with Logo */}
      <header className="bg-white py-4 px-4 border-b shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center justify-between">
            <div className="relative w-[200px] sm:w-[300px] h-[60px] sm:h-[90px]">
              <Image
                src="/WCLOGO.jpg"
                alt="Windscreen Compare Logo"
                width={250}
                height={600}
                style={{
                  objectFit: 'contain',
                  width: '100%',
                  height: '100%',
                }}
                priority
              />
            </div>
            <div className="hidden md:block">
              <p className="text-gray-600">Need help? Call us at</p>
              <p className="text-[#0FB8C1] font-bold text-xl">+44 20 3882 8574</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold w-full sm:w-[200px] mb-4 sm:mb-0">Quote</h2>
            
            <div className="flex-1 flex items-center justify-center w-full sm:w-auto">
              <div className="flex items-center justify-center w-full sm:w-[600px]">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center relative">
                      <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 bg-white z-10 ${
                        step <= 4 ? 'border-[#0FB8C1] text-[#0FB8C1]' : 'border-gray-300 text-gray-300'
                      }`}>
                        {step}
                      </div>
                      <span className="text-xs text-gray-500 mt-1 absolute -bottom-6 w-max">
                        {step === 1 ? 'Vehicle' : 
                         step === 2 ? 'Damage' : 
                         step === 3 ? 'Details' : 
                         'Payment'}
                      </span>
                    </div>
                    {step < 4 && (
                      <div className={`h-[2px] flex-1 ${
                        step <= 4 ? 'bg-[#0FB8C1]' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quote Content */}
          <div className="grid md:grid-cols-3 gap-8">
            {/* Main Quote Section */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                {(isLoading || isLoadingQuoteData) ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0FB8C1]" />
                    <p className="text-gray-600 mt-4">
                      {isLoadingQuoteData ? 'Loading your quote...' : 'Comparing prices from local technicians...'}
                    </p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 text-lg mb-4">{error}</p>
                    <button
                      onClick={handleRestart}
                      className="px-6 py-3 bg-[#0FB8C1] text-white rounded-full text-sm font-semibold hover:bg-[#0DA6AE] transition duration-300"
                    >
                      Start Over
                    </button>
                  </div>
                ) : isExpired ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 text-lg mb-4">Quote has expired</p>
                    <button
                      onClick={handleRestart}
                      className="px-6 py-3 bg-[#0FB8C1] text-white rounded-full text-sm font-semibold hover:bg-[#0DA6AE] transition duration-300"
                    >
                      Start New Quote
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="mb-8">
                      <h3 className="text-2xl font-bold text-gray-800 mb-6">Compare Local Technician Quotes</h3>
                      
                      {/* Glass Type Selection */}
                      <div className="bg-gray-50 rounded-xl p-4 mb-6">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-700">Glass Type</h4>
                          <div className="text-sm text-gray-500">Select your preferred glass type</div>
                        </div>
                        <div className="flex space-x-4">
                          <button
                            onClick={() => handleGlassTypeChange('OEE')}
                            className={`flex-1 relative py-2 px-4 rounded-lg transition-all ${
                              glassType === 'OEE'
                                ? 'bg-[#0FB8C1] text-white shadow-md'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#0FB8C1]'
                            }`}
                          >
                            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                                Recommended
                              </span>
                            </div>
                            <div className="font-medium mt-1">OEE Glass</div>
                            <div className="text-xs mt-1 opacity-80">Original Equipment Equivalent</div>
                          </button>
                          <button
                            onClick={() => handleGlassTypeChange('OEM')}
                            className={`flex-1 py-2 px-4 rounded-lg transition-all ${
                              glassType === 'OEM'
                                ? 'bg-[#0FB8C1] text-white shadow-md'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#0FB8C1]'
                            }`}
                          >
                            <div className="font-medium">OEM Glass</div>
                            <div className="text-xs mt-1 opacity-80">Original Equipment Manufacturer</div>
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          {glassType === 'OEE' 
                            ? 'OEE glass is manufactured to the same standards as OEM glass but by alternative suppliers, offering good value.'
                            : glassType === 'OEM'
                              ? 'OEM glass is made by the original manufacturer, identical to what came with your vehicle.'
                              : 'Please select a glass type to continue. We recommend OEE for the best value.'}
                        </div>
                      </div>

                      {/* ADAS Calibration Selection */}
                      {glassType && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 mb-6 shadow-sm">
                          <div className="flex items-center justify-center mb-4">
                            <div className="flex items-center">
                              <h4 className="text-lg font-semibold text-gray-800">Are you interested in ADAS Calibration?</h4>
                              <div className="relative group ml-3">
                                <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center cursor-help shadow-md border-2 border-blue-200">
                                  <svg className="w-4 h-4 text-white font-bold" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded-lg py-3 px-4 w-72 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 shadow-lg">
                                  <div className="text-center leading-relaxed">
                                    Modern vehicles have safety systems (lane assist, automatic braking, etc.) that rely on cameras behind the windscreen. After replacement, these systems need recalibration to work properly and keep you safe.
                                  </div>
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex space-x-4 max-w-sm mx-auto">
                            <button
                              onClick={() => {
                                setAdasCalibration('yes');
                                updateQuoteSettings(glassType, 'yes');
                              }}
                              className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                                adasCalibration === 'yes'
                                  ? 'bg-[#0FB8C1] text-white shadow-lg'
                                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-[#0FB8C1] hover:text-[#0FB8C1] shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                Yes, I'm interested
                              </div>
                            </button>
                            <button
                              onClick={() => {
                                setAdasCalibration('no');
                                updateQuoteSettings(glassType, 'no');
                              }}
                              className={`flex-1 py-3 px-6 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${
                                adasCalibration === 'no'
                                  ? 'bg-gray-600 text-white shadow-lg'
                                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-400 hover:text-gray-800 shadow-sm'
                              }`}
                            >
                              <div className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                No, not needed
                              </div>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Message to remind users to select glass type */}
                      {!glassType && (
                        <div className="mb-6">
                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                            <p className="text-orange-700 font-medium">Please select a glass type above to continue</p>
                          </div>
                        </div>
                      )}

                      {quotePrice && !isExpired && (
                        <div>
                          {/* Quote Display - Compact Design */}
                          <div className="text-center mb-8">
                            <div className="bg-white rounded-xl p-6 shadow-md max-w-lg mx-auto">
                              {/* Title */}
                              <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Quote is Ready</h2>
                              
                              {/* Price */}
                              <div className="mb-4">
                                {!glassType ? (
                                  <div className="h-12 w-36 bg-gray-200 animate-pulse rounded-lg mx-auto"></div>
                                ) : (
                                  <div className="text-4xl font-bold text-[#0FB8C1] tracking-tight">
                                    £{quotePrice.toFixed(2)}
                                  </div>
                                )}
                              </div>

                              {/* Quote Expiry Timer */}
                              <div className="flex items-center justify-center mb-6 text-orange-500">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs">Quote expires in {formatTime(countdown)}</span>
                              </div>

                              {/* Service Type Selection */}
                              <div className="flex gap-3 mb-6 justify-center">
                                <button
                                  onClick={() => handleDeliveryTypeChange('standard')}
                                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm ${
                                    deliveryType === 'standard'
                                      ? 'bg-yellow-100 border-yellow-400 text-gray-800 font-semibold'
                                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  Standard Service
                                </button>
                                <button
                                  onClick={() => handleDeliveryTypeChange('express')}
                                  className={`px-4 py-2 rounded-lg border-2 transition-all relative text-sm ${
                                    deliveryType === 'express'
                                      ? 'bg-gray-100 border-gray-400 text-gray-800 font-semibold'
                                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300'
                                  }`}
                                >
                                  Express (+£90)
                                  {deliveryType === 'express' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
                                      <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              </div>

                              {deliveryType === 'express' && (
                                <div className="text-xs text-gray-600 mb-6 bg-gray-50 rounded-md p-2">
                                  Priority + VIP Service
                                </div>
                              )}

                              {/* Price Range Indicator */}
                              <div className="mb-6">
                                <div className="flex justify-between text-xs text-gray-600 mb-1">
                                  <span>Lower Range</span>
                                  <span>Average</span>
                                  <span>Higher Range</span>
                                </div>
                                <div className="relative">
                                  <div className="h-2 bg-gradient-to-r from-green-300 via-yellow-300 to-red-300 rounded-full"></div>
                                  <div 
                                    className="absolute top-0 w-0.5 h-2 bg-[#0FB8C1] rounded-full"
                                    style={{ left: '20%' }}
                                  ></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-600 mt-1">
                                  <span>£100</span>
                                  <span>£1000</span>
                                </div>
                              </div>

                              {/* Glass Type Info */}
                              {glassType && (
                                <div className="text-xs text-gray-600 bg-blue-50 rounded-md p-2">
                                  {glassType} Glass - Professional Installation
                                </div>
                              )}
                            </div>
                          </div>

                          {/* COMMENTED OUT: Company Comparison Section - can be restored later if needed */}

                          {/* Enhanced Service & Pricing Overview Box */}
                          <div className="max-w-md mx-auto bg-white rounded-xl p-6 mb-8 border-2 border-[#0FB8C1]/20 shadow-lg">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-8 h-8 bg-[#0FB8C1] rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                                </svg>
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Service Summary</h3>
                            </div>

                            {/* Selected Windows Overview */}
                            {(fetchedQuoteData || parsedData)?.selectedWindows && (
                              <div className="mb-6 bg-blue-50 rounded-lg p-4">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                                  <svg className="w-4 h-4 text-[#0FB8C1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                  Glass Services Included:
                                </h4>
                                <div className="space-y-2">
                                  {(fetchedQuoteData || parsedData).selectedWindows?.map((windowId: string) => {
                                    const windowName = getWindowDisplayName(windowId);
                                    const damageType = (fetchedQuoteData || parsedData).windowDamage?.[windowId];
                                    const glassColor = (fetchedQuoteData || parsedData).glassColor?.[windowId];
                                    
                                    return (
                                      <div key={windowId} className="flex items-center justify-between text-sm bg-white rounded-md p-2 border">
                                        <div className="flex flex-col">
                                          <span className="font-medium text-gray-800">{windowName}</span>
                                          <div className="flex gap-2 text-xs text-gray-600">
                                            {damageType && (
                                              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                                {damageType}
                                              </span>
                                            )}
                                            {glassColor && glassColor !== 'Manufacturer Standard' && (
                                              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                                {glassColor}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                        <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded font-medium">
                                          {damageType === 'Chipped' ? 'Repair' : 'Replace'}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                
                                {/* Glass Type & Features */}
                                <div className="mt-3 pt-3 border-t border-blue-200">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600">Glass Type:</span>
                                    <span className="font-medium text-[#0FB8C1]">
                                      {glassType || 'OEE'} Glass {glassType === 'OEM' ? '(Premium)' : '(Standard)'}
                                    </span>
                                  </div>
                                  {(fetchedQuoteData || parsedData)?.specifications?.length > 0 && (
                                    <div className="flex items-start justify-between text-sm mt-2">
                                      <span className="text-gray-600">Features:</span>
                                      <div className="flex flex-wrap gap-1 max-w-32">
                                        {(fetchedQuoteData || parsedData).specifications.map((spec: string) => (
                                          <span key={spec} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                            {spec}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Price Breakdown */}
                            <button
                              onClick={() => setIsQuoteDetailsCollapsed(!isQuoteDetailsCollapsed)}
                              className="w-full flex items-center justify-between text-left mb-4"
                            >
                              <span className="font-semibold text-gray-900">Price Breakdown</span>
                              <svg
                                className={`w-5 h-5 transform transition-transform ${isQuoteDetailsCollapsed ? 'rotate-180' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>

                            {!isQuoteDetailsCollapsed && (
                              <div className="space-y-3 text-sm">
                                {/* Labor Breakdown */}
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-700">Labor & Service</span>
                                    {displayPriceValue(labourCost)}
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    {/* Show multiple windows notice */}
                                    {(fetchedQuoteData || parsedData)?.selectedWindows && (fetchedQuoteData || parsedData).selectedWindows.length > 1 && (
                                      <div className="flex justify-between font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                        <span>• Multiple Windows ({(fetchedQuoteData || parsedData).selectedWindows.length})</span>
                                        <span>Extended Service</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span>• Professional Installation</span>
                                      <span>£{Math.round(parseFloat(labourCost) * 0.7).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>• Mobile Service & Tools</span>
                                      <span>£{Math.round(parseFloat(labourCost) * 0.2).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span>• Quality Assurance</span>
                                      <span>£{Math.round(parseFloat(labourCost) * 0.1).toFixed(2)}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Materials Breakdown */}
                                <div className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-gray-700">Materials & Glass</span>
                                    {displayPriceValue(materialsCost)}
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    {/* Show individual window costs if available */}
                                    {baseQuoteData?.windowBreakdown && baseQuoteData.windowBreakdown.length > 0 ? (
                                      baseQuoteData.windowBreakdown.map((window: WindowCost) => (
                                        <div key={window.windowId} className="flex justify-between">
                                          <span>• {window.name}</span>
                                          <span>£{window.totalCost}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <>
                                        <div className="flex justify-between">
                                          <span>• Glass & Sealants</span>
                                          <span>£{Math.round(parseFloat(materialsCost) * 0.8).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span>• Installation Materials</span>
                                          <span>£{Math.round(parseFloat(materialsCost) * 0.2).toFixed(2)}</span>
                                        </div>
                                      </>
                                    )}
                                    {glassType === 'OEM' && (
                                      <div className="flex justify-between font-medium text-orange-600">
                                        <span>• Premium Glass Upgrade (+40%)</span>
                                        <span>+£{Math.round((parseFloat(materialsCost) * 0.4) * 100) / 100}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Other Costs */}
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span>Service Fee (20%)</span>
                                    {displayPriceValue(serviceFee)}
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    {displayPriceValue(totalBeforeVAT)}
                                  </div>
                                  <div className="flex justify-between">
                                    <span>VAT (20%)</span>
                                    {displayPriceValue(vat)}
                                  </div>
                                  {deliveryType === 'express' && (
                                    <div className="flex justify-between text-orange-600">
                                      <span>Express Service</span>
                                      <span>+£90.00</span>
                                    </div>
                                  )}
                                </div>

                                <div className="pt-3 border-t border-gray-200">
                                  <div className="flex justify-between font-bold text-lg">
                                    <span>Total (inc. VAT)</span>
                                    {displayPriceValue(totalIncVat)}
                                  </div>
                                </div>
                              </div>
                            )}


                          </div>



                          {/* Payment Options */}
                          <div className="mb-8">
                            <div className="grid grid-cols-3 gap-4">
                              {/* Pay in Full Option */}
                              <button
                                onClick={() => setPaymentType('full')}
                                className={`relative p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                                  paymentType === 'full'
                                    ? 'border-[#0FB8C1] bg-[#F8FDFD]'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="absolute -top-3 left-4">
                                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                                    Save 5%
                                  </span>
                                </div>
                                <div className="flex flex-col h-full pt-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-5 h-5 text-[#0FB8C1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 8h6m-5 0a3 3 0 110 6H9l3 3m-3-6h6m6 1a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="font-semibold text-gray-800">Pay in Full</div>
                                  </div>
                                  <div className="text-sm text-gray-500 mb-3">One-time payment</div>
                                  <div className="text-2xl font-bold text-gray-800 mb-1">
                                    {!glassType 
                                      ? <div className="h-8 w-28 bg-gray-200 animate-pulse rounded-md"></div>
                                      : `£${fullPaymentPrice}`}
                                  </div>
                                  <div className="text-xs text-gray-500 line-through">
                                    {!glassType 
                                      ? <div className="h-3 w-16 bg-gray-100 animate-pulse rounded"></div>
                                      : `£${quotePrice ? quotePrice.toFixed(2) : '0.00'}`}
                                  </div>
                                </div>
                              </button>
                              
                              {/* Pay Deposit Option */}
                              <button
                                onClick={() => setPaymentType('deposit')}
                                className={`relative p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                                  paymentType === 'deposit'
                                    ? 'border-[#0FB8C1] bg-[#F8FDFD]'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="absolute -top-3 left-4">
                                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
                                    Most Popular
                                  </span>
                                </div>
                                <div className="flex flex-col h-full pt-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-5 h-5 text-[#0FB8C1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                    </svg>
                                    <div className="font-semibold text-gray-800">Pay Deposit</div>
                                  </div>
                                  <div className="text-sm text-gray-500 mb-3">20% now, rest on completion</div>
                                  <div className="text-2xl font-bold text-gray-800 mb-1">
                                    {!glassType 
                                      ? <div className="h-8 w-28 bg-gray-200 animate-pulse rounded-md"></div>
                                      : `£${depositPaymentPrice}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {!glassType 
                                      ? <div className="h-3 w-24 bg-gray-100 animate-pulse rounded"></div>
                                      : `+ £${remainingOnCompletion} on completion`}
                                  </div>
                                </div>
                              </button>
                              
                              {/* Split Payment Option */}
                              <button
                                onClick={() => setPaymentType('split')}
                                className={`relative p-5 rounded-xl border-2 transition-all hover:shadow-md ${
                                  paymentType === 'split'
                                    ? 'border-[#0FB8C1] bg-[#F8FDFD]'
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                              >
                                <div className="absolute -top-3 left-4">
                                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">
                                    0% Interest
                                  </span>
                                </div>
                                <div className="flex flex-col h-full pt-2">
                                  <div className="flex items-center gap-2 mb-1">
                                    <svg className="w-5 h-5 text-[#0FB8C1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    <div className="font-semibold text-gray-800">Split Payment</div>
                                  </div>
                                  <div className="text-sm text-gray-500 mb-3">3 monthly payments</div>
                                  <div className="text-2xl font-bold text-gray-800 mb-1">
                                    {!glassType 
                                      ? <div className="h-8 w-28 bg-gray-200 animate-pulse rounded-md"></div>
                                      : `£${splitPaymentPrice}`}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {!glassType 
                                      ? <div className="h-3 w-24 bg-gray-100 animate-pulse rounded"></div>
                                      : `per month for 3 months`}
                                  </div>
                                </div>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Why Choose Us and Google Reviews - Only visible on mobile */}
              <div className="md:hidden mb-8">
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-6">Why Choose Us?</h3>
                  <ul className="space-y-4 mb-8">
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-gray-600">Experienced Technicians</span>
                    </li>
                    <li className="flex items-start">
                      <svg 
                        className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                        />
                      </svg>
                      <span className="text-gray-600">Glass Match Verification</span>
                    </li>
                    <li className="flex items-start">
                      <svg className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      <span className="text-gray-600">Online Price Guarantee</span>
                    </li>
                    <li className="flex items-start">
                      <svg 
                        className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                      <span className="text-gray-600">Fast Service</span>
                    </li>
                  </ul>

                  {/* Google Reviews Section */}
                  <div className="text-center">
                    <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                      <div className="flex items-center justify-center mb-3">
                        <svg className="h-6 w-6 mr-2" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                          <path fill="none" d="M0 0h48v48H0z"/>
                        </svg>
                        <span className="text-lg font-medium text-gray-800">Google Rating</span>
                      </div>
                      
                      <div className="flex items-center justify-center mb-4">
                        <div className="mr-3">
                          <span className="text-[#1a73e8] text-5xl font-semibold">4.9</span>
                        </div>
                        <div className="flex flex-col items-start">
                          <div className="flex mb-1">
                            {[...Array(5)].map((_, index) => (
                              <svg
                                key={index}
                                className="w-6 h-6 text-[#fbbc05]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                              </svg>
                            ))}
                          </div>
                          <p className="text-sm text-gray-500 font-medium">Based on 200+ reviews</p>
                        </div>
                      </div>

                      <div className="inline-flex items-center px-3 py-1 bg-gray-50 rounded-lg">
                        <span className="text-sm text-gray-600 font-medium">Verified Google Reviews</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Stripe Payment Box - Only visible on mobile */}
              <div className="md:hidden mb-8">
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  {quotePrice && !isExpired && (
                    <div className="mb-8">
                      <Elements 
                        stripe={stripePromise} 
                        options={{
                          mode: 'payment',
                          amount: paymentType === 'full' 
                            ? Math.round(currentPrice * 0.95 * 100)
                            : paymentType === 'deposit' 
                              ? Math.round(currentPrice * 0.2 * 100)
                              : Math.round((currentPrice / 3) * 100),
                          currency: 'gbp',
                          appearance,
                        }}
                      >
                        <CheckoutForm 
                          amount={paymentType === 'full' 
                            ? currentPrice * 0.95
                            : paymentType === 'deposit' 
                              ? currentPrice * 0.2
                              : currentPrice / 3}
                          paymentType={paymentType}
                          isDisabled={!glassType}
                          customerEmail={displayedContactDetails.email}
                          quoteId={router.query.quoteID as string || parsedData.quoteID}
                          totalPrice={currentPrice}
                        />
                      </Elements>
                    </div>
                  )}
                </div>
              </div>

              {/* Quote Details Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Quote Details</h3>
                  <button
                    onClick={() => setIsQuoteDetailsCollapsed(!isQuoteDetailsCollapsed)}
                    className="flex items-center text-gray-600 hover:text-gray-800 transition-colors duration-200"
                  >
                    <span className="text-sm mr-2">
                      {isQuoteDetailsCollapsed ? 'Show Details' : 'Hide Details'}
                    </span>
                    <svg
                      className={`w-5 h-5 transform transition-transform duration-200 ${isQuoteDetailsCollapsed ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Appointment Details - Always Visible */}
                <div className="pb-6 border-b relative">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-800">Appointment Details</h4>
                    <div className="absolute right-0 top-0">
                      <button
                        onClick={() => setIsEditingAppointment(!isEditingAppointment)}
                        className="text-sm text-[#0FB8C1] hover:text-[#0DA6AE] transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {isEditingAppointment ? 'Cancel' : 'Edit'}
                      </button>
                    </div>
                  </div>

                  {isEditingAppointment ? (
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleUpdateAppointment();
                    }} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Appointment Date</p>
                          <input
                            type="date"
                            value={editedAppointmentData.date}
                            onChange={(e) => setEditedAppointmentData({ ...editedAppointmentData, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                            required
                          />
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Time Slot</p>
                          <select
                            value={editedAppointmentData.timeSlot}
                            onChange={(e) => setEditedAppointmentData({ ...editedAppointmentData, timeSlot: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                            required
                          >
                            <option value="">Select Time Slot</option>
                            <option value="any">Any time</option>
                            <option value="8am-11am">8:00 AM - 11:00 AM</option>
                            <option value="11am-2pm">11:00 AM - 2:00 PM</option>
                            <option value="2pm-5pm">2:00 PM - 5:00 PM</option>
                            <option value="5pm-8pm">5:00 PM - 8:00 PM</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-4 mt-4">
                        <button
                          type="button"
                          onClick={() => setIsEditingAppointment(false)}
                          className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 bg-[#0FB8C1] text-white rounded-lg hover:bg-[#0DA6AE] transition-colors duration-200"
                        >
                          Update Appointment
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Appointment Date</p>
                        <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                          {displayedContactDetails.date || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Time Slot</p>
                        <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                          {displayedContactDetails.timeSlot || 'Not specified'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Collapsible Details Section */}
                <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isQuoteDetailsCollapsed ? 'max-h-0 opacity-0' : 'max-h-none opacity-100'}`}>
                  <div className="space-y-6 pt-6">
                  {/* Vehicle and Windows Section */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Vehicle Registration</p>
                      <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                          {(fetchedQuoteData || parsedData).vehicleReg}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Selected Damage</p>
                      <div className="flex flex-wrap gap-2">
                          {(fetchedQuoteData || parsedData).selectedWindows.length ? (
                            (fetchedQuoteData || parsedData).selectedWindows.map((window: string) => (
                            <span key={window} className="bg-pink-100 text-pink-800 px-3 py-2 rounded-lg text-sm font-semibold">
                              {windowNameMapping[window] || window}
                            </span>
                          ))
                        ) : (
                          <span className="italic text-gray-500">No windows selected</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Details Section */}
                    {((fetchedQuoteData || parsedData).contactDetails) && (
                    <div className="grid md:grid-cols-2 gap-6 pt-6 border-t relative">
                      <div className="absolute right-0 top-6">
                        <button
                          onClick={() => setIsEditingContact(!isEditingContact)}
                          className="text-sm text-[#0FB8C1] hover:text-[#0DA6AE] transition-colors duration-200 flex items-center"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          {isEditingContact ? 'Cancel' : 'Edit'}
                        </button>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Full Name</p>
                        {isEditingContact ? (
                          <input
                            type="text"
                            value={editedContactData.fullName}
                            onChange={(e) => setEditedContactData({ ...editedContactData, fullName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                          />
                        ) : (
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {displayedContactDetails.fullName}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 mb-1">Email</p>
                        {isEditingContact ? (
                          <input
                            type="email"
                            value={editedContactData.email}
                            onChange={(e) => setEditedContactData({ ...editedContactData, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                          />
                        ) : (
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {displayedContactDetails.email}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 mb-1">Mobile</p>
                        {isEditingContact ? (
                          <input
                            type="tel"
                            value={editedContactData.mobile}
                            onChange={(e) => setEditedContactData({ ...editedContactData, mobile: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                          />
                        ) : (
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {displayedContactDetails.mobile}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 mb-1">Postcode</p>
                        {isEditingContact ? (
                          <input
                            type="text"
                            value={editedContactData.postcode}
                            onChange={(e) => setEditedContactData({ ...editedContactData, postcode: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                          />
                        ) : (
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {displayedContactDetails.postcode}
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 mb-1">Vehicle Address</p>
                        {isEditingContact ? (
                          <input
                            type="text"
                            value={editedContactData.location}
                            onChange={(e) => setEditedContactData({ ...editedContactData, location: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                          />
                        ) : (
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {displayedContactDetails.location}
                          </div>
                        )}
                      </div>

                      {isEditingContact && (
                        <div className="md:col-span-2 flex justify-end space-x-4 mt-4">
                          <button
                            onClick={() => setIsEditingContact(false)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleUpdateContact}
                            className="px-4 py-2 bg-[#0FB8C1] text-white rounded-lg hover:bg-[#0DA6AE] transition-colors duration-200"
                          >
                            Save Changes
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Details */}
                  <div className="pt-6 border-t">
                    <p className="text-sm text-gray-500 mb-1">Payment Option</p>
                    <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold capitalize">
                      {parsedData.paymentOption}
                    </div>
                    
                      {(fetchedQuoteData || parsedData).paymentOption === 'insurance' && (fetchedQuoteData || parsedData).insuranceDetails && (
                      <div className="mt-4 grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Insurance Provider</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                              {(fetchedQuoteData || parsedData).insuranceDetails.provider || (fetchedQuoteData || parsedData).insuranceDetails.insuranceProvider}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Policy Number</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                              {(fetchedQuoteData || parsedData).insuranceDetails.policyNumber}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Incident Date</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                              {(fetchedQuoteData || parsedData).insuranceDetails.incidentDate}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Policy Excess Amount</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                              £{(fetchedQuoteData || parsedData).insuranceDetails.excessAmount || (fetchedQuoteData || parsedData).insuranceDetails.policyExcessAmount}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Policy Expiry Date</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                              {(fetchedQuoteData || parsedData).insuranceDetails.expiryDate || (fetchedQuoteData || parsedData).insuranceDetails.policyExpiryDate}
                          </div>
                        </div>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar - Hidden on mobile */}
            <div className="hidden md:block md:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-4">
                {/* Desktop Stripe Payment Box - Only visible on desktop */}
                <div className="hidden md:block">
                  {quotePrice && !isExpired && (
                    <div className="mb-8">
                      <Elements 
                        stripe={stripePromise} 
                        options={{
                          mode: 'payment',
                          amount: paymentType === 'full' 
                            ? Math.round(currentPrice * 0.95 * 100)
                            : paymentType === 'deposit' 
                              ? Math.round(currentPrice * 0.2 * 100)
                              : Math.round((currentPrice / 3) * 100),
                          currency: 'gbp',
                          appearance,
                        }}
                      >
                        <CheckoutForm 
                          amount={paymentType === 'full' 
                            ? currentPrice * 0.95
                            : paymentType === 'deposit' 
                              ? currentPrice * 0.2
                              : currentPrice / 3}
                          paymentType={paymentType}
                          isDisabled={!glassType}
                          customerEmail={displayedContactDetails.email}
                          quoteId={router.query.quoteID as string || parsedData.quoteID}
                          totalPrice={currentPrice}
                        />
                      </Elements>
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-6">Why Choose Us?</h3>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-600">Experienced Technicians</span>
                  </li>
                  <li className="flex items-start">
                    <svg 
                      className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    <span className="text-gray-600">Glass Match Verification</span>
                  </li>
                  <li className="flex items-start">
                    <svg className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="text-gray-600">Online Price Guarantee</span>
                  </li>
                  <li className="flex items-start">
                    <svg 
                      className="w-5 h-5 text-[#0FB8C1] mr-3 mt-0.5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth="2" 
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                    <span className="text-gray-600">Fast Service</span>
                  </li>
                </ul>

                <div className="text-center mb-8">
                  <div className="bg-white rounded-xl p-6 shadow-md border border-gray-100">
                    <div className="flex items-center justify-center mb-3">
                      <svg className="h-6 w-6 mr-2" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                        <path fill="none" d="M0 0h48v48H0z"/>
                      </svg>
                      <span className="text-lg font-medium text-gray-800">Google Rating</span>
                    </div>
                    
                    <div className="flex items-center justify-center mb-4">
                      <div className="mr-3">
                        <span className="text-[#1a73e8] text-5xl font-semibold">4.9</span>
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="flex mb-1">
                          {[...Array(5)].map((_, index) => (
                            <svg
                              key={index}
                              className="w-6 h-6 text-[#fbbc05]"
                              fill="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Based on 200+ reviews</p>
                      </div>
                    </div>

                    <div className="inline-flex items-center px-3 py-1 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-600 font-medium">Verified Google Reviews</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-800 mb-6">Need Help?</h3>
                <div className="space-y-6">
                  <div className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>+44 20 3882 8574</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>hello@windscreencompare.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Enhanced Footer */}
      <footer className="bg-gray-800 text-white py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="font-bold mb-4 text-[#0FB8C1]">INFO</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-[#0FB8C1] transition">Windscreen Replacement</Link></li>
                <li><Link href="#" className="hover:text-[#0FB8C1] transition">Car Manufacturers</Link></li>
              </ul>
            </div>
            {/* ... other footer columns remain the same ... */}
          </div>
          <div className="mt-12 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
            © {new Date().getFullYear()} Windscreen Compare. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default QuotePage;







