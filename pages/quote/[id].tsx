import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Calendar, Car, MapPin, Phone, Mail, Clock, CreditCard, FileText, CheckCircle, AlertCircle } from 'lucide-react';

// Window ID to name mapping
const WINDOW_NAMES: { [key: string]: string } = {
  'jqvmap1_ws': 'Windscreen',
  'jqvmap1_rw': 'Rear Window',
  'jqvmap1_df': 'Front Passenger Door',
  'jqvmap1_dg': 'Front Driver Door',
  'jqvmap1_dr': 'Rear Passenger Door',
  'jqvmap1_dd': 'Rear Driver Door',
  'jqvmap1_vp': 'Front Passenger Vent',
  'jqvmap1_vf': 'Front Driver Vent',
  'jqvmap1_vr': 'Rear Passenger Vent',
  'jqvmap1_vg': 'Rear Driver Vent',
  'jqvmap1_qr': 'Rear Passenger Quarter',
  'jqvmap1_qg': 'Rear Driver Quarter'
};

// Helper function to get window name from ID
const getWindowName = (windowId: string): string => {
  return WINDOW_NAMES[windowId] || windowId;
};

interface QuoteData {
  id: string;
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
    materialsCost: number;
    labourCost: number;
    serviceFee: number;
    subtotal: number;
    totalBeforeVAT: number;
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

export default function QuoteDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchQuoteData(id as string);
    }
  }, [id]);

  const fetchQuoteData = async (quoteId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/quotes/${quoteId}`);
      
      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('Quote API error response:', responseText);
        throw new Error('Quote not found');
      }
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', responseText);
        throw new Error('Invalid response from server');
      }
      setQuoteData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-emerald-600 bg-emerald-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-yellow-600 bg-yellow-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'completed':
        return <CheckCircle className="w-5 h-5" />;
      case 'in_progress':
        return <Clock className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0FB8C1]"></div>
      </div>
    );
  }

  if (error || !quoteData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-600 mb-6">{error || 'The quote you\'re looking for doesn\'t exist.'}</p>
          <button
            onClick={() => router.push('/vercel-homepage')}
            className="bg-[#0FB8C1] text-white px-6 py-3 rounded-lg hover:bg-[#0da8b0] transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Quote {quoteData.id} - WindscreenCompare</title>
        <meta name="description" content="View and manage your windscreen replacement quote" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quote Details</h1>
                <p className="text-gray-600 mt-1">Manage and review your windscreen replacement quote</p>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${getStatusColor(quoteData.status)}`}>
                {getStatusIcon(quoteData.status)}
                <span className="font-semibold capitalize">{quoteData.status.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quote Overview */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Quote Overview</h2>
                  <div className="text-sm text-gray-500">
                    Created {formatDate(quoteData.createdAt)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quote ID</label>
                    <p className="text-lg font-semibold text-gray-900">{quoteData.id}</p>
                  </div>
                </div>
              </div>

              {/* Vehicle Information */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Car className="w-6 h-6 text-[#0FB8C1]" />
                  <h2 className="text-xl font-semibold text-gray-900">Vehicle Information</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Registration</label>
                    <p className="text-lg font-semibold text-gray-900">{quoteData.vehicle.registration}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vehicle</label>
                    <p className="text-lg font-semibold text-gray-900">
                      {quoteData.vehicle.year} {quoteData.vehicle.make} {quoteData.vehicle.model}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Details */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <FileText className="w-6 h-6 text-[#0FB8C1]" />
                  <h2 className="text-xl font-semibold text-gray-900">Service Details</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Glass Type</label>
                      <p className="text-lg font-semibold text-gray-900">{quoteData.service.glassType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Service Type</label>
                      <p className="text-lg font-semibold text-gray-900 capitalize">
                        {quoteData.service.appointmentType} Service
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Damage Locations</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {quoteData.service.damageLocations.map((location, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium"
                        >
                          {getWindowName(location)}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Damage Types</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {quoteData.service.damageTypes.map((type, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium"
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              {quoteData.appointment && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <Calendar className="w-6 h-6 text-[#0FB8C1]" />
                    <h2 className="text-xl font-semibold text-gray-900">Appointment Details</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Date & Time</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatDate(quoteData.appointment.date)} at {quoteData.appointment.time}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Location</label>
                      <p className="text-lg font-semibold text-gray-900">{quoteData.appointment.address}</p>
                    </div>
                  </div>
                  
                  {quoteData.appointment.technician && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-semibold text-gray-900 mb-2">Your Technician</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-500">Name</label>
                          <p className="font-semibold text-gray-900">{quoteData.appointment.technician.name}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-500">Contact</label>
                          <p className="font-semibold text-gray-900">{quoteData.appointment.technician.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Customer Information */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Customer Information</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0FB8C1] rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">
                        {quoteData.customer.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{quoteData.customer.name}</p>
                      <p className="text-sm text-gray-500">Customer</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{quoteData.customer.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{quoteData.customer.phone}</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-gray-400 mt-1" />
                      <div>
                        <p className="text-gray-900">{quoteData.customer.address}</p>
                        <p className="text-gray-900">{quoteData.customer.postcode}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="flex items-center gap-3 mb-6">
                  <CreditCard className="w-6 h-6 text-[#0FB8C1]" />
                  <h2 className="text-xl font-semibold text-gray-900">Pricing</h2>
                </div>
                
                <div className="space-y-3 text-sm">
                  {/* Labor Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Labor & Service</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.labourCost)}</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>• Professional Installation</span>
                        <span>£{Math.round(quoteData.pricing.labourCost * 0.7).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Mobile Service & Tools</span>
                        <span>£{Math.round(quoteData.pricing.labourCost * 0.2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Quality Assurance</span>
                        <span>£{Math.round(quoteData.pricing.labourCost * 0.1).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Materials Breakdown */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-700">Materials & Glass</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.materialsCost)}</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex justify-between">
                        <span>• Glass & Sealants</span>
                        <span>£{Math.round(quoteData.pricing.materialsCost * 0.8).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Installation Materials</span>
                        <span>£{Math.round(quoteData.pricing.materialsCost * 0.2).toFixed(2)}</span>
                      </div>
                      {quoteData.service.glassType === 'OEM' && (
                        <div className="flex justify-between font-medium text-orange-600">
                          <span>• Premium Glass Upgrade (+40%)</span>
                          <span>+£{Math.round((quoteData.pricing.materialsCost * 0.4) * 100) / 100}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Other Costs */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Service Fee (20%)</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.serviceFee)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.totalBeforeVAT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">VAT (20%)</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.vatAmount)}</span>
                    </div>
                  </div>

                  <hr className="my-3" />
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold text-gray-900">Total (inc. VAT)</span>
                    <span className="font-bold text-[#0FB8C1]">{formatPrice(quoteData.pricing.totalPrice)}</span>
                  </div>
                </div>

                {/* Payment Information */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Payment Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Method</span>
                      <span className="font-medium capitalize">{quoteData.payment.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type</span>
                      <span className="font-medium capitalize">
                        {quoteData.payment.type.replace('_', ' ')}
                      </span>
                    </div>
                    {quoteData.payment.depositAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deposit</span>
                        <span className="font-medium">{formatPrice(quoteData.payment.depositAmount)}</span>
                      </div>
                    )}
                    {quoteData.payment.remainingAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Remaining</span>
                        <span className="font-medium">{formatPrice(quoteData.payment.remainingAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Need Help?</h2>
                <div className="text-center">
                  <p className="text-gray-600 mb-3">
                    If you need to reschedule your appointment or have any questions, please contact us at:
                  </p>
                  <a
                    href="mailto:hello@windscreencompare.com"
                    className="text-[#0FB8C1] font-semibold text-lg hover:text-[#0da8b0] transition-colors"
                  >
                    hello@windscreencompare.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 