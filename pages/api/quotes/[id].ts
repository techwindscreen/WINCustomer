import { NextApiRequest, NextApiResponse } from 'next';

interface QuoteData {
  id: string;
  bookingReference: string;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    postcode: string;
  };
  vehicle: {
    registration: string;
    make: string;
    model: string;
    year: string;
  };
  service: {
    glassType: 'OEE' | 'OEM';
    damageLocations: string[];
    damageTypes: string[];
    appointmentType: 'mobile' | 'workshop';
  };
  pricing: {
    glassPrice: number;
    fittingPrice: number;
    vatAmount: number;
    totalPrice: number;
  };
  payment: {
    method: string;
    type: 'pay_in_full' | 'pay_deposit' | 'split_payment';
    depositAmount?: number;
    remainingAmount?: number;
    status: 'pending' | 'paid' | 'partially_paid';
  };
  appointment?: {
    date: string;
    time: string;
    address: string;
    technician?: {
      name: string;
      phone: string;
      experience: string;
    };
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Quote ID is required' });
  }

  try {
    // TODO: Replace with actual database query
    // const quote = await getQuoteById(id);
    
    // Mock data for demonstration - replace with actual database lookup
    const mockQuotes: Record<string, QuoteData> = {
      'WIN-2024-001234': {
        id: 'WIN-2024-001234',
        bookingReference: 'BK-001234',
        status: 'confirmed',
        createdAt: '2024-01-15T10:30:00Z',
        customer: {
          name: 'John Smith',
          email: 'john.smith@email.com',
          phone: '+44 7123 456789',
          address: '123 High Street, London',
          postcode: 'SW1A 1AA'
        },
        vehicle: {
          registration: 'AB12 CDE',
          make: 'Ford',
          model: 'Focus',
          year: '2020'
        },
        service: {
          glassType: 'OEE',
          damageLocations: ['Front Windscreen'],
          damageTypes: ['Chip', 'Crack'],
          appointmentType: 'mobile'
        },
        pricing: {
          glassPrice: 199.99,
          fittingPrice: 80.00,
          vatAmount: 55.99,
          totalPrice: 335.98
        },
        payment: {
          method: 'card',
          type: 'pay_deposit',
          depositAmount: 50.00,
          remainingAmount: 285.98,
          status: 'partially_paid'
        },
        appointment: {
          date: '2024-01-20',
          time: '10:00 AM - 12:00 PM',
          address: '123 High Street, London, SW1A 1AA',
          technician: {
            name: 'Mike Johnson',
            phone: '+44 7987 654321',
            experience: '8'
          }
        }
      },
      'WIN-2024-001235': {
        id: 'WIN-2024-001235',
        bookingReference: 'BK-001235',
        status: 'in_progress',
        createdAt: '2024-01-16T14:20:00Z',
        customer: {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '+44 7987 654321',
          address: '456 Oak Avenue, Manchester',
          postcode: 'M1 2AB'
        },
        vehicle: {
          registration: 'XY98 ZAB',
          make: 'Volkswagen',
          model: 'Golf',
          year: '2019'
        },
        service: {
          glassType: 'OEM',
          damageLocations: ['Front Windscreen', 'Driver Side Window'],
          damageTypes: ['Stone Chip', 'Crack', 'Scratch'],
          appointmentType: 'workshop'
        },
        pricing: {
          glassPrice: 299.99,
          fittingPrice: 120.00,
          vatAmount: 83.99,
          totalPrice: 503.98
        },
        payment: {
          method: 'bank_transfer',
          type: 'pay_in_full',
          status: 'paid'
        },
        appointment: {
          date: '2024-01-22',
          time: '9:00 AM - 11:00 AM',
          address: 'WindscreenCompare Workshop, 789 Industrial Estate, Manchester, M2 3CD',
          technician: {
            name: 'David Wilson',
            phone: '+44 7456 123789',
            experience: '12'
          }
        }
      }
    };

    const quote = mockQuotes[id];

    if (!quote) {
      return res.status(404).json({ message: 'Quote not found' });
    }

    res.status(200).json(quote);
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
} 