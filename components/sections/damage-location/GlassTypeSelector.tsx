import { Info, X } from 'lucide-react'

interface GlassTypeSelectorProps {
  glassType: 'OEM' | 'OEE'
  setGlassType: (type: 'OEM' | 'OEE') => void
  activeTooltip: string | null
  setActiveTooltip: (tooltip: string | null) => void
  windowWidth: number
}

export const GlassTypeSelector: React.FC<GlassTypeSelectorProps> = ({
  glassType,
  setGlassType,
  activeTooltip,
  setActiveTooltip,
  windowWidth
}) => {
  return (
    <div className="mt-8 bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100">
      {/* Glass type selection content from original file */}
    </div>
  )
} 