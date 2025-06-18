import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import { XCircle, RefreshCw, Phone, Home, AlertCircle } from 'lucide-react';

const PaymentFailedPage: React.FC = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');

  useEffect(() => {
    const { payment_intent, payment_intent_client_secret, redirect_status } = router.query;
    
    if (payment_intent) {
      setPaymentIntentId(payment_intent as string);
    }
    
    if (redirect_status === 'failed') {
      setErrorMessage('Your payment could not be processed. Please try again or use a different payment method.');
    } else {
      setErrorMessage('There was an issue processing your payment. Please try again.');
    }
  }, [router.query]);

  const handleRetryPayment = () => {
    // Go back to the quote page to retry payment
    router.back();
  };

  return (
    <>
      <Head>
        <title>Payment Failed - WindscreenCompare</title>
        <meta name="description" content="Payment could not be processed" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Header */}
        <header className="bg-white py-4 px-4 border-b shadow-sm">
          <div className="container mx-auto">
            <div className="flex items-center justify-between">
              <Link href="/">
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
              </Link>
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

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Error Header */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Failed</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {errorMessage}
            </p>
            {paymentIntentId && (
              <p className="text-sm text-gray-500 mt-2 font-mono">
                Reference: {paymentIntentId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Common Issues */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-semibold text-gray-900">Common Issues</h2>
              </div>
              
              <div className="space-y-4">
                <div className="border-l-4 border-orange-200 pl-4">
                  <h3 className="font-medium text-gray-900 mb-1">Insufficient Funds</h3>
                  <p className="text-gray-600 text-sm">Make sure your card has sufficient balance for the transaction.</p>
                </div>
                
                <div className="border-l-4 border-orange-200 pl-4">
                  <h3 className="font-medium text-gray-900 mb-1">Card Details</h3>
                  <p className="text-gray-600 text-sm">Check that your card number, expiry date, and CVV are correct.</p>
                </div>
                
                <div className="border-l-4 border-orange-200 pl-4">
                  <h3 className="font-medium text-gray-900 mb-1">Bank Security</h3>
                  <p className="text-gray-600 text-sm">Your bank may have blocked the transaction for security reasons.</p>
                </div>
                
                <div className="border-l-4 border-orange-200 pl-4">
                  <h3 className="font-medium text-gray-900 mb-1">Network Issues</h3>
                  <p className="text-gray-600 text-sm">Poor internet connection may have interrupted the payment process.</p>
                </div>
              </div>
            </div>

            {/* What You Can Do */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-6">
                <RefreshCw className="w-6 h-6 text-[#0FB8C1]" />
                <h2 className="text-xl font-semibold text-gray-900">What You Can Do</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#0FB8C1] text-white rounded-full flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Try Again</h3>
                    <p className="text-gray-600 text-sm">Click the retry button below to attempt the payment again.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#0FB8C1] text-white rounded-full flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Different Card</h3>
                    <p className="text-gray-600 text-sm">Try using a different payment method or card.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#0FB8C1] text-white rounded-full flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Contact Bank</h3>
                    <p className="text-gray-600 text-sm">Contact your bank if you suspect a security block.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-[#0FB8C1] text-white rounded-full flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 mb-1">Get Help</h3>
                    <p className="text-gray-600 text-sm">Contact our support team for assistance.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-12 text-center space-y-4">
            <button
              onClick={handleRetryPayment}
              className="inline-flex items-center gap-2 bg-[#0FB8C1] text-white px-8 py-3 rounded-lg hover:bg-[#0da8b0] transition-colors font-medium text-lg"
            >
              <RefreshCw className="w-5 h-5" />
              Try Payment Again
            </button>
            
            <div className="flex justify-center gap-4 mt-6">
              <Link 
                href="/" 
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                <Home className="w-4 h-4" />
                Back to Home
              </Link>
              
              <a 
                href="tel:+441234567890" 
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                <Phone className="w-4 h-4" />
                Call Support
              </a>
            </div>
          </div>

          {/* Help Section */}
          <div className="mt-12 bg-gray-100 rounded-xl p-6 text-center">
            <h3 className="font-semibold text-gray-900 mb-2">Need Immediate Help?</h3>
            <p className="text-gray-600 mb-4">
              Our customer service team is available to help you complete your booking
            </p>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">📞 01234 567890</p>
              <p className="text-gray-600 text-sm">Monday - Friday: 8AM - 6PM | Saturday: 9AM - 4PM</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PaymentFailedPage; 