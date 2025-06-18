import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Calendar, Car, MapPin, Phone, Mail, Clock, CreditCard, FileText, CheckCircle, AlertCircle, Download, Edit, MessageCircle } from 'lucide-react';

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

export default function QuoteDetailsPage() {
  const router = useRouter();
  const [quoteId, setQuoteId] = useState('');
  const [quoteData, setQuoteData] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Handle hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Check for quote ID in URL params on mount
  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      if (id) {
        setQuoteId(id);
        fetchQuoteData(id);
      }
    }
  }, [isMounted]);

  const fetchQuoteData = async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Mock API call - replace with actual API endpoint
      const response = await fetch(`/api/quotes/${id}`);
      
      if (!response.ok) {
        throw new Error('Quote not found');
      }
      
      const data = await response.json();
      setQuoteData(data);
    } catch (err) {
      // Mock data for demonstration
      const mockData: QuoteData = {
        id: id,
        bookingReference: `BK-${id.slice(-6)}`,
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
      };
      setQuoteData(mockData);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (quoteId.trim()) {
      fetchQuoteData(quoteId.trim());
      // Update URL without page reload
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', `?id=${quoteId.trim()}`);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
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

  return (
    <>
      <Head>
        <title>Quote Management - WindscreenCompare</title>
        <meta name="description" content="View and manage your windscreen replacement quote" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900">Quote Management</h1>
              <p className="text-gray-600 mt-2">Enter your Quote ID to view and manage your windscreen replacement quote</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quote ID Search */}
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <form onSubmit={handleQuoteSearch} className="flex gap-4 items-end">
              <div className="flex-1">
                <label htmlFor="quoteId" className="block text-sm font-medium text-gray-700 mb-2">
                  Quote ID
                </label>
                <input
                  type="text"
                  id="quoteId"
                  value={quoteId}
                  onChange={(e) => setQuoteId(e.target.value)}
                  placeholder="Enter your Quote ID (e.g., WC-2024-001234)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#0FB8C1] text-white px-8 py-3 rounded-lg hover:bg-[#0da8b0] transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'View Quote'}
              </button>
            </form>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0FB8C1]"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">Quote Not Found</h3>
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Quote Details */}
          {quoteData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quote Overview */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Quote Overview</h2>
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(quoteData.status)}`}>
                      {getStatusIcon(quoteData.status)}
                      <span className="font-semibold capitalize">{quoteData.status.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Quote ID</label>
                      <p className="text-lg font-semibold text-gray-900">{quoteData.id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Booking Reference</label>
                      <p className="text-lg font-semibold text-gray-900">{quoteData.bookingReference}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Created</label>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(quoteData.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[#0FB8C1] rounded-full flex items-center justify-center">
                      <Car className="w-5 h-5 text-white" />
                    </div>
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
                    <div className="w-10 h-10 bg-[#0FB8C1] rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
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
                            className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200"
                          >
                            {location}
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
                            className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium border border-orange-200"
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
                      <div className="w-10 h-10 bg-[#0FB8C1] rounded-full flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900">Appointment Details</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Date & Time</label>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatDate(quoteData.appointment.date)}
                        </p>
                        <p className="text-gray-600">{quoteData.appointment.time}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Location</label>
                        <p className="text-lg font-semibold text-gray-900">{quoteData.appointment.address}</p>
                      </div>
                    </div>
                    
                    {quoteData.appointment.technician && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                        <h3 className="font-semibold text-gray-900 mb-3">Your Technician</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-500">Name</label>
                            <p className="font-semibold text-gray-900">{quoteData.appointment.technician.name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Contact</label>
                            <p className="font-semibold text-gray-900">{quoteData.appointment.technician.phone}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-500">Experience</label>
                            <p className="font-semibold text-gray-900">{quoteData.appointment.technician.experience} years</p>
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
                      <div className="w-12 h-12 bg-[#0FB8C1] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-lg">
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
                    <div className="w-10 h-10 bg-[#0FB8C1] rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">Pricing</h2>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Glass Cost</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.glassPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fitting Cost</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.fittingPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">VAT</span>
                      <span className="font-semibold">{formatPrice(quoteData.pricing.vatAmount)}</span>
                    </div>
                    <hr className="my-3" />
                    <div className="flex justify-between text-lg">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-[#0FB8C1]">{formatPrice(quoteData.pricing.totalPrice)}</span>
                    </div>
                  </div>

                  {/* Payment Information */}
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
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

                {/* Actions */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions</h2>
                  <div className="space-y-3">
                    <button className="w-full bg-[#0FB8C1] text-white py-3 px-4 rounded-lg hover:bg-[#0da8b0] transition-colors font-medium flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download Quote PDF
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2">
                      <Edit className="w-4 h-4" />
                      Request Changes
                    </button>
                    <button className="w-full text-[#0FB8C1] py-3 px-4 rounded-lg hover:bg-[#0FB8C1]/5 transition-colors font-medium flex items-center justify-center gap-2">
                      <MessageCircle className="w-4 h-4" />
                      Contact Support
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 