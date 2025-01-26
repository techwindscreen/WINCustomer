import { regions } from './types'

interface CarDiagramProps {
  selectedWindows: Set<string>
  handleWindowClick: (windowId: string) => void
  handleMouseMove: (e: React.MouseEvent, label: string) => void
  setHoverTooltip: (value: { text: string; x: number; y: number } | null) => void
}

export const CarDiagram: React.FC<CarDiagramProps> = ({
  selectedWindows,
  handleWindowClick,
  handleMouseMove,
  setHoverTooltip
}) => {
  return (
    <div className="relative w-full" style={{ maxWidth: '529.5px' }}>
      <div className="relative w-full" style={{ paddingBottom: '75.54%' }}>
        <div className="absolute inset-0 bg-white">
          <svg 
            viewBox="0 0 529.5 400"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full focus:outline-none"
            aria-labelledby="carMapTitle carMapDesc" 
            role="img"
          >
            {/* SVG content from original file */}
          </svg>
        </div>
      </div>
    </div>
  )
} 