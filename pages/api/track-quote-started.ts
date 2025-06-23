import type { NextApiRequest, NextApiResponse } from 'next';
import KlaviyoService from '../../lib/klaviyo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add debug logging
  console.log('🚀 Track quote started API called');
  console.log('📋 Request body:', req.body);
  console.log('🔑 Klaviyo key exists:', !!process.env.KLAVIYO_PRIVATE_API_KEY);
  console.log('📧 Admin email:', process.env.ADMIN_EMAIL);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicleReg, quoteId, userEmail, userPhone } = req.body;
    
    // Basic validation - make sure we have the essentials
    if (!vehicleReg || !quoteId) {
      return res.status(400).json({ 
        message: 'Vehicle registration and quote ID are required',
        received: { vehicleReg: !!vehicleReg, quoteId: !!quoteId }
      });
    }

    // Get user agent and IP for tracking (optional)
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'Unknown';
    
    // console.log('Quote started tracking request:', { vehicleReg, quoteId, userAgent, ip }); // debug

    console.log('📤 Sending to Klaviyo...');
    
    // Track the quote start event
    await KlaviyoService.trackQuoteStarted({
      vehicleReg,
      quoteId,
      userEmail,
      userPhone,
      timestamp: new Date().toISOString(),
      userAgent,
      ipAddress: Array.isArray(ip) ? ip[0] : ip, // handle forwarded IPs
    });

    console.log('✅ Successfully sent to Klaviyo');

    return res.status(200).json({
      success: true,
      message: 'Quote started event tracked successfully',
      quoteId
    });
  } catch (error) {
    console.error('Error tracking quote started event:', error);
    
    // Don't fail the user flow if tracking fails
    return res.status(200).json({
      success: false,
      message: 'Tracking failed but continuing...',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 