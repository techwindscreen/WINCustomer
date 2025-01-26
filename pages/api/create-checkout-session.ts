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
    const { amount, vehicleReg, selectedWindows, specifications } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `Windscreen Service - ${vehicleReg}`,
              description: `Windows: ${selectedWindows.join(', ')}\nSpecifications: ${specifications.join(', ')}`,
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.headers.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/quote?vehicleReg=${vehicleReg}`,
    });

    res.status(200).json({ id: session.id });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ message: 'Error creating checkout session' });
  }
}