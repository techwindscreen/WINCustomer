import Image from 'next/image'
import { VehicleDetails } from './types'

interface VehicleInfoProps {
  vehicleReg: string | string[]
  vehicleDetails: VehicleDetails | null
  selectedWindows: Set<string>
  windowDamage: { [key: string]: string | null }
  chipSize: string | null
  selectedSpecifications: Set<string>
}

export const VehicleInfo: React.FC<VehicleInfoProps> = ({
  vehicleReg,
  vehicleDetails,
  selectedWindows,
  windowDamage,
  chipSize,
  selectedSpecifications
}) => {
  return (
    <div className="w-full lg:w-64 shrink-0 bg-gray-100 p-4 rounded-lg lg:sticky lg:top-4">
      {/* Registration plate and vehicle details from original file */}
    </div>
  )
} 