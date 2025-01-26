import React from 'react'
import ContactDetails from '../components/ContactInfo'

export default function ContactDetailsPage() {
  // You might want to fetch the vehicleReg from a global state or URL parameter
  const vehicleReg = "ABC123" // This is a placeholder. Replace with actual logic to get vehicleReg.

  return (
    <ContactDetails vehicleReg={vehicleReg} />
  )
}