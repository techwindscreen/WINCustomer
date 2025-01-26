import { Clock, Wallet, Shield } from 'lucide-react'

export const Benefits = () => {
  return (
    <div className="max-w-4xl mx-auto mt-8 sm:mt-16 px-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-[#E6F7F8] rounded-full flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-[#0FB8C1]" />
          </div>
          <h3 className="font-semibold mb-2">Transparent Prices</h3>
          <p className="text-sm text-gray-600">Compare prices instantly from local technicians</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-[#E6F7F8] rounded-full flex items-center justify-center mb-4">
            <Wallet className="w-6 h-6 text-[#0FB8C1]" />
          </div>
          <h3 className="font-semibold mb-2">Book Now Pay Later</h3>
          <p className="text-sm text-gray-600">Flexible payment options available</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-[#E6F7F8] rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-[#0FB8C1]" />
          </div>
          <h3 className="font-semibold mb-2">Insurance Quotes Available</h3>
          <p className="text-sm text-gray-600">We work with all major insurers</p>
        </div>
      </div>
    </div>
  )
} 