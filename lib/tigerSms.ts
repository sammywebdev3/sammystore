import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = 'https://api.tiger-sms.com/stubs/handler_api.php';

if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');

// Hardcoded mapping of TigerSMS numeric IDs to English names
// Based on standard SMS verification provider ID lists
const COUNTRY_ID_MAP: Record<string, string> = {
  "6": "Russia", "7": "Ukraine", "8": "Kazakhstan", "9": "China", 
  "10": "Philippines", "12": "Indonesia", "13": "Malaysia", "14": "Vietnam",
  "15": "Thailand", "16": "India", "17": "Brazil", "18": "Colombia",
  "19": "Mexico", "20": "Argentina", "21": "Peru", "22": "Chile",
  "23": "Ecuador", "24": "Bolivia", "25": "Paraguay", "26": "Uruguay",
  "27": "Venezuela", "28": "Costa Rica", "29": "Panama", "30": "Guatemala",
  "31": "Honduras", "32": "El Salvador", "33": "Nicaragua", "34": "Dominican Republic",
  "35": "Cuba", "36": "Puerto Rico", "37": "Jamaica", "38": "Trinidad and Tobago",
  "39": "Barbados", "40": "Bahamas", "41": "Belize", "42": "Guyana",
  "43": "Suriname", "44": "French Guiana", "45": "Falkland Islands", "46": "South Georgia",
  "47": "United States", "48": "Canada", "49": "United Kingdom", "50": "Germany",
  "51": "France", "52": "Italy", "53": "Spain", "54": "Poland",
  "55": "Romania", "56": "Netherlands", "57": "Belgium", "58": "Switzerland",
  "59": "Austria", "60": "Sweden", "61": "Norway", "62": "Denmark",
  "63": "Finland", "64": "Ireland", "65": "Portugal", "66": "Greece",
  "67": "Czech Republic", "68": "Hungary", "69": "Slovakia", "70": "Slovenia",
  "71": "Croatia", "72": "Serbia", "73": "Bosnia and Herzegovina", "74": "Montenegro",
  "75": "North Macedonia", "76": "Albania", "77": "Bulgaria", "78": "Moldova",
  "79": "Latvia", "80": "Lithuania", "81": "Estonia", "82": "Belarus",
  "83": "Georgia", "84": "Armenia", "85": "Azerbaijan", "86": "Turkey",
  "87": "Cyprus", "88": "Israel", "89": "Egypt", "90": "Saudi Arabia",
  "91": "UAE", "92": "Qatar", "93": "Kuwait", "94": "Bahrain",
  "95": "Oman", "96": "Jordan", "97": "Lebanon", "98": "Iraq",
  "99": "Iran", "100": "Pakistan", "101": "Bangladesh", "102": "Sri Lanka",
  "103": "Nepal", "104": "Myanmar", "105": "Cambodia", "106": "Laos",
  "107": "Mongolia", "108": "Japan", "109": "South Korea", "110": "Taiwan",
  "111": "Hong Kong", "112": "Macau", "113": "Singapore", "114": "Brunei",
  "115": "Australia", "116": "New Zealand", "117": "Papua New Guinea", "118": "Fiji",
  "119": "Solomon Islands", "120": "Vanuatu", "121": "Samoa", "122": "Tonga",
  "123": "Kiribati", "124": "Tuvalu", "125": "Nauru", "126": "Palau",
  "127": "Marshall Islands", "128": "Micronesia", "129": "Northern Mariana Islands", "130": "Guam",
  "131": "American Samoa", "132": "Cook Islands", "133": "Niue", "134": "Tokelau",
  "135": "Pitcairn Islands", "136": "Wallis and Futuna", "137": "French Polynesia", "138": "New Caledonia",
  "139": "South Africa", "140": "Nigeria", "141": "Kenya", "142": "Ethiopia",
  "143": "Tanzania", "144": "Uganda", "145": "Rwanda", "146": "Burundi",
  "147": "Somalia", "148": "Djibouti", "149": "Eritrea", "150": "Sudan",
  "151": "South Sudan", "152": "Chad", "153": "Central African Republic", "154": "Cameroon",
  "155": "Equatorial Guinea", "156": "Gabon", "157": "Republic of the Congo", "158": "DR Congo",
  "159": "Angola", "160": "Zambia", "161": "Malawi", "162": "Mozambique",
  "163": "Zimbabwe", "164": "Botswana", "165": "Namibia", "166": "Lesotho",
  "167": "Eswatini", "168": "Madagascar", "169": "Mauritius", "170": "Seychelles",
  "171": "Comoros", "172": "Mayotte", "173": "Reunion", "174": "Western Sahara",
  "175": "Morocco", "176": "Algeria", "177": "Tunisia", "178": "Libya",
  "179": "Mali", "180": "Niger", "181": "Burkina Faso", "182": "Senegal",
  "183": "Gambia", "184": "Guinea-Bissau", "185": "Guinea", "186": "Sierra Leone",
  "187": "Liberia", "188": "Ivory Coast", "189": "Ghana", "190": "Togo",
  "191": "Benin"
};

async function tigerRequest(action: string, params: Record<string, any> = {}) {
  try {
    const res = await axios.get(BASE_URL, {
      params: { api_key: API_KEY, action, ...params }
    });
    
    if (typeof res.data === 'string') {
      if (res.data.startsWith('ERROR')) throw new Error(res.data);
      return res.data;
    }
    return res.data;
  } catch (error: any) {
    console.error(`TigerSMS ${action} error:`, error.response?.data || error.message);
    throw error;
  }
}

export async function getCountries() {
  // Fetch prices for a popular service (Telegram) to get active country IDs
  const priceData = await tigerRequest('getPricesV3', { service: 'tg' });
  
  if (!priceData || typeof priceData !== 'object') return [];

  // Extract unique country IDs that have Telegram service available
  const countryIds = new Set<string>();
  Object.values(priceData).forEach((serviceInfo: any) => {
    if (serviceInfo && typeof serviceInfo === 'object' && serviceInfo.countries) {
      Object.keys(serviceInfo.countries).forEach(id => countryIds.add(String(id)));
    }
  });

  // Map IDs to names using our hardcoded dictionary
  const countries = Array.from(countryIds)
    .map(id => ({
      id,
      name: COUNTRY_ID_MAP[id] || `Country ${id}`
    }))
    .filter(c => c.name !== `Country ${c.id}`) // Only keep countries we have names for
    .sort((a, b) => a.name.localeCompare(b.name));

  return countries;
}

export async function getServices(countryId: string) {
  const data = await tigerRequest('getPricesV3', { country: countryId });
  
  if (!data || typeof data !== 'object') return [];

  return Object.entries(data)
    .filter(([_, info]: [string, any]) => {
      const count = typeof info === 'object' ? (info.count || 0) : 0;
      return count > 0;
    })
    .map(([service, info]: [string, any]) => ({
      service,
      name: typeof info === 'object' ? (info.title || service.toUpperCase()) : service.toUpperCase(),
      price: typeof info === 'object' ? parseFloat(info.cost || info.price || 0) : 0,
      count: typeof info === 'object' ? (info.count || 0) : 0
    }))
    .sort((a, b) => a.price - b.price);
}

export async function buyNumber(countryId: string, service: string) {
  const data = await tigerRequest('getNumber', { 
    country: countryId, 
    service,
    activationType: 'SMS',
    fixedPrice: true 
  });
  
  if (typeof data === 'string') throw new Error(data);
  if (!data.activationId || !data.number) throw new Error('Invalid response: missing activationId or number');
  
  return { id: data.activationId, number: data.number };
}

export async function checkSms(activationId: string) {
  const data = await tigerRequest('getStatus', { 
    id: activationId,
    full_text: false 
  });
  
  if (typeof data === 'object' && data.code) {
    return { status: 'completed', sms: data.code };
  }
  return { status: data, sms: null };
}
