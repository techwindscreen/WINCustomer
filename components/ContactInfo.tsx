import React, { useState, useEffect } from 'react'
import { Car, Info, Calendar, Shield, User, Mail, MapPin, Home, Phone, ClipboardList } from 'lucide-react'
import Link from 'next/link'
import Airtable from 'airtable'
import { useRouter } from 'next/router'
import Image from 'next/image'
import { generateArgicCode, GlassProperties } from './argic-code-generator';

interface ContactDetailsProps {
  vehicleReg: string
}

interface VehicleDetails {
  manufacturer: string
  model: string
  year: string
  colour: string
  type: string
  style: string
  doorPlan: string
}

interface Address {
  SummaryAddress: string;
  FormattedAddressLines: {
    Organisation?: string;
    Premises?: string;
    Street?: string;
    PostTown?: string;
    County?: string;
    Postcode: string;
  };
}

const regions = [
  { id: 'jqvmap1_ws', label: 'Windscreen' },
  { id: 'jqvmap1_rw', label: 'Rear Window' },
  { id: 'jqvmap1_vp', label: 'Front Passenger Vent' },
  { id: 'jqvmap1_df', label: 'Front Passenger Door' },
  { id: 'jqvmap1_dr', label: 'Rear Passenger Door' },
  { id: 'jqvmap1_vr', label: 'Rear Passenger Vent' },
  { id: 'jqvmap1_qr', label: 'Rear Passenger Quarter' },
  { id: 'jqvmap1_vf', label: 'Front Driver Vent' },
  { id: 'jqvmap1_dg', label: 'Front Driver Door' },
  { id: 'jqvmap1_dd', label: 'Rear Driver Door' },
  { id: 'jqvmap1_vg', label: 'Rear Driver Vent' },
  { id: 'jqvmap1_qg', label: 'Rear Driver Quarter' }
];

const vehicleInfoStyles = {
  container: "bg-white rounded-lg p-6 mb-8",
  section: "mb-6",
  label: "text-gray-500 text-sm uppercase mb-1",
  value: "text-lg font-medium",
  tagContainer: "flex flex-wrap gap-2 mt-2",
  tag: "px-3 py-1 rounded-lg text-sm font-medium",
  blueTag: "bg-blue-100 text-blue-800",
  grayTag: "bg-gray-100 text-gray-800",
  whiteTag: "bg-white border border-gray-200 text-gray-800",
};

const ContactDetails: React.FC = () => {
  const router = useRouter();
  const { vehicleReg,  specifications, chipSize, quoteID } = router.query;
  
  const vehicleRegString = typeof vehicleReg === 'string' ? vehicleReg : '';
  const [selectedWindows, setSelectedWindows] = useState<Set<string>>(new Set())
  const [windowDamage, setWindowDamage] = useState<{ [key: string]: string | null }>({})

  const [currentStep, setCurrentStep] = useState(3)
  const [paymentOption, setPaymentOption] = useState<'self' | 'insurance'>('self')

  const [parsedVehicleDetails, setParsedVehicleDetails] = useState<VehicleDetails | null>(null);
  const [parsedWindowDamage, setParsedWindowDamage] = useState<{ [key: string]: string } | null>(null);
  const [parsedSpecifications, setParsedSpecifications] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    date: '',
    timeSlot: 'any',
    insuranceProvider: '',
    policyNumber: '',
    incidentDate: '',
    policyExcessAmount: '',
    policyExpiryDate: '',
    fullName: '',
    email: '',
    location: '',
    postcode: '',
    mobile: '',
    areaCode: '+44',
  })
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>('');
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null)
  const [argicCode, setArgicCode] = useState<string>('');
  const [airtableError, setAirtableError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string>('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Add state for checkbox
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validatePhoneNumber = (number: string) => {
    // UK phone number regex (allows spaces and dashes)
    const phoneRegex = /^[0-9\s-]{10,11}$/;
    return phoneRegex.test(number.replace(/\D/g, ''));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'postcode') {
      // Clean up postcode and convert to uppercase
      const cleanedPostcode = value.replace(/[^\w\s]/g, '').toUpperCase();
      setFormData(prev => ({ ...prev, [name]: cleanedPostcode }));
      
      // If postcode is complete (roughly 5-8 characters), fetch addresses
      if (cleanedPostcode.length >= 5 && cleanedPostcode.length <= 8) {
        fetchAddresses(cleanedPostcode);
      } else {
        setAddresses([]);
      }
    } else if (name === 'mobile') {
      // Remove any non-numeric characters except spaces and dashes
      const cleanedNumber = value.replace(/[^\d\s-]/g, '');
      
      if (cleanedNumber.length > 0 && !validatePhoneNumber(cleanedNumber)) {
        setPhoneError('Please enter a valid UK phone number');
      } else {
        setPhoneError('');
      }
      
      setFormData(prev => ({
        ...prev,
        [name]: cleanedNumber
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const fetchAddresses = async (postcode: string) => {
    setIsLoadingAddresses(true);
    setAddressError(null);
    
    try {
      const response = await fetch(
        `https://uk1.ukvehicledata.co.uk/api/datapackage/PostcodeLookup?v=2&api_nullitems=1&auth_apikey=6193cc7a-c1b2-469c-ad41-601c6faa294c&key_POSTCODE=${postcode}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();
      console.log('Address API response:', data); // For debugging

      if (data.Response.StatusCode === "Success" && data.Response.DataItems.AddressDetails) {
        const addressList = data.Response.DataItems.AddressDetails.AddressList || [];
        setAddresses(Array.isArray(addressList) ? addressList : [addressList]);
      } else {
        setAddressError('No addresses found for this postcode');
        setAddresses([]);
      }
    } catch (err) {
      console.error('Error fetching addresses:', err);
      setAddressError('Failed to fetch addresses. Please enter address manually.');
      setAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleAddressSelect = (e: React.MouseEvent, address: Address) => {
    e.preventDefault(); // Prevent any form submission
    setFormData(prev => ({
      ...prev,
      location: address.SummaryAddress.replace(`, ${address.FormattedAddressLines.Postcode}`, '')
    }));
  };

  useEffect(() => {
    const { selectedWindows, windowDamage, specifications, damageDescription } = router.query;
    
    if (selectedWindows) {
      try {
        setSelectedWindows(new Set(JSON.parse(selectedWindows as string)));
      } catch (err) {
        console.error("Error parsing selectedWindows:", err);
      }
    }

    if (windowDamage) {
      try {
        setWindowDamage(JSON.parse(windowDamage as string));
      } catch (err) {
        console.error("Error parsing windowDamage:", err);
      }
    }

    if (specifications) {
      try {
        setParsedSpecifications(JSON.parse(specifications as string));
      } catch (err) {
        console.error("Error parsing specifications:", err);
      }
    }
  }, [router.query]);

  useEffect(() => {
    const fetchVehicleDetails = async () => {
      if (!vehicleRegString) {
        setVehicleDetails(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleData?v=2&api_nullitems=1&auth_apikey=6193cc7a-c1b2-469c-ad41-601c6faa294c&key_VRM=${vehicleRegString}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        console.log('Raw API response:', JSON.stringify(data, null, 2));

        if (data.Response.StatusCode === "Success") {
          const vehicleInfo = data.Response.DataItems;
          console.log('Vehicle Info:', vehicleInfo);
          
          setVehicleDetails({
            manufacturer: vehicleInfo.ClassificationDetails?.Dvla?.Make || 'Unknown',
            model: vehicleInfo.ClassificationDetails?.Dvla?.Model || 'Unknown',
            year: vehicleInfo.VehicleRegistration?.YearOfManufacture || 'Unknown',
            colour: vehicleInfo.VehicleRegistration?.Colour || 'Unknown',
            type: vehicleInfo.VehicleRegistration?.VehicleClass || 'Unknown',
            style: vehicleInfo.SmmtDetails?.BodyStyle || 'Unknown',
            doorPlan: `${vehicleInfo.TechnicalDetails?.Dimensions?.NumberOfDoors || '?'} Doors` || 'Unknown'
          })
        } else {
          throw new Error('Failed to fetch vehicle data')
        }
      } catch (err) {
        console.error('Error fetching vehicle details:', err)
        setError('Failed to fetch vehicle details. Please try again.')
        setVehicleDetails(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchVehicleDetails()
  }, [vehicleRegString])

  const uploadArgicCodeToAirtable = async (quoteId: string, argicCode: string) => {
    try {
      const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY })
        .base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

      await base('Quotes').update([
        {
          id: quoteId,
          fields: {
            'Argic Code': argicCode
          }
        }
      ]);
    } catch (error) {
      console.error('Error updating Airtable:', error);
      setAirtableError('Failed to update quote information');
    }
  };

  useEffect(() => {
    if (vehicleDetails && selectedWindows && parsedSpecifications) {
      const glassProps: GlassProperties = {
        type: 'standard',
        color: 'clear',
        stripe: 'none',
        modifications: parsedSpecifications
      };
      
      const code = generateArgicCode(vehicleDetails, selectedWindows, glassProps);
      setArgicCode(code);

      // Get quoteID from router query
      const { quoteID } = router.query;
      if (quoteID && code) {
        uploadArgicCodeToAirtable(quoteID as string, code);
      }
    }
  }, [vehicleDetails, selectedWindows, parsedSpecifications, router.query]);

  useEffect(() => {
    const fetchExistingData = async () => {
      if (!quoteID) return;
      
      try {
        const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY })
          .base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);
          
        const records = await base('Submissions').select({
          filterByFormula: `{QuoteID} = '${quoteID}'`
        }).firstPage();
        
        if (records.length > 0) {
          const record = records[0];
          setFormData({
            fullName: String(record.fields['Full Name'] || ''),
            email: String(record.fields['Email'] || ''),
            mobile: String(record.fields['Mobile'] || ''),
            postcode: String(record.fields['PostcodeAccident'] || ''),
            location: String(record.fields['Location'] || ''),
            date: String(record.fields['Appointment Date'] || ''),
            timeSlot: String(record.fields['Time Slot'] || 'any'),
            insuranceProvider: String(record.fields['Insurance Provider'] || ''),
            policyNumber: String(record.fields['Policy Number'] || ''),
            incidentDate: String(record.fields['Incident Date'] || ''),
            policyExcessAmount: String(record.fields['Policy Excess'] || ''),
            policyExpiryDate: String(record.fields['Policy Expiry'] || ''),
            areaCode: '+44'
          });
          
          setPaymentOption(record.fields['Payment Option'] as 'self' | 'insurance' || 'self');
        }
      } catch (error) {
        console.error('Error fetching existing data:', error);
      }
    };
    
    fetchExistingData();
  }, [quoteID]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      let quoteId = router.query.quoteID as string;
      
      if (!quoteId) {
        quoteId = `QT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      const response = await fetch('/api/submit-contact-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData,
          quoteId
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to submit form');
      }

      await router.push({
        pathname: '/quote',
        query: {
          quoteID: quoteId,
          vehicleReg: vehicleRegString,
          selectedWindows: JSON.stringify(Array.from(selectedWindows)),
          windowDamage: JSON.stringify(windowDamage),
          specifications: JSON.stringify(parsedSpecifications),
          paymentOption,
          insuranceDetails: JSON.stringify(paymentOption === 'insurance' ? {
            insuranceProvider: formData.insuranceProvider,
            policyNumber: formData.policyNumber,
            incidentDate: formData.incidentDate,
            policyExcessAmount: formData.policyExcessAmount,
            policyExpiryDate: formData.policyExpiryDate,
          } : null),
          contactDetails: JSON.stringify({
            fullName: formData.fullName,
            email: formData.email,
            mobile: formData.mobile,
            postcode: formData.postcode,
            location: formData.location,
            date: formData.date,
            timeSlot: formData.timeSlot
          }),
          chipSize: JSON.stringify(chipSize)
        }
      });

    } catch (error) {
      console.error('Form submission error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit form. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-white py-2 px-4 border-b">
        <div className="container mx-auto">
          <div className="flex items-center justify-center sm:justify-start">
            <div className="relative w-[150px] sm:w-[200px] h-[45px] sm:h-[60px] -ml-0 sm:-ml-4">
              <Image 
                src="/WCLOGO.jpg"
                alt="Windscreen Compare Logo"
                width={250}
                height={60}
                className="object-contain w-full h-full"
                priority
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-grow w-full">
        <main className="flex-grow">
          <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-center mb-12 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold w-full sm:w-[200px] mb-8 sm:mb-0 text-center sm:text-left">
                Contact Details
              </h2>
              
              <div className="flex-1 flex items-center justify-center w-full">
                <div className="flex items-center justify-center w-full max-w-[600px] px-4 sm:px-0">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className="flex items-center flex-1">
                      <div className="flex flex-col items-center relative">
                        <div className={`rounded-full h-8 w-8 flex items-center justify-center border-2 bg-white z-10 ${
                          step <= currentStep ? 'border-[#0FB8C1] text-[#0FB8C1]' : 'border-gray-300 text-gray-300'
                        }`}>
                          {step}
                        </div>
                        <span className="text-xs text-gray-500 mt-1 absolute -bottom-6 w-max">
                          {step === 1 ? 'Vehicle' : 
                           step === 2 ? 'Damage' : 
                           step === 3 ? 'Details' : 
                           'Payment'}
                        </span>
                      </div>
                      {step < 4 && (
                        <div className={`h-[2px] flex-1 ${
                          step <= currentStep ? 'bg-[#0FB8C1]' : 'bg-gray-300'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 justify-between">
              <div className="flex-grow max-w-4xl w-full">
                <p className="text-gray-600 mb-4">Please fill in your contact details below</p>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="mb-6">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentOption('self')}
                        className={`flex-1 py-3 px-4 rounded-full text-sm ${
                          paymentOption === 'self' ? 'bg-[#0FB8C1] text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        I am paying for the work
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentOption('insurance')}
                        className={`flex-1 py-3 px-4 rounded-full text-sm ${
                          paymentOption === 'insurance' ? 'bg-[#0FB8C1] text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        I am claiming through insurance
                      </button>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-lg sm:text-xl font-bold mb-2 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-[#0FB8C1]" />
                      Your Availability <span className="text-xs sm:text-sm font-normal text-gray-500">(Date may change if the glass part unavailable)</span>
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        min={getTomorrowDate()}
                        max={getMaxDate()}
                        className="flex-1 p-2 border rounded"
                        required
                      />
                      <select
                        name="timeSlot"
                        value={formData.timeSlot}
                        onChange={handleInputChange}
                        className="flex-1 p-2 border rounded"
                        required
                      >
                        <option value="any">Any time</option>
                        <option value="8am-11am">8:00 AM - 11:00 AM</option>
                        <option value="11am-2pm">11:00 AM - 2:00 PM</option>
                        <option value="2pm-5pm">2:00 PM - 5:00 PM</option>
                        <option value="5pm-8pm">5:00 PM - 8:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="fullName" className="block mb-1 font-bold flex items-center gap-2">
                      <User className="w-5 h-5 text-[#0FB8C1]" />
                      Full Name <span className="text-sm font-normal text-gray-500"></span>
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="email" className="block mb-1 font-bold flex items-center gap-2">
                      <Mail className="w-5 h-5 text-[#0FB8C1]" />
                      Email Address <span className="text-sm font-normal text-gray-500">(For quote and booking details)</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-1">
                      <label htmlFor="postcode" className="block mb-1 font-bold flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[#0FB8C1]" />
                        Your Postcode <span className="text-sm font-normal text-gray-500">(To find nearest technician)</span>
                      </label>
                      <input
                        type="text"
                        id="postcode"
                        name="postcode"
                        value={formData.postcode}
                        onChange={handleInputChange}
                        className="w-full p-2 border rounded"
                        required
                      />
                    </div>
                    <div className="col-span-1">
                      <label htmlFor="mobile" className="block mb-1 font-bold flex items-center gap-2">
                        <Phone className="w-5 h-5 text-[#0FB8C1]" />
                        Mobile Number <span className="text-sm font-normal text-gray-500">(For appointment updates)</span>
                      </label>
                      <div className="flex gap-2">
                        <select
                          name="areaCode"
                          value={formData.areaCode || '+44'}
                          onChange={handleInputChange}
                          className="w-24 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0FB8C1] focus:border-transparent"
                        >
                          <option value="+44">+44</option>
                          <option value="+1">+1</option>
                        </select>
                        <div className="flex-1">
                          <input
                            type="tel"
                            id="mobile"
                            name="mobile"
                            value={formData.mobile}
                            onChange={handleInputChange}
                            placeholder="7XXX XXXXXX"
                            className={`w-full p-2 border rounded-lg ${
                              phoneError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-[#0FB8C1]'
                            } focus:ring-2 focus:border-transparent`}
                            required
                          />
                          {phoneError && (
                            <p className="text-red-500 text-sm mt-1">{phoneError}</p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Format: 07XXX XXXXXX (UK) or your local format
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="location" className="block mb-1 font-bold flex items-center gap-2">
                      <Home className="w-5 h-5 text-[#0FB8C1]" />
                      Vehicle Address <span className="text-sm font-normal text-gray-500">(Where repair will take place)</span>
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full p-2 border rounded"
                      required
                    />
                    {isLoadingAddresses && (
                      <div className="mt-2 text-sm text-gray-500">Loading addresses...</div>
                    )}
                    {addressError && (
                      <div className="mt-2 text-sm text-red-500">{addressError}</div>
                    )}
                    {addresses.length > 0 && (
                      <div className="mt-2 border rounded max-h-40 overflow-y-auto">
                        {addresses.map((address, index) => (
                          <button
                            type="button"
                            key={index}
                            onClick={(e) => handleAddressSelect(e, address)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b last:border-b-0"
                          >
                            {address.SummaryAddress}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {paymentOption === 'insurance' && (
                    <>
                      <div className="mb-4">
                        <label htmlFor="insuranceProvider" className="block mb-1 font-bold flex items-center gap-2">
                          <Shield className="w-5 h-5 text-[#0FB8C1]" />
                          Name of Insurance Provider <span className="text-sm font-normal text-gray-500">(Must be listed with us)</span>
                        </label>
                        <select
                          id="insuranceProvider"
                          name="insuranceProvider"
                          value={formData.insuranceProvider}
                          onChange={handleInputChange}
                          className="w-full p-2 border rounded"
                          required
                        >
                          <option value="">--- Select ---</option>
                          <option value="provider1">Provider 1</option>
                          <option value="provider2">Provider 2</option>
                          <option value="provider3">Provider 3</option>
                        </select>
                        <p className="text-sm text-gray-500 mt-1">If your insurance provider is not listed, please contact your insurance company</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label htmlFor="policyNumber" className="block mb-1 font-bold flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-[#0FB8C1]" />
                            Policy Number <span className="text-sm font-normal text-gray-500">(Found on your insurance documents)</span>
                          </label>
                          <input
                            type="text"
                            id="policyNumber"
                            name="policyNumber"
                            value={formData.policyNumber}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="incidentDate" className="block mb-1 font-bold flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-[#0FB8C1]" />
                            Incident Date <span className="text-sm font-normal text-gray-500">(When damage occurred)</span>
                          </label>
                          <input
                            type="date"
                            id="incidentDate"
                            name="incidentDate"
                            value={formData.incidentDate}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label htmlFor="policyExcessAmount" className="block mb-1 font-bold">
                            Policy Excess Amount <span className="text-sm font-normal text-gray-500">(Check your policy details)</span>
                          </label>
                          <input
                            type="text"
                            id="policyExcessAmount"
                            name="policyExcessAmount"
                            value={formData.policyExcessAmount}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="policyExpiryDate" className="block mb-1 font-bold">
                            Policy Expiry Date <span className="text-sm font-normal text-gray-500">(Must be valid during repair)</span>
                          </label>
                          <input
                            type="date"
                            id="policyExpiryDate"
                            name="policyExpiryDate"
                            value={formData.policyExpiryDate}
                            onChange={handleInputChange}
                            className="w-full p-2 border rounded"
                            required
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="mb-4">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox" 
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-1"
                        required
                      />
                      <span className="text-sm text-gray-600">
                        I agree to the <button type="button" className="text-[#0FB8C1] underline">Terms & Conditions</button> and understand that my data will be used in accordance with the <button type="button" className="text-[#0FB8C1] underline">Privacy Policy</button>
                      </span>
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={!termsAccepted}
                    className={`w-full py-3 rounded-full text-lg font-semibold transition duration-300 ${
                      termsAccepted 
                        ? 'bg-[#0FB8C1] text-white hover:bg-[#0DA6AE]' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    Get My Quote
                  </button>
                </form>

                <button 
                  onClick={() => router.push({
                    pathname: '/damage-location',
                    query: { 
                      vehicleReg: vehicleRegString,
                      postcode: formData.postcode
                    }
                  })} 
                  className="mt-4 text-[#0FB8C1] underline"
                >
                  Back
                </button>
              </div>

              <div className="w-full lg:w-80 bg-gray-100 p-4 rounded-lg lg:sticky lg:top-4">
                {/* License Plate */}
                <div 
                  className="bg-white p-2 rounded-lg text-center relative overflow-hidden w-full mx-auto border-2 border-gray-300 mb-4" 
                  style={{ 
                    fontFamily: 'Arial',
                    letterSpacing: '1px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#234B9A] flex flex-col items-center justify-center">
                    <div className="text-white text-[8px] font-bold mb-0.5">GB</div>
                    <div className="text-white text-[6px] font-bold">UK</div>
                  </div>
                  <span className="text-xl font-bold text-black w-full pl-12">
                    {vehicleRegString?.toUpperCase() || 'UNKNOWN'}
                  </span>
                </div>

                <div className="bg-white p-4 rounded-lg">
                  {/* Glass Damage Section */}
                  <div className="mb-4">
                    <div className="text-gray-500 text-sm uppercase font-bold mb-1 flex items-center gap-2">
                      <Car className="w-4 h-4 text-[#0FB8C1]" />
                      GLASS DAMAGE
                    </div>
                    {selectedWindows.size > 0 ? (
                      Array.from(selectedWindows).map((windowId) => (
                        <div key={windowId} className="mb-3 bg-gray-50 rounded-lg p-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center">
                              <span className="px-4 py-1.5 bg-pink-100 text-pink-800 rounded-full text-sm font-medium">
                                {regions.find(r => r.id === windowId)?.label || windowId}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2 mt-1">
                              {windowDamage[windowId] && (
                                <div className="flex items-center gap-2">
                                  <span className="text-gray-500 text-sm font-medium">Damage:</span>
                                  <span className="text-sm bg-white border border-gray-200 px-3 py-1 rounded-full">
                                    {windowDamage[windowId]}
                                    {windowDamage[windowId] === 'Chipped' && chipSize && (
                                      <span className="text-pink-600"> ({chipSize === 'Yes is larger than 5p coin' ? 'Larger than 5p' : 'Smaller than 5p'})</span>
                                    )}
                                  </span>
                                </div>
                              )}
                              {windowId === 'jqvmap1_ws' && parsedSpecifications?.length > 0 && (
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-500 text-sm font-medium mt-1">Features:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {parsedSpecifications.map((spec) => (
                                      <span key={spec} className="text-sm bg-white border border-gray-200 px-3 py-1 rounded-full">
                                        {spec}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 italic">No glass selected</div>
                    )}
                  </div>

                  {/* Vehicle Details Section */}
                  <div>
                    <div className="text-gray-500 text-sm uppercase font-bold mb-1 flex items-center gap-2">
                      <Info className="w-4 h-4 text-[#0FB8C1]" />
                      MAIN DETAILS
                    </div>
                    <div className="grid gap-2 mb-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className={vehicleInfoStyles.label}>MAKE</div>
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {vehicleDetails?.manufacturer}
                          </div>
                        </div>
                        <div>
                          <div className={vehicleInfoStyles.label}>YEAR</div>
                          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                            {vehicleDetails?.year}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className={vehicleInfoStyles.label}>MODEL</div>
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                          {vehicleDetails?.model}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-gray-500 text-sm uppercase font-bold mb-1 flex items-center gap-2">
                        <Car className="w-4 h-4 text-[#0FB8C1]" />
                        VEHICLE CHARACTERISTICS
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {vehicleDetails?.doorPlan}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {vehicleDetails?.type}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          {vehicleDetails?.colour}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="bg-gray-800 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <h3 className="font-bold mb-4 text-[#0FB8C1]">INFO</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-[#0FB8C1]">Windscreen Replacement</Link></li>
                <li><Link href="#" className="hover:text-[#0FB8C1]">Car Manufacturers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-[#0FB8C1]">CUSTOMER</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-[#0FB8C1]">Get a Free Quote</Link></li>
                <li><Link href="#" className="hover:text-[#0FB8C1]">Contact Us</Link></li>
                <li><Link href="#" className="hover:text-[#0FB8C1]">FAQ's</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-[#0FB8C1]">WINDSCREEN COMPARE</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-[#0FB8C1]">About</Link></li>
                <li><Link href="#" className="hover:text-[#0FB8C1]">Careers</Link></li>
                <li><Link href="#" className="hover:text-[#0FB8C1]">Sustainability</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold mb-4 text-[#0FB8C1]">HEAD OFFICE</h3>
              <p className="text-sm">Unit 1a</p>
              <p className="text-sm">179 Ilderton Road</p>
              <p className="text-sm">London</p>
              <p className="text-sm">SE16 3LA</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default ContactDetails