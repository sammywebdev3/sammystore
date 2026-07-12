import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = 'https://api.tiger-sms.com/stubs/handler_api.php';

if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');

// Country ID to name mapping
const COUNTRY_NAMES: Record<string, string> = {
  "6": "Russia", "7": "Ukraine", "8": "Kazakhstan", "9": "China",
  "10": "Philippines", "12": "Indonesia", "13": "Malaysia", "14": "Vietnam",
  "15": "Thailand", "16": "India", "17": "Brazil", "18": "Colombia",
  "19": "Mexico", "20": "Argentina", "21": "Peru", "22": "Chile",
  "23": "Ecuador", "24": "Bolivia", "25": "Paraguay", "26": "Uruguay",
  "27": "Venezuela", "28": "Costa Rica", "29": "Panama", "30": "Guatemala",
  "31": "Honduras", "32": "El Salvador", "33": "Nicaragua", "34": "Dominican Republic",
  "35": "Cuba", "36": "Puerto Rico", "37": "Jamaica", "38": "Trinidad and Tobago",
  "39": "Barbados", "40": "Bahamas", "41": "Belize", "42": "Guyana",
  "43": "Suriname", "44": "French Guiana", "47": "United States", "48": "Canada",
  "49": "United Kingdom", "50": "Germany", "51": "France", "52": "Italy",
  "53": "Spain", "54": "Poland", "55": "Romania", "56": "Netherlands",
  "57": "Belgium", "58": "Switzerland", "59": "Austria", "60": "Sweden",
  "61": "Norway", "62": "Denmark", "63": "Finland", "64": "Ireland",
  "65": "Portugal", "66": "Greece", "67": "Czech Republic", "68": "Hungary",
  "69": "Slovakia", "70": "Slovenia", "71": "Croatia", "72": "Serbia",
  "73": "Bosnia and Herzegovina", "74": "Montenegro", "75": "North Macedonia", "76": "Albania",
  "77": "Bulgaria", "78": "Moldova", "79": "Latvia", "80": "Lithuania",
  "81": "Estonia", "82": "Belarus", "83": "Georgia", "84": "Armenia",
  "85": "Azerbaijan", "86": "Turkey", "87": "Cyprus", "88": "Israel",
  "89": "Egypt", "90": "Saudi Arabia", "91": "UAE", "92": "Qatar",
  "93": "Kuwait", "94": "Bahrain", "95": "Oman", "96": "Jordan",
  "97": "Lebanon", "98": "Iraq", "99": "Iran", "100": "Pakistan",
  "101": "Bangladesh", "102": "Sri Lanka", "103": "Nepal", "104": "Myanmar",
  "105": "Cambodia", "106": "Laos", "107": "Mongolia", "108": "Japan",
  "109": "South Korea", "110": "Taiwan", "111": "Hong Kong", "112": "Macau",
  "113": "Singapore", "114": "Brunei", "115": "Australia", "116": "New Zealand",
  "139": "South Africa", "140": "Nigeria", "141": "Kenya", "175": "Morocco",
  "176": "Algeria", "177": "Tunisia", "178": "Libya"
};

// Service code to name mapping
const SERVICE_NAMES: Record<string, string> = {
  "wa": "WhatsApp", "tg": "Telegram", "go": "Google", "ig": "Instagram",
  "fb": "Facebook", "tw": "Twitter", "vk": "VK", "ok": "OK",
  "mm": "Viber", "vi": "Viber", "ub": "Uber", "ya": "Yandex",
  "li": "LinkedIn", "sn": "Snapchat", "dc": "Discord", "nf": "Netflix"
};

async function tigerRequest(action: string, params: Record<string, any> = {}) {
  try {
    const url = new URL(BASE_URL);
    url.searchParams.set('api_key', API_KEY);
    url.searchParams.set('action', action);
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value));
    });

    console.log(`[TigerSMS] Requesting: ${action}`, params);
    
    const res = await axios.get(url.toString(), {
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log(`[TigerSMS] Response for ${action}:`, res.data);
    
    return res.data;
  } catch (error: any) {
    console.error(`[TigerSMS] ${action} error:`, error.message);
    throw new Error(`TigerSMS API Error: ${error.message}`);
  }
}

export async function getBalance() {
  const data = await tigerRequest('getBalance');
  
  if (typeof data === 'string' && data.startsWith('ERROR')) {
    throw new Error(`Balance error: ${data}`);
  }
  
  // Response format: {"balance": 123.45}
  if (typeof data === 'object' && data.balance) {
    return parseFloat(data.balance);
  }
  
  throw new Error('Invalid balance response');
}

export async function getCountries() {
  const data = await tigerRequest('getCountries');
  
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid countries response');
  }

  const countries = Object.entries(data)
    .map(([id, countryData]: [string, any]) => ({
      id,
      name: COUNTRY_NAMES[id] || `Country ${id}`,
      country: typeof countryData === 'object' ? countryData.country : id
    }))
    .filter(c => c.name && !c.name.includes('Country'))
    .sort((a, b) => a.name.localeCompare(b.name));

  return countries;
}

export async function getPrices(countryId: string) {
  const data = await tigerRequest('getPricesV3', { country: countryId });
  
  if (typeof data === 'string' && data.startsWith('ERROR')) {
    throw new Error(`Prices error: ${data}`);
  }
  
  if (typeof data !== 'object' || !data) {
    throw new Error('No services available for this country');
  }

  const services = Object.entries(data)
    .map(([serviceCode, serviceData]: [string, any]) => ({
      service: serviceCode,
      name: SERVICE_NAMES[serviceCode] || serviceCode.toUpperCase(),
      price: parseFloat(serviceData.cost || serviceData.price || 0),
      count: parseInt(serviceData.count || 0)
    }))
    .filter(s => s.price > 0 && s.count > 0)
    .sort((a, b) => a.price - b.price);

  return services;
}

export async function buyNumber(countryId: string, serviceCode: string) {
  const data = await tigerRequest('getNumber', {
    country: countryId,
    service: serviceCode,
    activationType: 'SMS',
    fixedPrice: 'true'
  });
  
  if (typeof data === 'string' && data.startsWith('ERROR')) {
    throw new Error(`Buy number error: ${data}`);
  }
  
  if (typeof data !== 'object') {
    throw new Error('Invalid buy number response');
  }
  
  // Response format: {"id": 123456789, "number": "+1234567890", "server": 1}
  if (!data.id || !data.number) {
    throw new Error(`Invalid response: ${JSON.stringify(data)}`);
  }
  
  return {
    id: String(data.id),
    number: String(data.number),
    server: data.server
  };
}

export async function checkSms(activationId: string) {
  const data = await tigerRequest('getStatusV2', { id: activationId });
  
  if (typeof data === 'string' && data.startsWith('ERROR')) {
    throw new Error(`Status error: ${data}`);
  }
  
  // Possible status values:
  // 0 - SMS not received
  // 1 - SMS received
  // 6 - Activation cancelled
  // 8 - Number released
  // 10 - SMS received, activation completed
  // (normal string response contains the code)
  
  if (typeof data === 'object' && data.sms) {
    return {
      status: 'completed',
      sms: data.sms,
      statusCode: 1
    };
  }
  
  if (typeof data === 'string') {
    const statusCode = parseInt(data);
    if (statusCode === 0) {
      return { status: 'pending', sms: null, statusCode: 0 };
    }
    if (statusCode === 1 || statusCode === 10) {
      return { status: 'completed', sms: data.replace(/^[0-9]+\|/, ''), statusCode };
    }
    if (statusCode === 6) {
      return { status: 'cancelled', sms: null, statusCode: 6 };
    }
    if (statusCode === 8) {
      return { status: 'released', sms: null, statusCode: 8 };
    }
  }
  
  return { status: 'unknown', sms: null, statusCode: -1 };
}

export async function cancelActivation(activationId: string) {
  const data = await tigerRequest('setStatusV2', {
    id: activationId,
    status: 8
  });
  
  if (typeof data === 'string' && data === '1') {
    return { success: true };
  }
  
  throw new Error(`Failed to cancel activation: ${data}`);
}

export async function getServicesList(countryCode: string = 'US') {
  const data = await tigerRequest('getServicesList', {
    country: countryCode,
    lang: 'en'
  });
  
  if (typeof data !== 'object' || !data) {
    throw new Error('No services list available');
  }
  
  return data;
}
