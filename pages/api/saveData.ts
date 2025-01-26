import { NextApiRequest, NextApiResponse } from 'next';
import base from '../../components/lib/airtable'

// Define the shape of the incoming request body
interface RequestBody {
  name: string;
  email: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    const { name, email }: RequestBody = req.body;

    try {
      const records = await base('Tester').create([
        {
          fields: {
            Name: name,
            Email: email,
          },
        },
      ]);

      res.status(200).json({ message: 'Data saved successfully', records });
    } catch (error) {
      res.status(500).json({ message: 'Error saving data', error });
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
