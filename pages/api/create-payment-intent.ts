import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-10-28.acacia',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { amount, quoteId, paymentType, totalAmount, customerEmail } = req.body;

    // Configure payment methods based on payment type
    const paymentMethodConfiguration = paymentType === 'split' 
      ? {
          // For split payments, enable specific payment methods including BNPL options
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'always' // Allow redirect-based payment methods like Klarna
          },
          payment_method_types: ['card', 'klarna'], // Explicitly enable Klarna for split payments
        }
      : {
          // For full/deposit payments, use standard configuration
          automatic_payment_methods: {
            enabled: true,
          },
        };

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'gbp',
      ...paymentMethodConfiguration,
      metadata: {
        quote_id: quoteId || '',
        payment_type: paymentType || 'full',
        total_amount: totalAmount ? Math.round(totalAmount * 100).toString() : Math.round(amount * 100).toString(),
        customer_email: customerEmail || '',
        created_at: new Date().toISOString()
      },
      description: `Windscreen Service - Quote ${quoteId || 'Unknown'} - ${paymentType || 'Full'} Payment`
    });

    console.log('Payment intent created:', {
      id: paymentIntent.id,
      amount: paymentIntent.amount,
      quote_id: quoteId,
      payment_type: paymentType
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Error creating payment intent' });
  }
} 