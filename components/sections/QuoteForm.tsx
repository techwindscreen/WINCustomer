import { FormEvent } from 'react'

interface QuoteFormProps {
  vehicleReg: string
  postcode: string
  error: string
  vehicleRegError: boolean
  isValidatingVehicle: boolean
  setVehicleReg: (value: string) => void
  setPostcode: (value: string) => void
  handleSubmit: (e: FormEvent) => void
}

export const QuoteForm = ({ vehicleReg, postcode, error, vehicleRegError, isValidatingVehicle, setVehicleReg, setPostcode, handleSubmit }: QuoteFormProps) => {
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white shadow-md rounded-lg overflow-hidden">
      {/* Show error msg if there's one */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded relative mb-4 mx-4 sm:mx-6 mt-4 sm:mt-6 text-sm sm:text-base">
          <span className="block">{error}</span>
        </div>
      )}
      <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="vehicle-registration" className="block text-sm font-medium text-gray-700 mb-1">
            VEHICLE REGISTRATION
          </label>
          <input
            type="text"
            id="vehicle-registration"
            value={vehicleReg}
            onChange={(e) => setVehicleReg(e.target.value)}
            placeholder="Enter Number Plate"
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              vehicleRegError 
                ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-[#0FB8C1] focus:border-[#0FB8C1]'
            }`}
            required
          />
        </div>
        <div>
          <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
            POSTCODE
          </label>
          <input
            type="text"
            id="postcode"
            value={postcode}
            onChange={(e) => setPostcode(e.target.value)}
            placeholder="Enter Postcode"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0FB8C1]"
            required
          />
        </div>
      </div>
      <div className="px-6 pb-6">
        {/* TODO: implement manual entry modal */}
        <p className="text-sm text-gray-600 mb-4 underline cursor-pointer">Not sure? Enter car details manually</p>
        <button 
          type="submit"
          disabled={isValidatingVehicle}
          className={`w-full py-3 rounded-full transition duration-300 text-lg font-semibold ${
            isValidatingVehicle
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-[#0FB8C1] text-white hover:bg-[#0DA6AE]'
          }`}
        >
          {isValidatingVehicle ? 'Validating Vehicle...' : "Let's Go"}
        </button>
      </div>
    </form>
  )
} 