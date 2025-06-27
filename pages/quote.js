import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';

// Dynamically import QuotePage to avoid SSR issues
const QuotePage = dynamic(() => import('../components/pages/QuotePage'), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>Loading...</div>
    </div>
  )
});

const QuotePageWrapper = () => {
  const router = useRouter();
  const [quotePageData, setQuotePageData] = useState({});
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark as client-side
    setIsClient(true);
    
    // Process router query after router is ready
    if (router.isReady) {
      // Extract query parameters once the router is ready
      if (router.query && router.query.vehicleReg && router.query.contactDetails) {
        const { vehicleReg, paymentOption, insuranceDetails, contactDetails } = router.query;
        
        try {
          // Parsing the JSON strings
          const parsedInsuranceDetails = insuranceDetails ? JSON.parse(insuranceDetails) : null;
          const parsedContactDetails = contactDetails ? JSON.parse(contactDetails) : null;

          // Setting up the data for QuotePage
          setQuotePageData({
            vehicleReg,
            paymentOption,
            insuranceDetails: parsedInsuranceDetails,
            contactDetails: parsedContactDetails,
          });
        } catch (error) {
          console.error('Error parsing query data:', error);
          // Fallback to empty object
          setQuotePageData({});
        }
      } else {
        // If no required data, just use empty props
        // This handles magic link cases where data comes from URL params or API
        setQuotePageData({});
      }
    }
  }, [router.isReady, router.query]);

  // Show loading during SSR and initial client render
  if (!isClient) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    );
  }

  // Suppress hydration warning for this component
  return (
    <div suppressHydrationWarning>
      <QuotePage {...quotePageData} />
    </div>
  );
}

export default QuotePageWrapper;
