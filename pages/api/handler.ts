import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { vehicleDetails, windowSpecifications } = req.body;

    console.log("Received vehicle details:", vehicleDetails);
    console.log("Received window specifications:", windowSpecifications);

    // Implement pricing logic based on vehicleDetails and windowSpecifications
    const price = Math.floor(Math.random() * (1000 - 100 + 1) + 100); // Example random price

    // Send the calculated price back to the client
    res.status(200).json({ price });
  } catch (error) {
    console.error('Error calculating quote:', error);
    res.status(500).json({ message: 'Error calculating quote' });
  }
}
