import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, Clock, Car, CreditCard, MapPin, Calendar, Phone, Mail, User, FileText, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface QuoteData {
  quoteId: string;
  email: string;
  customerName: string;
  quotePrice: number;
  vehicleReg: string;
  glassType: string;
  deliveryType: string;
  rawData: any;
}

interface CheckoutFormProps {
  amount: number;
  paymentType: 'full' | 'deposit' | 'split';
  isDisabled?: boolean;
  customerEmail?: string;
  quoteId?: string;
  totalPrice?: number;
  deliveryType?: 'standard' | 'express';
}

const CheckoutForm: React.FC<CheckoutFormProps> = ({ 
  amount, 
  paymentType, 
  isDisabled = false, 
  customerEmail, 
  quoteId, 
  totalPrice, 
  deliveryType 
}) => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayment = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      // Create a checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount,
          quoteId: quoteId,
          customerEmail: customerEmail,
          paymentType: paymentType,
          totalAmount: totalPrice || amount,
          deliveryType: deliveryType || 'standard'
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create checkout session: ${response.statusText}`);
      }
      
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
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}
      
      <Button 
        onClick={handlePayment}
        disabled={isDisabled || processing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold"
      >
        {processing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-5 w-5" />
            Pay £{amount.toFixed(2)} {paymentType === 'full' ? 'Now' : `(${paymentType})`}
          </>
        )}
      </Button>
    </div>
  );
};

const QuoteAccessPage: React.FC = () => {
  const router = useRouter();
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<'full' | 'deposit' | 'split'>('full');

  useEffect(() => {
    const { token } = router.query;

    if (token && typeof token === 'string') {
      verifyTokenAndLoadQuote(token);
    }
  }, [router.query]);

  const verifyTokenAndLoadQuote = async (token: string) => {
    try {
      setLoading(true);
      setError(null);

      // Verify the permanent magic link token
      const response = await fetch(`/api/verify-permanent-magic-link?token=${encodeURIComponent(token)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid or expired link');
      }

      const data = await response.json();
      
      if (data.success && data.quoteData) {
        setQuoteData(data.quoteData);
      } else {
        throw new Error('Failed to load quote data');
      }

    } catch (err) {
      console.error('Error verifying token:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const formatQuoteData = (rawData: any) => {
    // Helper function to safely parse JSON
    const safeJsonParse = (jsonString: string | null, fallback: any = null) => {
      if (!jsonString) return fallback;
      try {
        return JSON.parse(jsonString);
      } catch (e) {
        console.warn('Failed to parse JSON:', jsonString, e);
        return fallback;
      }
    };

    return {
      vehicleDetails: {
        registration: rawData.vehicle_reg || '',
        manufacturer: rawData.brand || '',
        model: rawData.model || '',
        year: rawData.year || '',
        colour: rawData.colour || '',
      },
      contactDetails: {
        fullName: rawData.full_name || '',
        email: rawData.email || '',
        mobile: rawData.mobile || '',
        postcode: rawData.postcode || '',
        location: rawData.location || '',
      },
      serviceDetails: {
        glassType: rawData.glass_type || 'OEE',
        deliveryType: rawData.delivery_type || 'standard',
        selectedWindows: safeJsonParse(rawData.selected_windows?.[0], []),
        windowDamage: safeJsonParse(rawData.window_damage?.[0], {}),
      },
      pricing: {
        quotePrice: rawData.quote_price || 0,
      }
    };
  };

  const getDepositAmount = (totalPrice: number) => {
    return Math.round(totalPrice * 0.3 * 100) / 100; // 30% deposit
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your quote...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => router.push('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Go to Homepage
          </Button>
        </div>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-600">Unable to load quote data.</p>
        </div>
      </div>
    );
  }

  const formattedData = formatQuoteData(quoteData.rawData);
  const depositAmount = getDepositAmount(quoteData.quotePrice);

  return (
    <>
      <Head>
        <title>Complete Your Payment - Windscreen Compare</title>
        <meta name="description" content="Complete your windscreen replacement payment" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <div className="flex items-center space-x-4">
              <Image
                src="/WCLOGO.jpg"
                alt="Windscreen Compare"
                width={60}
                height={60}
                className="rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Complete Your Payment</h1>
                <p className="text-gray-600">Quote ID: {quoteData.quoteId}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quote Details */}
            <div className="space-y-6">
              {/* Customer Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Customer Information</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{formattedData.contactDetails.email}</span>
                  </div>
                  {formattedData.contactDetails.mobile && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formattedData.contactDetails.mobile}</span>
                    </div>
                  )}
                  {formattedData.contactDetails.postcode && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formattedData.contactDetails.postcode}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vehicle Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Car className="h-5 w-5" />
                    <span>Vehicle Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-semibold text-lg">{formattedData.vehicleDetails.registration}</p>
                    <p className="text-gray-600">
                      {formattedData.vehicleDetails.manufacturer} {formattedData.vehicleDetails.model}
                    </p>
                    {formattedData.vehicleDetails.year && (
                      <p className="text-gray-600">Year: {formattedData.vehicleDetails.year}</p>
                    )}
                    {formattedData.vehicleDetails.colour && (
                      <p className="text-gray-600">Colour: {formattedData.vehicleDetails.colour}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Service Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5" />
                    <span>Service Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="font-medium">Glass Type</p>
                      <p className="text-gray-600">
                        {formattedData.serviceDetails.glassType === 'OEM' ? 'Original Equipment Manufacturer (OEM)' : 'Original Equipment Equivalent (OEE)'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">Service Type</p>
                      <p className="text-gray-600">
                        {formattedData.serviceDetails.deliveryType === 'express' ? 'Express Service' : 'Standard Service'}
                      </p>
                    </div>
                    {formattedData.serviceDetails.selectedWindows.length > 0 && (
                      <div>
                        <p className="font-medium">Selected Windows</p>
                        <p className="text-gray-600">
                          {formattedData.serviceDetails.selectedWindows.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Section */}
            <div className="space-y-6">
              {/* Price Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Payment Summary</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-lg font-medium">Total Amount</span>
                      <span className="text-2xl font-bold text-blue-600">£{quoteData.quotePrice.toFixed(2)}</span>
                    </div>
                    
                    {/* Payment Options */}
                    <div className="space-y-3">
                      <p className="font-medium text-gray-900">Choose Payment Option:</p>
                      
                      <div className="space-y-2">
                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="paymentType"
                            value="full"
                            checked={paymentType === 'full'}
                            onChange={(e) => setPaymentType(e.target.value as 'full')}
                            className="h-4 w-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium">Pay in Full</p>
                            <p className="text-sm text-gray-600">£{quoteData.quotePrice.toFixed(2)} today</p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="paymentType"
                            value="deposit"
                            checked={paymentType === 'deposit'}
                            onChange={(e) => setPaymentType(e.target.value as 'deposit')}
                            className="h-4 w-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium">Pay Deposit (30%)</p>
                            <p className="text-sm text-gray-600">
                              £{depositAmount.toFixed(2)} now, £{(quoteData.quotePrice - depositAmount).toFixed(2)} on completion
                            </p>
                          </div>
                        </label>

                        <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="paymentType"
                            value="split"
                            checked={paymentType === 'split'}
                            onChange={(e) => setPaymentType(e.target.value as 'split')}
                            className="h-4 w-4 text-blue-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium">Split Payment (Klarna)</p>
                            <p className="text-sm text-gray-600">Pay in installments with Klarna</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Complete Payment</CardTitle>
                  <CardDescription>
                    Secure payment powered by Stripe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Elements stripe={stripePromise}>
                    <CheckoutForm
                      amount={
                        paymentType === 'full' 
                          ? quoteData.quotePrice 
                          : paymentType === 'deposit' 
                            ? depositAmount 
                            : quoteData.quotePrice
                      }
                      paymentType={paymentType}
                      customerEmail={quoteData.email}
                      quoteId={quoteData.quoteId}
                      totalPrice={quoteData.quotePrice}
                      deliveryType={quoteData.deliveryType as 'standard' | 'express'}
                    />
                  </Elements>
                </CardContent>
              </Card>

              {/* Security Notice */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-green-800">Secure Payment</p>
                    <p className="text-green-700">
                      Your payment is secured with SSL encryption and processed by Stripe.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default QuoteAccessPage;