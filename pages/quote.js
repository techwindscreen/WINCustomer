import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import QuotePage from '../components/QuotePage'; // Adjust path if needed

const QuotePageWrapper = () => {
  const router = useRouter();
  const [quotePageData, setQuotePageData] = useState(null);

  useEffect(() => {
    // Extract query parameters once the router is ready
    if (router.query && router.query.vehicleReg && router.query.contactDetails) {
      const { vehicleReg, paymentOption, insuranceDetails, contactDetails } = router.query;
      
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
    }
  }, [router.query]);

  if (!quotePageData) {
    return <div>Loading...</div>;
  }

  return <QuotePage {...quotePageData} />;
}

export default QuotePageWrapper;
