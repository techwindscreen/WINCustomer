import { VehicleDetails } from '../types/vehicle';

export interface GlassProperties {
  type: string;
  color: string;
  stripe: string;
  modifications: string[];
}

export function generateArgicCode(
  vehicleDetails: VehicleDetails,
  selectedWindows: Set<string>,
  specifications: GlassProperties
): string {
  // Position 1-2: Manufacturer Code
  const manufacturerCode = getManufacturerCode(vehicleDetails.manufacturer.toUpperCase());

  // Position 3-4: Model Code
  const modelCode = getModelCode(vehicleDetails.model.toUpperCase());

  // Position 5: Glass Type
  const glassType = getGlassType(selectedWindows);
  
  // Position 6-7: Glass Color (2 characters)
  const glassColor = getGlassColor(specifications.color);

  // Return exactly 7 characters
  return `${manufacturerCode}${modelCode}${glassType}${glassColor}`;
}

function getGlassType(selectedWindows: Set<string>): string {
  // Map window IDs to glass type codes based on the matrix
  const windowMapping: { [key: string]: string } = {
    // Windshield types
    'jqvmap1_ws': 'A',  // Standard Windshield
    'jqvmap1_df': 'C',  // Alternative Windshield
    'jqvmap1_dg': 'D',  // Windshield with Accessories
    
    // Rear window types
    'jqvmap1_rw': 'B',  // Standard Rear Window
    'jqvmap1_qr': 'E',  // Rear Window with Accessories
    
    // Side window types
    'jqvmap1_dd': 'F',  // Side Windows - Flat
    'jqvmap1_dr': 'H',  // Side Windows - Flat with Accessories
    'jqvmap1_qg': 'L',  // Side Windows - Left
    'jqvmap1_vf': 'M',  // Side Windows - Left with Accessories
    'jqvmap1_vr': 'R',  // Side Windows - Right
    'jqvmap1_qf': 'T'   // Side Windows - Right with Accessories
  };

  // Check each selected window and return the first matching type
  for (const window of Array.from(selectedWindows)) {
    if (windowMapping[window]) {
      return windowMapping[window];
    }
  }

  return 'A'; // Default to Windshield if no match found
}

function getGlassColor(color: string): string {
  const colorMapping: { [key: string]: string } = {
    'clear': 'CL',
    'blue': 'BL',
    'green': 'GN',
    'bronze': 'BZ',
    'grey': 'GY',
    'light_green': 'LG',
    'dark_blue': 'BD',
    'solar_control': 'SC'
  };

  return colorMapping[color.toLowerCase()] || 'CL';
}

function getStripeColor(stripe: string): string {
  const stripeMapping: { [key: string]: string } = {
    'blue': 'BL',
    'green': 'GN',
    'bronze': 'BZ',
    'grey': 'GY',
    'light_green': 'LG',
    'dark_grey': 'DG'
  };

  return stripeMapping[stripe.toLowerCase()] || 'N';
}

function getModificationCodes(modifications: string[]): string {
  const modificationMapping: { [key: string]: string } = {
    'antenna': '1A',
    'thickness_change': '2A',
    'silk_screen': '1B',
    'encapsulation': '1D',
    'heated': '3A',
    'sensor': '4A',
    'camera': '5A',
    'gps': 'G',
    'stop_light': 'B',
    'central_part': 'C',
    'double_glazed': 'D',
    'flat_glass': 'F'
  };

  // Sort modifications to ensure consistent ordering
  const sortedMods = modifications
    .map(mod => modificationMapping[mod.toLowerCase()])
    .filter(Boolean)
    .sort();

  return sortedMods.length ? sortedMods.join('') : 'N';
}

// Existing manufacturer and model code functions
function getManufacturerCode(manufacturer: string): string {
  const manufacturerMap: { [key: string]: string } = {
    'ALFA ROMEO': '20',
    'AUDI': '85',
    'BMW': '24',
    'BOVA': 'BO',
    'CHEVROLET': '30',
    'CHRYSLER': 'A2',
    'CITROEN': '27',
    'DACIA': '72',
    'DAEWOO': '30',
    'DAF': '46',
    'DAIHATSU': '29',
    'FIAT': '33',
    'FORD': '41',
    'HONDA': '47',
    'HYUNDAI': '52',
    'KIA': '54',
    'LAND ROVER': '60',
    'LEXUS': '62',
    'MAZDA': '66',
    'MERCEDES': '70',
    'MINI': '72',
    'MITSUBISHI': '74',
    'NISSAN': '76',
    'OPEL': '78',
    'PEUGEOT': '80',
    'RENAULT': '82',
    'SEAT': '84',
    'SKODA': '86',
    'TOYOTA': '90',
    'VOLKSWAGEN': '92',
    'VOLVO': '94'
  };
  return manufacturerMap[manufacturer.toUpperCase()] || '00';
}

function getModelCode(model: string): string {
  const modelMap: { [key: string]: string } = {
    // Alfa Romeo
    '145': '31',
    '146': '31',
    '147': '37',
    '156': '34',
    '159': '39',
    'GTV': '32',
    'SPIDER II': '32',

    // Audi
    '100/A6': '40',
    '80 II COUPE': '28',
    '80 III/IV SEDAN': '26',
    '80 V SEDAN': '34',
    'A3': '54',
    'A4': '47',

    // BMW
    '118D SE AUTO': '48',
    '1 SERIES E81/E82/E87/E88': '48',
    '1 SERIES F20/F21/F22': '67',
    '2 SERIES F45': '77',
    '2 SERIES F46': '79',
    '3 SERIES E30': '25',
    '3 SERIES E36 COUPE/CONV': '32',
    '3 SERIES E36 SEDAN/ESTATE/CONV': '31',
    '3 SERIES E46 COMPACT': '42',
    '3 SERIES E46 COUPE': '37',
    '3 SERIES E46 SEDAN': '36',
    '3 SERIES E90/E91': '47',
    '3 SERIES E92': '54',
    '3 SERIES E93': '50',
    '3 SERIES F30': '65',
    '3 SERIES GT F34': '69',
    '4 SERIES F32': '71',
    '4 SERIES F33': '75',
    '5 SERIES E34': '26',
    '5 SERIES E39': '34',
    '5 SERIES E60': '45',
    '5 SERIES F07 GT': '61',
    '5 SERIES F10/F11': '59',
    '6 SERIES E63/E64': '46',
    '6 SERIES F06': '63',
    '7 SERIES E38': '33',
    '7 SERIES E65': '43',
    '7 SERIES F01/F02': '57',
    '7 SERIES G11/G12': '81',
    'I3': '70',
    'I8': '72',
    'X1 E84': '60',
    'X1 F48': '82',
    'X3 E83': '49',
    'X3 F25': '64',
    'X4 F26': '68',
    'X5 E53': '39',
    'X5 E70': '52',
    'X5 F15': '73',
    'X6 E71/E72': '56',
    'X6 F16': '78',
    'Z3 E36/7': '35',
    'Z4 E85': '44',
    'Z4 E89': '58',

    // Chevrolet
    'AVEO': '22',
    'CAPTIVA': '24',
    'CRUZE': '26',
    'EPICA': '23',
    'MATIZ II': '17',
    'ORLANDO': '30',
    'SPARK': '28',
    'VOLT': '32',

    // Chrysler
    '300C': '34',
    'GRAND VOYAGER IV': '30',
    'NEON I': '20',
    'VOYAGER III': '23',

    // Citroen
    'AX': '17',
    'BERLINGO I': '24',
    'C-CROSSER': '38',
    'C2': '31',
    'C25': '16',
    'C3 PICASSO': '42',
    'C3 PLURIEL': '30',
    'C3': '26',
    'C4': '32',
    'C5': '27',
    'C8': '28',
    'JUMPER': '22',
    'JUMPY II': '36',
    'NEMO': '39',
    'SAXO': '23',
    'VISA': '14',
    'XANTIA': '20',
    'XSARA PICASSO': '29',
    'XSARA': '25',
    'ZX': '19',

    // Dacia
    'LOGAN': '64',
    'SANDERO': '76',

    // Daewoo
    'ESPERO': '01',
    'EVANDA': '12',
    'KALOS': '14',
    'LACETTI': '16',
    'LEGANZA': '05',
    'MATIZ I': '06',
    'NEXIA': '00',
    'NUBIRA I': '04',
    'NUBIRA II': '16',
    'TACUMA': '11',
    'TICO': '02',

    // Daihatsu
    'CUORE V': '24',
    'CUORE VI': '27',
    'GRAN MOVE': '21',
    'MOVE': '20',
    'SIRION I': '23',
    'SIRION II': '30',
    'TERIOS I': '22',
    'TERIOS II': '31',

    // Fiat
    'BARCHETTA': '47',
    'BRAVA': '48',
    'BRAVO': '48',
    'DOBLO': '54',
    'DUCATO I': '27',
    'DUCATO II': '35',
    'FIORINO': '60',
    'FREEMONT': '71',
    'MAREA': '48',
    'PALIO': '49',
    'PANDA I': '33',
    'PANDA II': '59',
    'PUNTO CONV': '46',
    'PUNTO I': '41',
    'PUNTO II': '51',
    'SCUDO II': '52',
    'SEDICI': '63',
    'SEICENTO': '50',
    'ULYSSE II': '57',

    // Ford
    'C-MAX': '82',
    'ESCORT VII': '95',
    'FIESTA V': '65',
    'FIESTA VI': '96',
    'FOCUS I': '67',
    'FOCUS II': '87',
    'FOCUS III': '00',
    'GALAXY II': '04',
    'KA': '75',
    'KA II': '97',
    'MONDEO III': '76',
    'MONDEO IV': '86',
    'S-MAX': '05',
    'TRANSIT CONNECT': '90',
    'TRANSIT CUSTOM': '08',
    'TRANSIT V': '91',
    'TRANSIT VI': '10',

    // Honda
    'ACCORD VII': '63',
    'ACCORD VIII': '93',
    'CIVIC VIII': '54',
    'CIVIC IX': '78',
    'CR-V III': '81',
    'CR-V IV': '95',
    'JAZZ II': '50',
    'JAZZ III': '70',
    'JAZZ IV': '88',

    // Hyundai
    'ACCENT III': '50',
    'ELANTRA IV': '60',
    'GETZ': '55',
    'I10 I': '68',
    'I20 I': '69',
    'I30 I': '70',
    'IX35': '76',
    'SANTA FE II': '62',
    'SANTA FE III': '78',
    'TUCSON': '65',
    'TUCSON II': '80',

    // Kia
    'CEED I': '70',
    'CEED II': '80',
    'PICANTO II': '60',
    'RIO III': '65',
    'SORENTO II': '75',
    'SPORTAGE III': '85',
    'SPORTAGE IV': '90',

    // Land Rover
    'DISCOVERY III': '00',
    'DISCOVERY IV': '10',
    'FREELANDER II': '15',
    'RANGE ROVER IV': '25',

    // Lexus
    'CT 200H': '10',
    'IS II': '00',
    'IS III': '20',
    'RX III': '30',
    'RX IV': '40',

    // Mazda
    '3 I': '00',
    '3 II': '10',
    '3 III': '20',
    '6 II': '40',
    '6 III': '50',
    'CX-5 I': '60',
    'CX-5 II': '70',

    // Mercedes
    'A-CLASS W169': '00',
    'B-CLASS W245': '10',
    'C-CLASS W204': '20',
    'E-CLASS W211': '30',
    'E-CLASS W212': '40',
    'GLK-CLASS X204': '50',
    'M-CLASS W164': '60',
    'M-CLASS W166': '70',
    'S-CLASS W221': '80',
    'S-CLASS W222': '90',
    'SPRINTER W906': '00',
    'VITO W639': '10',

    // Mini
    'COOPER I R50': '00',
    'COOPER II R56': '10',
    'COUNTRYMAN R60': '20',
    'COOPER III F56': '30',

    // Mitsubishi
    'ASX': '00',
    'COLT VI': '10',
    'LANCER X': '20',
    'OUTLANDER II': '30',
    'OUTLANDER III': '40',

    // Nissan
    'JUKE I': '00',
    'MICRA K12': '10',
    'MICRA K13': '20',
    'NAVARA D40': '30',
    'QASHQAI J10': '40',
    'QASHQAI J11': '50',
    'X-TRAIL T31': '60',
    'X-TRAIL T32': '70',

    // Opel
    'ASTRA H': '00',
    'ASTRA J': '10',
    'CORSA D': '20',
    'CORSA E': '30',
    'INSIGNIA A': '40',
    'MERIVA B': '50',
    'MOKKA': '60',

    // Peugeot
    '207': '00',
    '208': '10',
    '3008 I': '20',
    '3008 II': '30',
    '308 I': '40',
    '308 II': '50',
    '508 I': '60',
    '508 II': '70',
    '5008 I': '80',
    '5008 II': '90',

    // Renault
    'CAPTUR I': '00',
    'CLIO III': '10',
    'CLIO IV': '20',
    'KADJAR': '30',
    'MEGANE III': '40',
    'MEGANE IV': '50',
    'SCENIC III': '60',
    'SCENIC IV': '70',
    'TWINGO III': '80',
    'ZOE': '90',

    // Seat
    'ALHAMBRA II': '00',
    'ARONA': '10',
    'ATECA': '20',
    'IBIZA IV': '30',
    'IBIZA V': '40',
    'LEON II': '50',
    'LEON III': '60',
    'TARRACO': '70',
    'TOLEDO IV': '80',

    // Skoda
    'FABIA II': '00',
    'FABIA III': '10',
    'KAROQ': '20',
    'KODIAQ': '30',
    'OCTAVIA II': '40',
    'OCTAVIA III': '50',
    'SUPERB II': '60',
    'SUPERB III': '70',
    'YETI': '80',

    // Toyota
    'AURIS I': '00',
    'AURIS II': '10',
    'AVENSIS III': '20',
    'C-HR': '30',
    'COROLLA XI': '40',
    'COROLLA XII': '50',
    'PRIUS IV': '60',
    'RAV4 IV': '70',
    'RAV4 V': '80',
    'VERSO': '90',
    'YARIS III': '00',
    'YARIS IV': '10',

    // Volkswagen
    'CADDY IV': '00',
    'GOLF VI': '10',
    'GOLF VII': '20',
    'GOLF VIII': '30',
    'PASSAT B7': '40',
    'PASSAT B8': '50',
    'POLO V': '60',
    'POLO VI': '70',
    'TIGUAN I': '80',
    'TIGUAN II': '90',
    'TOUAREG II': '00',
    'TOUAREG III': '10',
    'TOURAN II': '20',
    'TRANSPORTER T6': '30',

    // Volvo
    'S60 II': '00',
    'S60 III': '10',
    'V40 II': '20',
    'V60 I': '30',
    'V60 II': '40',
    'V70 III': '50',
    'XC40': '60',
    'XC60 I': '70',
    'XC60 II': '80',
    'XC90 II': '90'
  };

  return modelMap[model.toUpperCase()] || '00';
}