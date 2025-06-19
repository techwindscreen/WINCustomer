import type { NextApiRequest, NextApiResponse } from 'next';
import KlaviyoService from '../../lib/klaviyo';

interface EmailRequest {
  type: 'payment_receipt' | 'order_confirmation' | 'admin_notification';
  recipient_email: string;
  data: Record<string, any>;
  template_override?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { type, recipient_email, data, template_override }: EmailRequest = req.body;

    if (!type || !recipient_email || !data) {
      return res.status(400).json({ 
        message: 'Email type, recipient email, and data are required' 
      });
    }

    console.log(`📧 External email service request: ${type} to ${recipient_email}`);

    // Add recipient email to the data
    const emailData = {
      ...data,
      customer_email: recipient_email,
      external_request: true,
      timestamp: new Date().toISOString()
    };

    let result;

    switch (type) {
      case 'payment_receipt':
        await KlaviyoService.sendPaymentReceipt(emailData);
        result = { message: 'Payment receipt sent successfully' };
        break;

      case 'order_confirmation':
        await KlaviyoService.sendOrderConfirmation(emailData);
        result = { message: 'Order confirmation sent successfully' };
        break;

      case 'admin_notification':
        // Use admin email from environment or provided in data
        const adminEmail = process.env.ADMIN_EMAIL || data.admin_email;
        if (!adminEmail) {
          return res.status(400).json({ message: 'Admin email not configured' });
        }
        
        await KlaviyoService.sendAdminOrderNotification({
          ...emailData,
          admin_email: adminEmail
        });
        result = { message: 'Admin notification sent successfully' };
        break;

      default:
        return res.status(400).json({ message: 'Invalid email type' });
    }

    return res.status(200).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ External email service error:', error);
    return res.status(500).json({ 
      message: 'Failed to send email',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 