"use client"

import { useState } from "react"
import { X } from 'lucide-react'
import { Button } from "./button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select"

const DAMAGE_TYPES = {
  'Chip': { min: 50, max: 100 },
  'Crack': { min: 150, max: 300 },
  'Smashed': { min: 250, max: 500 },
  'Leaking': { min: 200, max: 400 }
}

const VEHICLE_TYPES = {
  'Standard Car': 1,
  'Luxury Car': 1.5,
  'Van': 1.3,
  'SUV': 1.2
}

export const QuoteCalculator = () => {
  const [isOpen, setIsOpen] = useState(true)
  const [damageType, setDamageType] = useState<keyof typeof DAMAGE_TYPES>()
  const [vehicleType, setVehicleType] = useState<keyof typeof VEHICLE_TYPES>()
  const [quote, setQuote] = useState<{ min: number; max: number } | null>(null)

  const calculateQuote = () => {
    if (!damageType || !vehicleType) return

    const baseQuote = DAMAGE_TYPES[damageType]
    const multiplier = VEHICLE_TYPES[vehicleType]

    setQuote({
      min: Math.round(baseQuote.min * multiplier),
      max: Math.round(baseQuote.max * multiplier)
    })
  }

  if (!isOpen) {
    return (
      <Button 
        className="fixed bottom-4 right-4 bg-[#0FB8C1] hover:bg-[#0FB8C1]/90 text-white"
        onClick={() => setIsOpen(true)}
      >
        Get Quick Quote
      </Button>
    )
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 shadow-lg">
      <CardHeader className="relative pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
        <CardTitle className="text-lg">Quick Quote Calculator</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Type of Damage</label>
          <Select onValueChange={(value) => setDamageType(value as keyof typeof DAMAGE_TYPES)}>
            <SelectTrigger>
              <SelectValue placeholder="Select damage type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(DAMAGE_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Vehicle Type</label>
          <Select onValueChange={(value) => setVehicleType(value as keyof typeof VEHICLE_TYPES)}>
            <SelectTrigger>
              <SelectValue placeholder="Select vehicle type" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(VEHICLE_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {quote && (
          <div className="mt-4 p-3 bg-[#E6F7F8] rounded-lg">
            <p className="text-sm font-medium text-center">Estimated Quote</p>
            <p className="text-xl font-bold text-center text-[#0FB8C1]">
              £{quote.min} - £{quote.max}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full bg-[#0FB8C1] hover:bg-[#0FB8C1]/90 text-white"
          onClick={calculateQuote}
          disabled={!damageType || !vehicleType}
        >
          Calculate Quote
        </Button>
      </CardFooter>
    </Card>
  )
}

