import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = 'https://api.tiger-sms.com/stubs/handler_api.php';

if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');

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
  
  // Response format: {"balance": 123.45} or just a number
  if (typeof data === 'object' && data.balance) {
    return parseFloat(data.balance);
  }
  
  if (typeof data === 'number') {
    return data;
  }
  
  throw new Error('Invalid balance response');
}

export async function getCountries() {
  const data = await tigerRequest('getCountries');
  
  // Data should be an array: [{id, eng, rus, chn, visible, retry}, ...]
  if (!Array.isArray(data)) {
    console.error('Expected array, got:', typeof data, data);
    throw new Error('Invalid countries response - expected array');
  }

  // Map the response to our format
  const countries = data
    .map((countryData: any) => ({
      id: String(countryData.id),
      name: countryData.eng || countryData.rus || `Country ${countryData.id}`,
      visible: countryData.visible
    }))
    .filter(c => c.visible === 1) // Only show visible countries
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
