export interface DamageLocationProps {
  // Remove the required props since they're being handled via router
}

export interface VehicleDetails {
  make?: string;
  model?: string;
  year?: string;
  colour: string
  type: string
  style: string
  doorPlan: string
}

export interface DamageDescription {
  [key: string]: {
    [key: string]: string;
  };
}

export interface WindowDamage {
  type: string;
  location: string;
  // Add other damage related fields
}

export const regions = [
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

export const damageDescriptions: DamageDescription = {
  'Windscreen': {
    'Smashed': 'Complete breakage of the glass requiring full replacement...',
    'Cracked': 'A line or split in the glass that extends across the windscreen...',
    'Scratched': 'Surface damage that affects visibility or appearance...',
    'Chipped': 'Small piece of glass missing from the surface...',
    'Leaking': 'Water entering the vehicle around the windscreen seal...'
  },
  // ... rest of the damage descriptions
}

export interface CarDiagramProps {
  selectedWindows: Set<string>;
  handleWindowClick: (windowId: string) => void;
  handleMouseMove: (event: React.MouseEvent) => void;
  setHoverTooltip: (tooltip: string) => void;
}

export interface VehicleInfoProps {
  vehicleReg: string;
  vehicleDetails: VehicleDetails | null;
  selectedWindows: Set<string>;
  windowDamage: WindowDamage | null;
  chipSize: string;
  selectedSpecifications: string[];
}

export interface GlassTypeSelectorProps {
  glassType: string;
  setGlassType: (type: string) => void;
  activeTooltip: string;
  setActiveTooltip: (tooltip: string) => void;
  windowWidth: number;
} 