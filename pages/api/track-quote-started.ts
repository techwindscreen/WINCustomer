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
    
    if (!vehicleReg || !quoteId) {
      return res.status(400).json({ message: 'Vehicle registration and quote ID are required' });
    }

    // Get user agent and IP address for tracking
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection.remoteAddress || '';

    console.log('📤 Sending to Klaviyo...');
    
    // Track the quote started event
    await KlaviyoService.trackQuoteStarted({
      vehicleReg,
      quoteId,
      userEmail,
      userPhone,
      timestamp: new Date().toISOString(),
      userAgent,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress
    });

    console.log('✅ Successfully sent to Klaviyo');

    return res.status(200).json({ 
      success: true, 
      message: 'Quote started event tracked successfully' 
    });
  } catch (error) {
    console.error('❌ Error tracking quote started:', error);
    return res.status(500).json({ 
      message: 'Failed to track quote started event',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 