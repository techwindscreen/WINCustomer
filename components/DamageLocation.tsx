import React, { useState, useEffect, useRef, Fragment } from 'react'
import { Car, Info, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import Airtable from 'airtable'
import Image from 'next/image'
import { generateArgicCode, GlassProperties } from './argic-code-generator'
import { Footer } from './sections/Footer'

interface DamageLocationProps {
  vehicleReg: string
  location: string
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

interface DamageDescription {
  [key: string]: {
    [key: string]: string;
  };
}

const damageDescriptions: DamageDescription = {
  'Windscreen': {
    'Smashed': 'Complete breakage of the glass requiring full replacement. The glass may be shattered, severely cracked, or have a hole through it.',
    'Cracked': 'A line or split in the glass that extends across the windscreen. May be straight or branched.',
    'Scratched': 'Surface damage that affects visibility or appearance. Can be caused by worn wipers or vandalism.',
    'Chipped': 'Small piece of glass missing from the surface, typically caused by stones or debris.',
    'Leaking': 'Water entering the vehicle around the windscreen seal, indicating a compromised seal or incorrect installation.'
  },
  'Door glass': {
    'Smashed': 'Window is completely broken and needs full replacement.',
    'Leaking': 'Water entering around the window seal when it rains or during car washing.',
    'Faulty Mechanism': 'Window doesn\'t move smoothly, makes noise, or won\'t move at all when using controls.'
  },
  'Vent glass': {
    'Smashed': 'Small window is completely broken and needs replacement.',
    'Leaking': 'Water entering around the vent window seal.',
    'Faulty Mechanism': 'Vent window doesn\'t open/close properly or has seal issues.'
  },
  'Quarter glass': {
    'Smashed': 'Small rear window is completely broken and needs replacement.',
    'Leaking': 'Water entering around the quarter glass seal.',
    'Faulty Mechanism': 'Issues with the seal or mounting of the quarter glass.'
  },
  'Rear Window': {
    'Smashed': 'Back window is completely broken and needs full replacement.',
    'Leaking': 'Water entering around the rear window seal.',
    'Faulty Mechanism': 'Issues with the rear window defroster or seal.'
  }
};

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
]

const chipSizeDescription = {
  title: 'Chip Size Guide',
  description: 'A 5p coin is approximately 18mm in diameter. If your chip is larger than this, it may require different repair techniques or full replacement. Smaller chips can often be repaired more easily.',
};

const specificationDescriptions = {
  'No Modification': 'Standard windscreen without any additional features or technology',
  'Sensor': 'Includes rain sensors or light sensors that automatically activate wipers or lights',
  'Camera': 'Has built-in cameras for features like lane departure warning or automatic emergency braking',
  'Heated': 'Contains heating elements to defrost or defog the windscreen',
  'Heads Up Display': 'Projects driving information onto the windscreen in your line of sight',
  'Aerial Antenna': 'Integrated radio antenna within the glass',
  'Not Sure?': 'Select this if you\'re unsure about your windscreen\'s features'
};

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

// Add this new utility function at the top level of the component
const getTooltipPosition = (windowWidth: number) => {
  // Use 768px as breakpoint for mobile
  if (windowWidth < 768) {
    return "absolute left-0 top-full mt-2 w-full bg-white shadow-lg rounded-lg p-4 z-50 border border-gray-200";
  }
  return "absolute right-0 top-0 -translate-y-1/2 translate-x-full w-80 bg-white shadow-lg rounded-lg p-4 z-50 border border-gray-200";
};

const DamageLocation: React.FC<DamageLocationProps> = () => {
  const router = useRouter()
  const { vehicleReg } = router.query
  const [selectedWindows, setSelectedWindows] = useState<Set<string>>(new Set())
  const [currentStep, setCurrentStep] = useState(2)
  const [windowDamage, setWindowDamage] = useState<{ [key: string]: string | null }>({})
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(null)
  const [selectedSpecifications, setSelectedSpecifications] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState('')
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [chipSize, setChipSize] = useState<string | null>(null);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [hoverTooltip, setHoverTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [isContinueLoading, setIsContinueLoading] = useState(false);
  const [hasHandledImageUpload, setHasHandledImageUpload] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [glassType, setGlassType] = useState<'OEM' | 'OEE'>('OEE');
  // Add new state for window width
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0);

  // Function to process vehicle data
const processVehicleData = (vehicleDetails: VehicleDetails, windowSpecifications: string[]) => {
  // Example: log data to understand the structure, or send it to an API
  console.log("Processing Vehicle Data:");
  console.log("Vehicle Details:", vehicleDetails);
  console.log("Window Specifications:", windowSpecifications);

  // Implementation of data handling can go here, e.g., send data to an external API or process it further.
  // This part can be customized based on what the function needs to do with these values.
};

const uploadVehicleDetailsToAirtable = async (details: VehicleDetails) => {
  try {
    const quoteId = router.query.quoteID as string;
    
    if (!quoteId) {
      console.error('No quoteID found in router query');
      return false;
    }

    const response = await fetch('/api/upload-vehicle-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteId,
        vehicleReg,
        vehicleDetails: details
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error('Upload failed:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error uploading vehicle details:', error);
    return false;
  }
};

const generateAndUploadArgicCode = async (quoteId: string) => {
  if (!vehicleDetails || !selectedWindows) return;

  const glassProps: GlassProperties = {
    type: 'standard',
    color: 'clear',
    stripe: 'none',
    modifications: Array.from(selectedSpecifications)
  };

  const code = generateArgicCode(vehicleDetails, selectedWindows, glassProps);

  try {
    const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY })
      .base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

    // First, find the record with the matching QuoteID
    const records = await base('Submissions').select({
      filterByFormula: `{QuoteID} = '${quoteId}'`
    }).firstPage();

    if (records && records.length > 0) {
      await base('Submissions').update([
        {
          id: records[0].id,
          fields: {
            'Argic Code': code
          }
        }
      ]);
    } else {
      console.error('No record found with QuoteID:', quoteId);
    }
  } catch (error) {
    console.error('Error updating ARGIC code:', error);
  }
};

 
    // ... other state declarations remain the same
  //vehicleReg = 'HN11EYA';
  useEffect(() => {
    if (vehicleReg) {
      fetchVehicleDetails();
    }
  }, [vehicleReg]);

  const fetchVehicleDetails = async () => {
    console.log('fetchVehicleDetails called with vehicleReg:', vehicleReg);
    
    if (!vehicleReg) {
      console.log('No vehicleReg provided');
      setVehicleDetails(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleData?v=2&api_nullitems=1&auth_apikey=6193cc7a-c1b2-469c-ad41-601c6faa294c&key_VRM=${vehicleReg}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.Response.StatusCode === "Success") {
        const vehicleInfo = data.Response.DataItems;
        
        const details = {
          manufacturer: vehicleInfo.ClassificationDetails?.Dvla?.Make || 'Unknown',
          model: vehicleInfo.ClassificationDetails?.Dvla?.Model || 'Unknown',
          year: vehicleInfo.VehicleRegistration?.YearOfManufacture || 'Unknown',
          colour: vehicleInfo.VehicleRegistration?.Colour || 'Unknown',
          type: vehicleInfo.VehicleRegistration?.VehicleClass || 'Unknown',
          style: vehicleInfo.SmmtDetails?.BodyStyle || 'Unknown',
          doorPlan: `${vehicleInfo.TechnicalDetails?.Dimensions?.NumberOfDoors || '?'} Doors` || 'Unknown'
        };

        setVehicleDetails(details);
        await uploadVehicleDetailsToAirtable(details);

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
  };

  const handleWindowClick = (windowId: string) => {
    setSelectedWindows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(windowId)) {
        newSet.delete(windowId)
      } else {
        newSet.add(windowId)
      }
      return newSet
    })
  }

  const windows = [
    { id: 'windshield', path: 'M100,100 L900,100 L850,250 L150,250 Z' },
    { id: 'rear', path: 'M150,550 L850,550 L900,700 L100,700 Z' },
    { id: 'driver-front', path: 'M50,250 L150,250 L150,400 L50,420 Z' },
    { id: 'driver-rear', path: 'M150,400 L150,550 L50,580 L50,420 Z' },
    { id: 'passenger-front', path: 'M850,250 L950,250 L950,420 L850,400 Z' },
    { id: 'passenger-rear', path: 'M850,400 L950,420 L950,580 L850,550 Z' },
  ]

  const renderDamageOptions = (windowId: string) => {
    const windowLabel = regions.find(r => r.id === windowId)?.label;
    let title = '';
    let damageOptions: string[] = [];
    
    if (windowId === 'jqvmap1_ws') {
      title = 'Windscreen'
      damageOptions = ['Smashed', 'Cracked', 'Scratched', 'Chipped', 'Leaking']
    } else if (windowId.includes('df') || windowId.includes('dg') || 
               windowId.includes('dr') || windowId.includes('dd')) {
      title = `Door glass (${windowLabel?.toLowerCase()})`
      damageOptions = ['Smashed', 'Leaking', 'Faulty Mechanism']
    } else if (windowId.includes('vp') || windowId.includes('vf') || 
               windowId.includes('vr') || windowId.includes('vg')) {
      title = `Vent glass (${windowLabel?.toLowerCase()})`
      damageOptions = ['Smashed', 'Leaking', 'Faulty Mechanism']
    } else if (windowId.includes('qr') || windowId.includes('qg')) {
      title = `Quarter glass (${windowLabel?.toLowerCase()})`
      damageOptions = ['Smashed', 'Leaking', 'Faulty Mechanism']
    } else if (windowId === 'jqvmap1_rw') {
      title = 'Rear Window'
      damageOptions = ['Smashed', 'Leaking', 'Faulty Mechanism']
    }
  
    return (
      <div className="mt-8 border-b border-gray-200 pb-8">
        <h3 className="text-2xl font-bold mb-4">{title}</h3>
        <div className="flex items-center mb-4 text-lg relative">
          <p>Is your {title.toLowerCase()}...</p>
          <button
            onClick={() => setActiveTooltip(activeTooltip === title ? null : title)}
            className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <Info size={20} />
          </button>
          
          {/* Updated Tooltip/Popup */}
          {activeTooltip === title && (
            <div className={getTooltipPosition(windowWidth)}>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-bold text-lg">{title} Damage Types</h4>
                <button
                  onClick={() => setActiveTooltip(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                {damageOptions.map(damage => (
                  <div key={damage} className="border-b border-gray-100 pb-2">
                    <p className="font-semibold text-sm">{damage}</p>
                    <p className="text-sm text-gray-600">
                      {damageDescriptions[title]?.[damage] || 'Description not available'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          {damageOptions.map((damage) => (
            <button
              key={damage}
              onClick={() => {
                setWindowDamage(prev => ({ ...prev, [windowId]: damage }))
                if (damage !== 'Chipped') {
                  setChipSize(null);
                }
              }}
              className={`
                px-6 py-3 rounded-full border-2 transition-all
                ${windowDamage[windowId] === damage 
                  ? 'border-[#0FB8C1] bg-white text-[#0FB8C1]' 
                  : 'border-gray-300 hover:border-gray-400 bg-white text-gray-700'}
              `}
            >
              {damage}
            </button>
          ))}
        </div>
  
        {/* Add chip size question when Chipped is selected */}
        {windowDamage[windowId] === 'Chipped' && (
          <div className="mt-6">
            <div className="flex items-center mb-4 text-lg relative">
              <p>Is the chip larger than a 5p coin?</p>
              <button
                onClick={() => setActiveTooltip(activeTooltip === 'chipSize' ? null : 'chipSize')}
                className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <Info size={20} />
              </button>
              
              {/* Updated Tooltip/Popup */}
              {activeTooltip === 'chipSize' && (
                <div className={getTooltipPosition(windowWidth)}>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-bold text-lg">{chipSizeDescription.title}</h4>
                    <button
                      onClick={() => setActiveTooltip(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">{chipSizeDescription.description}</p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {['Yes', 'No'].map((size) => (
                <button
                  key={size}
                  onClick={() => setChipSize(size)}
                  className={`
                    px-6 py-3 rounded-full border-2 transition-all
                    ${chipSize === size
                      ? 'border-[#0FB8C1] bg-white text-[#0FB8C1]'
                      : 'border-gray-300 hover:border-gray-400 bg-white text-gray-700'}
                  `}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}
  
        {/* Show specifications only after damage type is selected */}
        {windowId === 'jqvmap1_ws' && windowDamage[windowId] && (
          windowDamage[windowId] === 'Chipped' ? (
            chipSize === 'Yes' && (  // Only show if chip size is "Yes"
              <>
                <div className="mt-8">
                  <div className="flex items-center mb-4 relative">
                    <h3 className="text-xl font-bold">Select your windscreen specifications</h3>
                    <button
                      onClick={() => setActiveTooltip(activeTooltip === 'specifications' ? null : 'specifications')}
                      className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <Info size={20} />
                    </button>
                    
                    {/* Updated Tooltip/Popup */}
                    {activeTooltip === 'specifications' && (
                      <div className={getTooltipPosition(windowWidth)}>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-lg">Windscreen Features</h4>
                          <button
                            onClick={() => setActiveTooltip(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          {Object.entries(specificationDescriptions).map(([spec, description]) => (
                            <div key={spec} className="border-b border-gray-100 pb-2">
                              <p className="font-semibold text-sm">{spec}</p>
                              <p className="text-sm text-gray-600">{description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {['No Modification', 'Sensor', 'Camera', 'Heated', 'Heads Up Display', 'Aerial Antenna', 'Not Sure?'].map((spec) => (
                      <button
                        key={spec}
                        onClick={() => setSelectedSpecifications(prev => {
                          const newSet = new Set(prev)
                          if (newSet.has(spec)) {
                            newSet.delete(spec)
                          } else {
                            newSet.add(spec)
                          }
                          return newSet
                        })}
                        className={`
                          px-6 py-3 rounded-full border-2 transition-all
                          ${selectedSpecifications.has(spec)
                            ? 'border-[#0FB8C1] bg-white text-[#0FB8C1]'
                            : 'border-gray-300 hover:border-gray-400 bg-white text-gray-700'}
                        `}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Show upload image section after specifications */}
                <div className="mt-6">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className={`mt-6 px-6 py-3 rounded-full bg-[#0FB8C1] text-white flex items-center justify-center hover:bg-[#0CA7AF] transition-colors ${
                      isLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <Upload className="mr-2" size={20} />
                    {isLoading ? 'Uploading...' : 'Upload An Image'}
                    {uploadedImages.length > 0 && !isLoading && (
                      <span className="ml-2">({uploadedImages.length})</span>
                    )}
                  </button>

                  {/* Image previews */}
                  {uploadedImages.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {uploadedImages.map((imageUrl, index) => (
                        <div key={index} className="relative">
                          <img
                            src={imageUrl}
                            alt={`Upload ${index + 1}`}
                            className="w-20 h-20 object-cover rounded"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )
          ) : windowDamage[windowId] === 'Leaking' ? (
            // For leaking damage, only show upload and comments
            <div className="mt-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className={`mt-6 px-6 py-3 rounded-full bg-[#0FB8C1] text-white flex items-center justify-center hover:bg-[#0CA7AF] transition-colors ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Upload className="mr-2" size={20} />
                {isLoading ? 'Uploading...' : 'Upload An Image'}
                {uploadedImages.length > 0 && !isLoading && (
                  <span className="ml-2">({uploadedImages.length})</span>
                )}
              </button>

              {/* Image previews */}
              {uploadedImages.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {uploadedImages.map((imageUrl, index) => (
                    <div key={index} className="relative">
                      <img
                        src={imageUrl}
                        alt={`Upload ${index + 1}`}
                        className="w-20 h-20 object-cover rounded"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : windowDamage[windowId] ? ( // Only show specifications if damage type is selected
            <>
              <div className="mt-8">
                <div className="flex items-center mb-4 relative">
                  <h3 className="text-xl font-bold">Select your windscreen specifications</h3>
                  <button
                    onClick={() => setActiveTooltip(activeTooltip === 'specifications' ? null : 'specifications')}
                    className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <Info size={20} />
                  </button>
                  
                  {/* Updated Tooltip/Popup */}
                  {activeTooltip === 'specifications' && (
                    <div className={getTooltipPosition(windowWidth)}>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg">Windscreen Features</h4>
                        <button
                          onClick={() => setActiveTooltip(null)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        {Object.entries(specificationDescriptions).map(([spec, description]) => (
                          <div key={spec} className="border-b border-gray-100 pb-2">
                            <p className="font-semibold text-sm">{spec}</p>
                            <p className="text-sm text-gray-600">{description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  {['No Modification', 'Sensor', 'Camera', 'Heated', 'Heads Up Display', 'Aerial Antenna', 'Not Sure?'].map((spec) => (
                    <button
                      key={spec}
                      onClick={() => setSelectedSpecifications(prev => {
                        const newSet = new Set(prev)
                        if (newSet.has(spec)) {
                          newSet.delete(spec)
                        } else {
                          newSet.add(spec)
                        }
                        return newSet
                      })}
                      className={`
                        px-6 py-3 rounded-full border-2 transition-all
                        ${selectedSpecifications.has(spec)
                          ? 'border-[#0FB8C1] bg-white text-[#0FB8C1]'
                          : 'border-gray-300 hover:border-gray-400 bg-white text-gray-700'}
                      `}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload image section */}
              <div className="mt-6">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className={`mt-6 px-6 py-3 rounded-full bg-[#0FB8C1] text-white flex items-center justify-center hover:bg-[#0CA7AF] transition-colors ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
                >
                  <Upload className="mr-2" size={20} />
                  {isLoading ? 'Uploading...' : 'Upload An Image'}
                  {uploadedImages.length > 0 && !isLoading && (
                    <span className="ml-2">({uploadedImages.length})</span>
                  )}
                </button>

                {/* Image previews */}
                {uploadedImages.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {uploadedImages.map((imageUrl, index) => (
                      <div key={index} className="relative">
                        <img
                          src={imageUrl}
                          alt={`Upload ${index + 1}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null // Don't show anything if no damage type is selected
        )}
  
        {/* Comments button - moved outside the conditional rendering */}
        <button
          onClick={() => {
            if (!isCommentsVisible) {
              setComments('');
              setIsCommentsVisible(true);
            } else {
              setIsCommentsVisible(false);
            }
          }}
          className="text-[#0FB8C1] underline mt-4 hover:text-[#0CA7AF]"
        >
          {isCommentsVisible ? '- Hide Comments' : '+ Add Comments'}
        </button>
        {isCommentsVisible && (
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full mt-4 p-4 border-2 border-gray-300 rounded-lg focus:border-[#0FB8C1] focus:ring-0"
            rows={4}
            placeholder="Add your comments here..."
          />
        )}
      </div>
    )
  }
  
  const handleContinue = async () => {
    setIsContinueLoading(true);
    
    try {
      const quoteID = router.query.quoteID as string;
      const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY })
        .base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

      const submissionData = {
        fields: {
          'QuoteID': quoteID,
          'Vehicle Registration': vehicleReg,
          'Postcode': router.query.postcode as string,
          'Submission Date': new Date().toISOString(),
          'Selected Windows': Array.from(selectedWindows).join(', '),
          'Window Damage': Array.from(selectedWindows).map(windowId => {
            const windowLabel = regions.find(r => r.id === windowId)?.label;
            const damageType = windowDamage[windowId];
            const chipSizeInfo = damageType === 'Chipped' ? ` (${chipSize} greater than 5p)` : '';
            return `${windowLabel}: ${damageType}${chipSizeInfo}`;
          }).join(', '),
          'Windscreen Specifications': Array.from(selectedSpecifications).join(', '),
          'Comments': comments
        }
      };

      const records = await base('Submissions').create([submissionData]);
      const recordId = records[0].id;

      // Navigate to contact info with all necessary details
      await router.push({
        pathname: '/contact-info',
        query: {
          vehicleReg,
          quoteID: String(records[0].fields.QuoteID || ''),
          recordId: recordId,
          selectedWindows: JSON.stringify(Array.from(selectedWindows)),
          windowDamage: JSON.stringify(windowDamage),
          specifications: JSON.stringify(Array.from(selectedSpecifications)),
          chipSize: chipSize || '',
          comments
        }
      });

      await generateAndUploadArgicCode(String(records[0].fields.QuoteID));

    } catch (error) {
      console.error('Error:', error);
      setError('Failed to save damage information');
    } finally {
      setIsContinueLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);

    try {
      const file = files[0];
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { url } = await uploadResponse.json();
      console.log('Uploaded image URL:', url);

      setUploadedImages((prev) => [...prev, url]);

      // Airtable integration
      const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY })
        .base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);

      const records = await base('Submissions')
        .select({
          filterByFormula: `{Vehicle Registration} = "${vehicleReg}"`,
          maxRecords: 1,
        })
        .firstPage();

      if (records.length === 0) {
        throw new Error('No record found for the given vehicle registration');
      }

      // Update Airtable record with the uploaded file URL in the "Attachments" field
      await base('Submissions').update([
        {
          id: records[0].id,
          fields: {
           'Attachments': url, 
            'Comments': comments,
          },
        },
      ]);

      console.log('Successfully updated Airtable with image URL');
    } catch (error: unknown) {
      console.error('Error uploading image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Error uploading image: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMouseMove = (e: React.MouseEvent, label: string) => {
    setHoverTooltip({
      text: label,
      x: e.clientX,
      y: e.clientY
    });
  };

  const isAllQuestionsAnswered = () => {
    // Check if any windows are selected
    if (selectedWindows.size === 0) return false;

    // Check if all selected windows have damage types
    const allWindowsHaveDamage = Array.from(selectedWindows).every(windowId => 
      windowDamage[windowId] !== undefined && windowDamage[windowId] !== null
    );
    if (!allWindowsHaveDamage) return false;

    // Check chip size if needed
    const needsChipSize = Array.from(selectedWindows).some(windowId => 
      windowDamage[windowId] === 'Chipped'
    );
    if (needsChipSize && !chipSize) return false;

    // Check specifications if windscreen is selected
    const hasWindscreen = selectedWindows.has('jqvmap1_ws');
    if (hasWindscreen && selectedSpecifications.size === 0) return false;

    // If all checks pass, return true
    return true;
  };

  // Add console.log to help debug
  useEffect(() => {
    console.log('Checking questions answered:', {
      selectedWindows: selectedWindows.size,
      windowDamage,
      chipSize,
      selectedSpecifications: selectedSpecifications.size,
      isAnswered: isAllQuestionsAnswered()
    });
  }, [selectedWindows, windowDamage, chipSize, selectedSpecifications]);

  // Add useEffect for window resize handling
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add useEffect to fetch existing damage data
  useEffect(() => {
    const fetchExistingDamage = async () => {
      const { quoteID } = router.query;
      if (!quoteID) return;
      
      try {
        const base = new Airtable({ apiKey: process.env.NEXT_PUBLIC_AIRTABLE_API_KEY })
          .base(process.env.NEXT_PUBLIC_AIRTABLE_BASE_ID!);
          
        const records = await base('Submissions').select({
          filterByFormula: `{QuoteID} = '${quoteID}'`
        }).firstPage();
        
        if (records.length > 0) {
          const record = records[0];
          const selectedWindowsStr = record.fields['Selected Windows'] || '';
          const windowDamageStr = record.fields['Window Damage'] || '';
          const specificationsStr = record.fields['Windscreen Specifications'] || '';
          
          if (selectedWindowsStr) {
            setSelectedWindows(new Set(String(selectedWindowsStr).split(', ')));
          }
          
          if (windowDamageStr) {
            const damageMap: { [key: string]: string } = {};
            String(windowDamageStr).split(', ').forEach(damage => {
              const [window, type] = damage.split(': ');
              const windowId = regions.find(r => r.label === window)?.id;
              if (windowId) {
                damageMap[windowId] = type.replace(/ \(.*\)/, '');
              }
            });
            setWindowDamage(damageMap);
          }
          
          if (specificationsStr) {
            setSelectedSpecifications(new Set(String(specificationsStr).split(', ')));
          }
          
          setComments(String(record.fields['Comments'] || ''));
        }
      } catch (error) {
        console.error('Error fetching damage data:', error);
      }
    };
    
    fetchExistingDamage();
  }, [router.query]);

  return (
    <div className="flex-grow w-full">
      <main className="flex-grow">
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

        <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
          {/* Updated Progress steps to match QuotePage style */}
          <div className="flex flex-col sm:flex-row items-center sm:items-center mb-12 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold w-full sm:w-[200px] mb-8 sm:mb-0 text-center sm:text-left">
              Glass Damage
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

          {/* Main content area - better mobile layout */}
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
            {/* Car diagram container */}
            <div className="flex-1 flex flex-col items-center w-full">
              <div className="mb-8 w-full max-w-[529.5px] mx-auto px-4">
                <div className="text-center mb-4 text-gray-600">
                  Select the windows that are damaged
                </div>
                {/* Make the container responsive */}
                <div className="relative w-full" style={{ maxWidth: '529.5px' }}>
                  {/* Create aspect ratio container */}
                  <div className="relative w-full" style={{ paddingBottom: '75.54%' }}> {/* 400/529.5 ≈ 75.54% */}
                    <div className="absolute inset-0 bg-white">
                      <svg 
                        viewBox="0 0 529.5 400"
                        preserveAspectRatio="xMidYMid meet"
                        className="w-full h-full focus:outline-none"
                        aria-labelledby="carMapTitle carMapDesc" 
                        role="img"
                      >
                        {/* Keep your existing SVG content exactly as is */}
                        <title id="carMapTitle">Car Window Map</title>
                        <desc id="carMapDesc">Interactive map of car windows for selection</desc>
                        <g 
                          transform="scale(0.44125) translate(0, 125.75779036827196)"
                          className="focus:outline-none"
                        >
                          {/* All your existing path elements remain unchanged */}
                          {/* Car body */}
                          <path
                            d="m4.12457,326.0398l0,-65.70975c0,-58.40867 21.86699,-181.06688 77.90115,-179.60666l19.13362,0l0,-7.30108c0,0 -1.36669,-8.7613 4.10006,-14.60217c5.46675,-5.84087 12.30018,-5.84087 12.30018,-5.84087l188.60278,0c0,0 8.20012,0 12.30018,7.30108c1.36669,2.92043 2.73337,5.84087 2.73337,8.7613l0,5.84087l456.4734,0l0,-21.90325c0,0 0,-1.46022 -2.73337,-14.60217c-2.73337,-13.14195 -17.76693,-30.66455 -12.30018,-33.58499c5.46675,-2.92043 25.96705,4.38065 41.0006,17.5226c15.03356,13.14195 20.5003,27.74412 20.5003,27.74412l187.23609,0c0,0 8.20012,-1.46022 12.30018,4.38065c4.10006,4.38065 4.10006,8.7613 4.10006,8.7613l0,13.14195l46.46735,0c0,0 34.16717,5.84087 76.53446,51.10759c42.36729,45.26672 45.10067,97.83452 45.10067,97.83452l0,102.21517l0,102.21517c0,0 -2.73337,52.5678 -45.10067,97.83452c-42.36729,45.26672 -76.53446,51.10759 -76.53446,51.10759l-46.46735,0l0,13.14195c0,0 0,4.38065 -4.10006,8.7613c-4.10006,4.38065 -12.30018,4.38065 -12.30018,4.38065l-187.23609,0c0,0 -5.46675,14.60217 -20.5003,27.74412c-15.03356,13.14195 -35.53386,20.44303 -41.0006,17.5226c-5.46675,-2.92043 8.20012,-20.44303 12.30018,-33.58499c2.73337,-13.14195 2.73337,-14.60217 2.73337,-14.60217l0,-21.90325l-456.4734,0l0,5.84087c0,2.92043 -1.36669,5.84087 -2.73337,8.7613c-2.73337,7.30108 -12.30018,7.30108 -12.30018,7.30108l-188.60278,0c0,0 -6.83343,0 -12.30018,-5.84087c-5.46675,-5.84087 -4.10006,-14.60217 -4.10006,-14.60217l0,-7.30108l-19.13362,0c-56.03416,1.46022 -77.90115,-121.19799 -77.90115,-179.60666l0,-65.70975l0,-2.92043z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill="#000000"
                            id="jqvmap1_cr"
                            className="jqvmap-region focus:outline-none"
                            role="button"
                            aria-label="Car body"
                            tabIndex={0}
                          />
                          {/* Windshield */}
                          <path
                            d="m944.40511,112.84815c46.46735,59.86889 73.80109,134.33994 73.80109,213.19165c0,78.85171 -27.33374,151.86254 -73.80109,213.19165l-164.00242,-78.85171c13.66687,-40.88607 20.5003,-86.15279 20.5003,-134.33994c0,-48.18715 -6.83343,-93.45387 -20.5003,-134.33994l164.00242,-78.85171z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_ws') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_ws"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Windshield"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_ws')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_ws')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_ws')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Front passenger vent */}
                          <path
                            d="m777.66931,98.24598c38.26723,0 76.53446,0 114.80169,0c-39.63392,32.12477 -84.73458,58.40867 -128.46856,83.23236c6.83343,-23.36347 12.30018,-49.64737 13.66687,-83.23236z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_vp') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_vp"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Front passenger vent"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_vp')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_vp')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_vp')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Front passenger door */}
                          <path
                            d="m552.16599,98.24598c69.70103,0 138.03537,0 207.7364,0c0,29.20434 -5.46675,56.94845 -13.66687,83.23236c-64.23428,0 -128.46856,0 -192.70284,0c-4.10006,-27.74412 -4.10006,-55.48824 0,-83.23236l-1.36669,0z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_df') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_df"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Front passenger door"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_df')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_df')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_df')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Rear passenger door */}
                          <path
                            d="m362.19652,98.24598l173.56923,0c-2.73337,29.20434 -2.73337,56.94845 0,83.23236c-57.40085,0 -112.06832,0 -170.83585,0c-4.10006,-21.90325 -6.83343,-55.48824 -4.10006,-83.23236l1.36669,0z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_dr') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_dr"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Rear passenger door"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_dr')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_dr')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_dr')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Rear passenger vent */}
                          <path
                            d="m280.19531,98.24598c21.86699,0 45.10067,0 66.96765,0c-2.73337,27.74412 0,58.40867 4.10006,83.23236c-9.56681,0 -23.23368,0 -32.80048,0c-16.40024,-27.74412 -28.70042,-55.48824 -38.26723,-83.23236z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_vr') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_vr"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Rear passenger vent"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_vr')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_vr')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_vr')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Rear passenger quarter */}
                          <path
                            d="m226.89453,181.47834c-21.86699,-17.5226 -46.46735,-43.8065 -71.06771,-83.23236c35.53386,0 71.06771,0 105.23489,0c10.93349,29.20434 23.23368,56.94845 39.63392,83.23236c-27.33374,0 -47.83404,0 -75.16778,0l1.36669,0z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_qr') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_qr"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Rear passenger quarter"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_qr')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_qr')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_qr')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Rear window */}
                          <path
                            d="m128.49307,534.8508l76.53446,-65.70975c0,0 -32.80048,-26.2839 -42.36729,-70.09041c-8.20012,-39.42585 -8.20012,-105.13561 0,-144.56146c9.56681,-45.26672 42.36729,-70.09041 42.36729,-70.09041l-76.53446,-65.70975c0,0 -39.63392,29.20434 -62.86759,70.09041c-31.4338,56.94845 -31.4338,221.95295 0,277.44119c21.86699,39.42585 62.86759,70.09041 62.86759,70.09041l0,-1.46022z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_rw') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_rw"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Rear window"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_rw')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_rw')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_rw')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Front driver vent */}
                          <path
                            d="m777.66931,553.83362c38.26723,0 76.53446,0 114.80169,0c-39.63392,-32.12477 -84.73458,-58.40867 -128.46856,-83.23236c6.83343,23.36347 12.30018,49.64737 13.66687,83.23236z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_vf') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_vf"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Front driver vent"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_vf')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_vf')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_vf')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Front driver door */}
                          <path
                            d="m552.16599,553.83362c69.70103,0 138.03537,0 207.7364,0c0,-29.20434 -5.46675,-56.94845 -13.66687,-83.23236c-64.23428,0 -128.46856,0 -192.70284,0c-4.10006,27.74412 -4.10006,55.48824 0,83.23236l-1.36669,0z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_dg') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_dg"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Front driver door"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_dg')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_dg')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_dg')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Rear driver door */}
                          <path
                            d="m362.19652,553.83362l173.56923,0c-2.73337,-29.20434 -2.73337,-56.94845 0,-83.23236c-57.40085,0 -112.06832,0 -170.83585,0c-4.10006,21.90325 -6.83343,55.48824 -4.10006,83.23236l1.36669,0z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_dd') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_dd"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Rear driver door"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_dd')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_dd')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_dd')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Rear driver vent */}
                          <path
                            d="m280.19531,553.83362c21.86699,0 45.10067,0 66.96765,0c-2.73337,-27.74412 0,-58.40867 4.10006,-83.23236c-9.56681,0 -23.23368,0 -32.80048,0c-16.40024,27.74412 -28.70042,55.48824 -38.26723,83.23236z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_vg') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_vg"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Rear driver vent"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_vg')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_vg')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_vg')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                          {/* Rear driver quarter */}
                          <path
                            d="m226.89453,470.60126c-21.86699,17.5226 -46.46735,43.8065 -71.06771,83.23236c35.53386,0 71.06771,0 105.23489,0c10.93349,-29.20434 23.23368,-56.94845 39.63392,-83.23236c-27.33374,0 -47.83404,0 -75.16778,0l1.36669,0z"
                            stroke="rgba(129, 129, 129, 0.1)"
                            strokeWidth="1"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeOpacity="0.1"
                            fill={selectedWindows.has('jqvmap1_qg') ? '#0FB8C1' : '#ffffff'}
                            id="jqvmap1_qg"
                            className="jqvmap-region cursor-pointer hover:fill-[#CCF1F3] transition-colors duration-200 focus:outline-none"
                            role="button"
                            aria-label="Rear driver quarter"
                            tabIndex={0}
                            onClick={() => handleWindowClick('jqvmap1_qg')}
                            onKeyPress={(e) => e.key === 'Enter' && handleWindowClick('jqvmap1_qg')}
                            onMouseMove={(e) => handleMouseMove(e, regions.find(r => r.id === 'jqvmap1_qg')?.label || '')}
                            onMouseLeave={() => setHoverTooltip(null)}
                          />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Damage options - better mobile spacing */}
              <div className="flex justify-center w-full mt-8 px-2 sm:px-4">
                <div className="flex flex-col w-full max-w-2xl space-y-8">
                  {Array.from(selectedWindows).map(windowId => (
                    <div key={windowId} className="w-full">
                      {renderDamageOptions(windowId)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Glass Type Preference */}
              {isAllQuestionsAnswered() && (
                <div className="mt-8 bg-gradient-to-br from-white to-gray-50 rounded-xl p-8 shadow-sm border border-gray-100">
                  <div className="flex items-center mb-6 relative">
                    <h3 className="text-xl font-bold text-gray-800">Glass Type Preference</h3>
                    <div className="ml-2 text-sm text-gray-500"></div>
                    <button
                      onClick={() => setActiveTooltip(activeTooltip === 'glassType' ? null : 'glassType')}
                      className="ml-2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      <Info size={20} />
                    </button>
                    
                    {/* Updated Tooltip/Popup */}
                    {activeTooltip === 'glassType' && (
                      <div className={getTooltipPosition(windowWidth)}>
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-bold text-lg">Glass Type Comparison</h4>
                          <button
                            onClick={() => setActiveTooltip(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X size={20} />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="border-b border-gray-100 pb-2">
                            <p className="font-semibold text-sm">OEM Glass</p>
                            <p className="text-sm text-gray-600">Original manufacturer glass, identical to what came with your vehicle. Generally more expensive but ensures perfect fit and quality.</p>
                          </div>
                          <div className="border-b border-gray-100 pb-2">
                            <p className="font-semibold text-sm">OEE Glass</p>
                            <p className="text-sm text-gray-600">Manufactured to the same standards but by alternative suppliers. Usually 20-30% cheaper while maintaining high quality and safety standards.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    {/* OEE Option - Now First */}
                    <button
                      onClick={() => setGlassType('OEE')}
                      className={`
                        group px-6 py-5 rounded-xl border-2 transition-all flex items-center justify-between
                        hover:shadow-md hover:scale-[1.01] transform duration-200
                        ${glassType === 'OEE' 
                          ? 'border-[#0FB8C1] bg-[#F7FDFD] text-[#0FB8C1]' 
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'}
                      `}
                    >
                      <div className="flex items-center">
                        <div className="mr-4">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                            ${glassType === 'OEE' ? 'border-[#0FB8C1]' : 'border-gray-300 group-hover:border-gray-400'}`}
                          >
                            {glassType === 'OEE' && <div className="w-3 h-3 rounded-full bg-[#0FB8C1]" />}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-lg">OEE Glass <span className="text-sm text-green-600 ml-2">Insurance Approved</span></div>
                          <div className="text-sm text-gray-500 mt-1">Original Equipment Equivalent - Same quality from alternative manufacturers</div>
                        </div>
                      </div>
                      {glassType === 'OEE' && (
                        <span className="text-sm font-medium text-[#0FB8C1] ml-4">Selected</span>
                      )}
                    </button>

                    {/* OEM Option - Now Second */}
                    <button
                      onClick={() => setGlassType('OEM')}
                      className={`
                        group px-6 py-5 rounded-xl border-2 transition-all flex items-center justify-between
                        hover:shadow-md hover:scale-[1.01] transform duration-200
                        ${glassType === 'OEM' 
                          ? 'border-[#0FB8C1] bg-[#F7FDFD] text-[#0FB8C1]' 
                          : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'}
                      `}
                    >
                      <div className="flex items-center">
                        <div className="mr-4">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                            ${glassType === 'OEM' ? 'border-[#0FB8C1]' : 'border-gray-300 group-hover:border-gray-400'}`}
                          >
                            {glassType === 'OEM' && <div className="w-3 h-3 rounded-full bg-[#0FB8C1]" />}
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-lg">OEM Glass</div>
                          <div className="text-sm text-gray-500 mt-1">Original Equipment Manufacturer - Identical to what came with your vehicle</div>
                        </div>
                      </div>
                      {glassType === 'OEM' && (
                        <span className="text-sm font-medium text-[#0FB8C1] ml-4">Selected</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Continue button */}
              {selectedWindows.size > 0 && (
                <button
                  onClick={handleContinue}
                  disabled={isContinueLoading}
                  className={`w-full mt-8 p-4 bg-[#0FB8C1] text-white rounded-full text-xl font-semibold
                    ${isContinueLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-[#0CA7AF]'}`}
                >
                  {isContinueLoading ? 'Processing...' : 'Continue'}
                </button>
              )}
            </div>

            {/* Sidebar - better mobile layout */}
            <div className="w-full lg:w-64 shrink-0 bg-gray-100 p-4 rounded-lg lg:sticky lg:top-4">
              {/* Registration plate - centered on mobile */}
              <div 
                className="bg-white p-2 rounded-lg text-center relative overflow-hidden w-full max-w-sm mx-auto border-2 border-gray-300 mb-4" 
                style={{ 
                  fontFamily: 'Arial',
                  letterSpacing: '1px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div className="absolute left-0 top-0 bottom-0 w-10 bg-[#234B9A] flex flex-col items-center justify-center">
                  
                  <Image
                    src="/uk-flag.svg"
                    alt="UK Flag"
                    width={16}
                    height={8}
                    className="my-0.5"
                  />
                  <div className="text-white text-[6px] font-bold">UK</div>
                </div>
                <span className="text-xl font-bold text-black w-full pl-12">
                  {Array.isArray(vehicleReg) ? vehicleReg[0]?.toUpperCase() : vehicleReg?.toUpperCase() || 'UNKNOWN'}
                </span>
              </div>

              {/* Vehicle details - better mobile layout */}
              <div className="bg-white p-4 rounded-lg max-w-sm mx-auto lg:max-w-none">
                <div className="mb-4">
                  <div className={vehicleInfoStyles.label}>GLASS DAMAGE</div>
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
                                    <span className="text-pink-600"> ({chipSize === 'Yes' ? 'Larger than 5p' : 'Smaller than 5p'})</span>
                                  )}
                                </span>
                              </div>
                            )}
                            {windowId === 'jqvmap1_ws' && selectedSpecifications.size > 0 && (
                              <div className="flex items-start gap-2">
                                <span className="text-gray-500 text-sm font-medium mt-1">Features:</span>
                                <div className="flex flex-wrap gap-1">
                                  {Array.from(selectedSpecifications).map((spec) => (
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

                {/* Vehicle details - better mobile layout */}
                <div>
                  <div className={vehicleInfoStyles.label}>MAIN DETAILS</div>
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
                    <div className={vehicleInfoStyles.label}>VEHICLE CHARACTERISTICS</div>
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
      <Footer />
    </div>
  )
}

export default DamageLocation