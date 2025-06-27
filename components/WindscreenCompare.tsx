import React, { useState, FormEvent, useEffect } from 'react'
import { useRouter } from 'next/router'

import { Header } from './sections/Header'
import { ProgressSteps } from './sections/ProgressSteps'
import { QuoteForm } from './sections/QuoteForm'
import { Benefits } from './sections/Benefits'
import { HowItWorks } from './sections/HowItWorks'
import { Footer } from './sections/Footer'

const WindscreenCompare: React.FC = () => {
  const router = useRouter()
  const [vehicleReg, setVehicleReg] = useState('')
  const [postcode, setPostcode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Load saved data from localStorage if available
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('windscreenCompareData');
      if (savedData) {
        const { vehicleReg: savedReg, postcode: savedPostcode } = JSON.parse(savedData);
        setVehicleReg(savedReg);
        setPostcode(savedPostcode);
      }
    }
  }, []);

  // UK postcode validation - covers most common formats
  const isValidUKPostcode = (postcode: string) => {
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    return postcodeRegex.test(postcode.trim());
  };

  // Vehicle reg validation - bit loose but should catch most cases
  const isValidUKVehicleReg = (reg: string) => {
    const regRegex = /^[A-Z]{2}[0-9]{2}[A-Z]{3}$|^[A-Z][0-9]{3}[A-Z]{3}$|^[A-Z]{2}[0-9]{2} [A-Z]{3}$|^[A-Z][0-9]{3} [A-Z]{3}$/i;
    return regRegex.test(reg.trim());
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic validation first
    if (!vehicleReg || !postcode) {
      setError('Please fill in all fields');
      return;
    }

    if (!isValidUKVehicleReg(vehicleReg)) {
      setError('Please enter a valid UK vehicle registration');
      return;
    }

    if (!isValidUKPostcode(postcode)) {
      setError('Please enter a valid UK postcode');
      return;
    }

    // Generate a unique quote ID - using timestamp + random chars
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    const quoteID = `WIN${timestamp}${random}`;
    
    // console.log('Generated quote ID:', quoteID); // TODO: remove before prod

    try {
      // Save to localStorage for later use
      if (typeof window !== 'undefined') {
        localStorage.setItem('windscreenCompareData', JSON.stringify({
          vehicleReg: vehicleReg.toUpperCase(),
          postcode: postcode.toUpperCase(),
          quoteID
        }));
      }

      // Track quote started event in Klaviyo - this is optional
      try {
        await fetch('/api/track-quote-started', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vehicleReg: vehicleReg.toUpperCase(),
            quoteId: quoteID,
            // Note: userEmail and userPhone not available at this stage
          }),
        });
      } catch (trackingError) {
        console.error('Tracking error:', trackingError);
        // Don't block user flow if tracking fails - not critical
      }

      // Navigate to next step
      router.push({
        pathname: '/damage-location',
        query: { 
          vehicleReg: vehicleReg.toUpperCase(), 
          postcode: postcode.toUpperCase(),
          quoteID: quoteID
        }
      });
    } catch (error: any) {
      console.error('Navigation error:', error);
      setError(`Error: ${error.message}`);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      
      <main className="flex-grow bg-white">
        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
          <ProgressSteps />

          <h2 className="text-3xl font-bold text-center mb-2 mt-12 sm:mt-0">
            In Just <span className="text-[#0FB8C1]">4 Simple Steps</span>
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Compare prices from local car glass technicians
          </p>

          <QuoteForm 
            vehicleReg={vehicleReg}
            postcode={postcode}
            error={error}
            setVehicleReg={setVehicleReg}
            setPostcode={setPostcode}
            handleSubmit={handleSubmit}
          />

          <Benefits />
          <HowItWorks />
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default WindscreenCompare
