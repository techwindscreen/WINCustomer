import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { quoteId } = req.query;

    if (!quoteId) {
      return res.status(400).json({ message: 'Quote ID is required' });
    }

    console.log('🔍 Testing quote data retrieval for:', quoteId);

    // Test the same API call that payment success page uses
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/get-quote-data?quoteId=${quoteId}`);
    
    console.log('📡 API response status:', response.status);
    
    if (response.ok) {
      const apiResponse = await response.json();
      console.log('📋 API response:', JSON.stringify(apiResponse, null, 2));
      
      if (apiResponse.success && apiResponse.data) {
        const quoteData = apiResponse.data;
        
        const analysis = {
          hasData: !!quoteData,
          hasContactDetails: !!quoteData.contactDetails,
          hasCustomerEmail: !!quoteData.contactDetails?.email,
          hasCustomerName: !!quoteData.contactDetails?.name,
          hasVehicleDetails: !!quoteData.vehicleDetails,
          contactDetails: quoteData.contactDetails || null,
          vehicleDetails: quoteData.vehicleDetails || null,
          wouldTriggerEmails: !!(quoteData && quoteData.contactDetails)
        };
        
        console.log('📊 Analysis:', JSON.stringify(analysis, null, 2));
        
        return res.status(200).json({
          success: true,
          quoteId,
          analysis,
          rawData: apiResponse.data
        });
      } else {
        console.log('❌ API returned no data');
        return res.status(200).json({
          success: false,
          quoteId,
          issue: 'API returned no data',
          apiResponse
        });
      }
    } else {
      const errorText = await response.text();
      console.log('❌ API failed:', errorText);
      return res.status(200).json({
        success: false,
        quoteId,
        issue: 'API request failed',
        status: response.status,
        error: errorText
      });
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    return res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 