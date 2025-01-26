import React from 'react'

interface CarDiagramProps {
  selectedWindows: Set<string>
  handleWindowClick: (windowId: string) => void
  handleMouseMove: (event: React.MouseEvent) => void
  setHoverTooltip: (tooltip: string) => void
}

export const CarDiagram: React.FC<CarDiagramProps> = ({
  selectedWindows,
  handleWindowClick,
  handleMouseMove,
  setHoverTooltip
}) => {
  // Example window IDs - adjust these based on your needs
  const windowIds = ['windshield', 'rear', 'frontLeft', 'frontRight', 'rearLeft', 'rearRight']

  return (
    <div className="w-full lg:w-2/3 bg-white rounded-lg p-4 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Select Damaged Window</h2>
      <div className="grid grid-cols-2 gap-4">
        {windowIds.map((windowId) => (
          <button
            key={windowId}
            onClick={() => handleWindowClick(windowId)}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setHoverTooltip(windowId)}
            onMouseLeave={() => setHoverTooltip('')}
            className={`p-4 border rounded-lg ${
              selectedWindows.has(windowId) ? 'bg-blue-100 border-blue-500' : 'border-gray-200'
            }`}
          >
            {windowId.replace(/([A-Z])/g, ' $1').trim()}
          </button>
        ))}
      </div>
    </div>
  )
} 