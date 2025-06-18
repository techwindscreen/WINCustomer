import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment intent ID is required' });
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log('Stripe payment intent retrieved:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status
    });

    res.status(200).json({
      success: true,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount, // Amount in pence
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      description: paymentIntent.description,
      metadata: paymentIntent.metadata,
      // Extract useful metadata for easier access
      quoteId: paymentIntent.metadata?.quote_id,
      paymentType: paymentIntent.metadata?.payment_type,
      totalAmount: paymentIntent.metadata?.total_amount ? parseInt(paymentIntent.metadata.total_amount) : null,
      customerEmail: paymentIntent.metadata?.customer_email
    });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error verifying payment',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 