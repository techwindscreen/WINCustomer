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

const CheckoutForm = ({ amount, paymentType }: { amount: number, paymentType: 'full' | 'deposit' | 'split' }) => {
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
      body: JSON.stringify({ amount }),
    });

    const { clientSecret } = await response.json();

    const { error: paymentError } = await stripe.confirmPayment({
      elements,
      clientSecret,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
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
        disabled={!stripe || processing}
        className="w-full py-4 bg-[#0FB8C1] text-white rounded-xl text-lg font-semibold hover:bg-[#0DA6AE] transition duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50"
      >
        {processing ? 'Processing...' : `Pay ${paymentType === 'full' ? 'in Full' : paymentType === 'deposit' ? 'Deposit' : 'Split Payment'} Now`}
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

const QuotePage: React.FC = () => {
  const router = useRouter();
  const { vehicleReg, selectedWindows, windowDamage, specifications, paymentOption, insuranceDetails, contactDetails, quoteID, glassType } = router.query;

  const parsedData = {
    vehicleReg: vehicleReg as string,
    quoteID: quoteID as string,
    selectedWindows: JSON.parse(selectedWindows as string || '[]'),
    windowDamage: JSON.parse(windowDamage as string || '{}'),
    specifications: JSON.parse(specifications as string || '[]'),
    paymentOption: paymentOption as 'self' | 'insurance',
    insuranceDetails: insuranceDetails ? JSON.parse(insuranceDetails as string) : null,
    contactDetails: contactDetails ? JSON.parse(contactDetails as string) : null,
    glassType: glassType as string
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quoteRange] = useState({
    min: 100,
    max: 1000,
    average: 550
  });
  const [deliveryType, setDeliveryType] = useState<'standard' | 'express'>('standard');
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [recordId, setRecordId] = useState<string | null>(null);

  const [displayedContactDetails, setDisplayedContactDetails] = useState<ContactDetails>(
    parsedData.contactDetails || {
      fullName: '',
      email: '',
      mobile: '',
      postcode: '',
      location: ''
    }
  );

  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [editedAppointmentData, setEditedAppointmentData] = useState({
    date: parsedData.contactDetails?.date || '',
    timeSlot: parsedData.contactDetails?.timeSlot || ''
  });

  const [isExpired, setIsExpired] = useState(false);
  const [paymentType, setPaymentType] = useState<'full' | 'deposit' | 'split'>('full');
  const [isPriceBreakdownOpen, setIsPriceBreakdownOpen] = useState(false);

  useEffect(() => {
    if (parsedData.vehicleReg) {
      calculateQuoteWithType(deliveryType);
    }
  }, [parsedData.vehicleReg]);

  useEffect(() => {
    if (!isLoading && quotePrice) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
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
  }, [isLoading, quotePrice]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateQuoteWithType = async (type: 'standard' | 'express') => {
    try {
      setIsLoading(true);
      setQuotePrice(null);
      
      const response = await fetch('/api/calculate-quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleDetails: {
            registration: parsedData.vehicleReg,
          },
          windowSpecifications: Array.isArray(parsedData.specifications) 
            ? parsedData.specifications 
            : [],
          deliveryType: type,
          quoteId: router.query.quoteID
        }),
      });

      const responseText = await response.text();
      console.log('Quote Response:', response.status, responseText);

      if (!response.ok) {
        throw new Error(`Failed to calculate quote: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      setQuotePrice(data.price);
    } catch (err) {
      console.error('Quote error:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    try {
      // Create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: quotePrice,
          vehicleReg: parsedData.vehicleReg,
          selectedWindows: parsedData.selectedWindows,
          specifications: parsedData.specifications,
        }),
      });

      const session = await response.json();

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
      const quoteID = router.query.quoteID || parsedData.quoteID;
      if (!quoteID) {
        console.error('Missing quoteID. Router query:', router.query);
        console.error('Parsed data:', parsedData);
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

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Enhanced Header */}
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

      {/* Enhanced Navigation */}
      <nav className="bg-[#0FB8C1] text-white shadow-lg relative z-10">
        <div className="container mx-auto px-4">
          <ul className="flex overflow-x-auto whitespace-nowrap md:justify-between py-3 text-sm scrollbar-hide">
            <li className="px-4"><Link href="/" className="hover:text-white/80 transition">HOME</Link></li>
            <li className="px-4"><Link href="#" className="hover:text-white/80 transition">HOW IT WORKS</Link></li>
            <li className="px-4"><Link href="#" className="hover:text-white/80 transition">FREE QUOTE</Link></li>
            <li className="px-4"><Link href="#" className="hover:text-white/80 transition">SERVICES</Link></li>
            <li className="px-4"><Link href="#" className="hover:text-white/80 transition">FAQ'S</Link></li>
            <li className="px-4"><Link href="#" className="hover:text-white/80 transition">CONTACT</Link></li>
          </ul>
        </div>
      </nav>

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
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#0FB8C1]" />
                    <p className="text-gray-600 mt-4">Calculating your quote...</p>
                  </div>
                ) : error ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                      <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-600 text-lg mb-4">{error}</p>
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
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Your Quote is Ready</h3>
                      <p className="text-4xl font-bold text-[#0FB8C1] mb-4">£{quotePrice?.toFixed(2)}</p>
                      
                      <div className="text-sm text-gray-600 mb-4">
                        {timeLeft > 0 ? (
                          <div className="flex items-center justify-center space-x-2">
                            <svg className="w-4 h-4 text-[#FF9B9B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-[#FF9B9B]">Quote expires in <span className="font-bold">{formatTime(timeLeft)}</span></span>
                          </div>
                        ) : (
                          <span className="text-red-500">Quote expired. Please refresh for a new quote.</span>
                        )}
                      </div>

                      {/* Service Options Toggle */}
                      <div className="inline-flex rounded-lg border border-gray-200 p-1 mb-8">
                        <button
                          onClick={() => handleDeliveryTypeChange('standard')}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                            deliveryType === 'standard'
                              ? 'bg-[#FFF4CC] text-gray-800'
                              : 'text-gray-500 hover:text-gray-700 hover:bg-[#FFF4CC]/50'
                          }`}
                        >
                          Standard Service
                        </button>
                        <div className="relative mx-2">
                          <div className="absolute -top-2.5 -right-2.5 z-10">
                            <span className="flex h-6 w-6">
                              <span className="animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite] absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-40"></span>
                              <span className="relative inline-flex rounded-full h-6 w-6 bg-gradient-to-r from-amber-300 to-amber-400 items-center justify-center shadow-sm">
                                <svg 
                                  className="w-3.5 h-3.5 text-amber-900" 
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    strokeWidth="2.5" 
                                    d="M13 10V3L4 14h7v7l9-11h-7z"
                                  />
                                </svg>
                              </span>
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeliveryTypeChange('express')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border-2 ${
                              deliveryType === 'express'
                                ? 'bg-[#FFF4CC] text-gray-800 border-[#FFE066]'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-[#FFF4CC]/50 border-gray-200'
                            }`}
                          >
                            Express Service (+£90)
                          </button>
                          <div className="absolute -bottom-10 left-0 right-0">
                            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-3 py-2 shadow-sm border border-gray-100">
                              <div className="flex items-center justify-center text-[10px]">
                                <span className="text-gray-500 font-medium">Priority + VIP Service</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quote Range Bar */}
                    <div className="max-w-md mx-auto mb-8">
                      {/* Simplified price headers */}
                      <div className="flex justify-between text-sm text-gray-600 mb-4">
                        <span>Lower Range</span>
                        <span>Higher Range</span>
                      </div>

                      <div className="relative">
                        {/* Main bar container */}
                        <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                          {/* Simplified gradient background */}
                          <div className="absolute inset-0 bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 opacity-20" />

                          {/* Average marker */}
                          <div 
                            className="absolute w-0.5 h-4 bg-gray-400 top-1/2 -translate-y-1/2 transition-all duration-300"
                            style={{ 
                              left: `${((quoteRange.average - quoteRange.min) / (quoteRange.max - quoteRange.min)) * 100}%`,
                              zIndex: 2 
                            }}
                          />

                          {/* Simplified Quote marker */}
                          <div 
                            className="absolute w-6 h-6 bg-white rounded-full shadow transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                            style={{ 
                              left: `${((quotePrice || 0) - quoteRange.min) / (quoteRange.max - quoteRange.min) * 100}%`,
                              top: '50%',
                              zIndex: 3,
                              border: '2px solid #0FB8C1',
                            }}
                          >
                            {/* Price tooltip */}
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                              <span className="block text-sm font-medium bg-[#0FB8C1] text-white px-2 py-1 rounded whitespace-nowrap">
                                Your Quote: £{quotePrice?.toFixed(2)}
                              </span>
                            </div>

                            {/* Center dot */}
                            <div className="w-2 h-2 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0FB8C1]" />
                          </div>
                        </div>
                      </div>

                      {/* Price range values */}
                      <div className="flex justify-between text-xs text-gray-500 mt-2">
                        <span>£{quoteRange.min}</span>
                        <span className="text-gray-400">Average: £{quoteRange.average}</span>
                        <span>£{quoteRange.max}</span>
                      </div>

                      {/* Simplified status indicator */}
                      <div className="text-center mt-4">
                        <span className="text-sm font-medium">
                          {(quotePrice || 0) < quoteRange.average ? (
                            <span className="text-green-600">Below market average - Great value!</span>
                          ) : (quotePrice || 0) === quoteRange.average ? (
                            <span className="text-gray-600">Market average price</span>
                          ) : (
                            <span className="text-blue-600">Premium service quote</span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Quote Range Bar and Price Breakdown */}
                    {quotePrice && !isExpired && (
                      <div>
                        {/* Price Breakdown Box */}
                        <div className="max-w-md mx-auto bg-gray-50 rounded-xl p-6 mb-8">
                          <button 
                            onClick={() => setIsPriceBreakdownOpen(!isPriceBreakdownOpen)} 
                            className="w-full flex justify-between items-center"
                          >
                            <h3 className="text-xl text-gray-800">Price Breakdown</h3>
                            <svg 
                              className={`w-5 h-5 text-gray-600 transform transition-transform duration-200 ${
                                isPriceBreakdownOpen ? 'rotate-180' : ''
                              }`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isPriceBreakdownOpen && (
                            <div className="space-y-4 mt-4">
                              {/* Selected Windows */}
                              <div className="space-y-3">
                                {parsedData.selectedWindows.map((windowId: string) => (
                                  <div key={windowId} className="flex justify-between items-center py-2.5 border-b border-gray-200 last:border-b-0">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-gray-700">
                                        {windowNameMapping[windowId]}
                                      </span>
                                      {parsedData.windowDamage[windowId] && (
                                        <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full whitespace-nowrap">
                                          {parsedData.windowDamage[windowId]}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-medium text-gray-900">
                                      £{quotePrice ? Math.round((quotePrice - (deliveryType === 'express' ? 90 : 0)) / parsedData.selectedWindows.length) : '0'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Delivery Fee */}
                              {deliveryType === 'express' && (
                                <div className="flex justify-between items-center py-3 border-t border-gray-200">
                                  <div className="flex items-center">
                                    <span className="text-gray-700">Express Service</span>
                                    <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                      24h
                                    </span>
                                  </div>
                                  <span className="font-medium text-gray-900">£90</span>
                                </div>
                              )}

                              {/* Total */}
                              <div className="flex justify-between items-center pt-4 mt-2 border-t border-gray-300">
                                <div>
                                  <span className="text-lg font-bold text-gray-800">Total</span>
                                  <p className="text-xs text-gray-500 mt-0.5">Including VAT</p>
                                </div>
                                <span className="text-2xl font-bold text-[#0FB8C1]">
                                  £{quotePrice || '0'}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Payment Options */}
                        <div className="flex flex-col space-y-3 max-w-md mx-auto mt-8">
                          <h3 className="text-xl font-bold text-gray-800 mb-4">Choose Payment Option</h3>
                          <div 
                            onClick={() => setPaymentType('full')}
                            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow w-full ${
                              paymentType === 'full' 
                                ? 'border-[#0FB8C1] bg-gradient-to-b from-[#F7FDFD] to-white shadow-sm' 
                                : 'border-gray-200 hover:border-[#0FB8C1] bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  paymentType === 'full' ? 'border-[#0FB8C1]' : 'border-gray-300'
                                }`}>
                                  {paymentType === 'full' && <div className="w-2 h-2 rounded-full bg-[#0FB8C1]" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-800">Pay in Full</h4>
                                  <div className="bg-green-50 text-green-700 text-xs py-0.5 px-2 rounded-full mt-1">
                                    Save 5% Today
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-[#0FB8C1]">
                                  £{((quotePrice * 0.95) || 0).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">Total payment</p>
                              </div>
                            </div>
                          </div>

                          <div 
                            onClick={() => setPaymentType('deposit')}
                            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow w-full ${
                              paymentType === 'deposit' 
                                ? 'border-[#0FB8C1] bg-gradient-to-b from-[#F7FDFD] to-white shadow-sm' 
                                : 'border-gray-200 hover:border-[#0FB8C1] bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  paymentType === 'deposit' ? 'border-[#0FB8C1]' : 'border-gray-300'
                                }`}>
                                  {paymentType === 'deposit' && <div className="w-2 h-2 rounded-full bg-[#0FB8C1]" />}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium text-gray-800">Pay Deposit</h4>
                                    <span className="text-xs text-red-500 font-medium bg-red-50 px-2 py-0.5 rounded-full">
                                      Non-Refundable
                                    </span>
                                  </div>
                                  <div className="bg-blue-50 text-blue-700 text-xs py-0.5 px-2 rounded-full mt-1">
                                    20% Deposit
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-[#0FB8C1]">
                                  £{((quotePrice * 0.2) || 0).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">Pay now</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  + £{((quotePrice * 0.8) || 0).toFixed(2)} after service
                                </p>
                              </div>
                            </div>
                          </div>

                          <div 
                            onClick={() => setPaymentType('split')}
                            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 transform hover:-translate-y-0.5 hover:shadow w-full ${
                              paymentType === 'split' 
                                ? 'border-[#0FB8C1] bg-gradient-to-b from-[#F7FDFD] to-white shadow-sm' 
                                : 'border-gray-200 hover:border-[#0FB8C1] bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                  paymentType === 'split' ? 'border-[#0FB8C1]' : 'border-gray-300'
                                }`}>
                                  {paymentType === 'split' && <div className="w-2 h-2 rounded-full bg-[#0FB8C1]" />}
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-800">Split Payment</h4>
                                  <div className="bg-purple-50 text-purple-700 text-xs py-0.5 px-2 rounded-full mt-1">
                                    3 Monthly Payments
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-[#0FB8C1]">
                                  £{((quotePrice / 3) || 0).toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500">per month</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Total: £{(quotePrice || 0).toFixed(2)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
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
                            ? Math.round(quotePrice * 0.95 * 100)
                            : paymentType === 'deposit' 
                              ? Math.round(quotePrice * 0.2 * 100)
                              : Math.round(quotePrice * 100),
                          currency: 'gbp',
                          appearance,
                          paymentMethodCreation: 'manual',
                          paymentMethodTypes: paymentType === 'split' 
                            ? ['klarna', 'afterpay_clearpay']
                            : ['card', 'klarna', 'afterpay_clearpay'],
                        }}
                      >
                        <CheckoutForm 
                          amount={paymentType === 'full' 
                            ? quotePrice * 0.95
                            : paymentType === 'deposit' 
                              ? quotePrice * 0.2
                              : quotePrice}
                          paymentType={paymentType}
                        />
                      </Elements>
                    </div>
                  )}
                </div>
              </div>

              {/* Quote Details Card */}
              <div className="bg-white rounded-2xl shadow-lg p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Quote Details</h3>
                <div className="space-y-6">
                  {/* Vehicle and Windows Section */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Vehicle Registration</p>
                      <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                        {parsedData.vehicleReg}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Selected Damage</p>
                      <div className="flex flex-wrap gap-2">
                        {parsedData.selectedWindows.length ? (
                          parsedData.selectedWindows.map((window: string) => (
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
                  {parsedData.contactDetails && (
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

                  {/* Appointment Details */}
                  <div className="pt-6 border-t relative">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-gray-800">Appointment Details</h4>
                      <div className="absolute right-0 top-6">
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

                  {/* Payment Details */}
                  <div className="pt-6 border-t">
                    <p className="text-sm text-gray-500 mb-1">Payment Option</p>
                    <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold capitalize">
                      {parsedData.paymentOption}
                    </div>
                    
                    {parsedData.paymentOption === 'insurance' && parsedData.insuranceDetails && (
                      <div className="mt-4 grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Insurance Provider</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {parsedData.insuranceDetails.insuranceProvider}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Policy Number</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {parsedData.insuranceDetails.policyNumber}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Incident Date</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {parsedData.insuranceDetails.incidentDate}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Policy Excess Amount</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            £{parsedData.insuranceDetails.policyExcessAmount}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500 mb-1">Policy Expiry Date</p>
                          <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-lg text-sm font-semibold">
                            {parsedData.insuranceDetails.policyExpiryDate}
                          </div>
                        </div>
                      </div>
                    )}
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
                            ? Math.round(quotePrice * 0.95 * 100)
                            : paymentType === 'deposit' 
                              ? Math.round(quotePrice * 0.2 * 100)
                              : Math.round(quotePrice * 100),
                          currency: 'gbp',
                          appearance,
                          paymentMethodCreation: 'manual',
                          paymentMethodTypes: paymentType === 'split' 
                            ? ['klarna', 'afterpay_clearpay']
                            : ['card', 'klarna', 'afterpay_clearpay'],
                        }}
                      >
                        <CheckoutForm 
                          amount={paymentType === 'full' 
                            ? quotePrice * 0.95
                            : paymentType === 'deposit' 
                              ? quotePrice * 0.2
                              : quotePrice}
                          paymentType={paymentType}
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







