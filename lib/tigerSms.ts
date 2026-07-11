import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = 'https://api.tiger-sms.com/stubs/handler_api.php';

if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');

async function tigerRequest(action: string, params: Record<string, any> = {}) {
  const res = await axios.get(BASE_URL, {
    params: { api_key: API_KEY, action, ...params }
  });
  
  // TigerSMS returns errors as plain strings starting with ERROR_
  if (typeof res.data === 'string' && res.data.startsWith('ERROR')) {
    throw new Error(res.data);
  }
  return res.data;
}

/**
 * Get Countries - Uses getServicesList with lang=en for proper English names
 * This avoids the broken getCountries endpoint that returns only numeric IDs
 */
export async function getCountries() {
  const data = await tigerRequest('getServicesList', { lang: 'en' });
  
  // Extract unique countries from all services
  const countryMap = new Map<string, string>();
  
  Object.values(data).forEach((serviceInfo: any) => {
    if (serviceInfo.countries && Array.isArray(serviceInfo.countries)) {
      serviceInfo.countries.forEach((country: any) => {
        // country object has { id, title, name, iso } when lang=en is used
        const id = String(country.id);
        const name = country.title || country.name || country.iso || id;
        if (id && name && !countryMap.has(id)) {
          countryMap.set(id, name);
        }
      });
    }
  });
  
  return Array.from(countryMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get Services/Prices for a specific country
 * Uses getPricesV3 as shown in your provided code
 */
export async function getServices(countryId: string) {
  const data = await tigerRequest('getPricesV3', { country: countryId });
  
  return Object.entries(data)
    .filter(([_, info]: [string, any]) => {
      const count = typeof info === 'object' ? info.count : 0;
      return count > 0;
    })
    .map(([service, info]: [string, any]) => ({
      service,
      name: typeof info === 'object' ? (info.title || service.toUpperCase()) : service.toUpperCase(),
      price: typeof info === 'object' ? parseFloat(info.cost || info.price || 0) : 0,
      count: typeof info === 'object' ? info.count : 0
    }))
    .sort((a, b) => a.price - b.price);
}

/**
 * Buy Number - Uses getNumber with activationType=SMS and fixedPrice=true
 * Exactly matching your provided fetch call
 */
export async function buyNumber(countryId: string, service: string) {
  const data = await tigerRequest('getNumber', { 
    country: countryId, 
    service,
    activationType: 'SMS',
    fixedPrice: 'true'
  });
  
  if (typeof data === 'string') throw new Error(data);
  if (!data.activationId || !data.number) {
    throw new Error('Failed to get number - invalid response');
  }
  
  return { id: data.activationId, number: data.number };
}

/**
 * Check SMS Status - Uses getStatus with full_text=false
 * Exactly matching your provided fetch call
 */
export async function checkSms(activationId: string) {
  const data = await tigerRequest('getStatus', { 
    id: activationId,
    full_text: 'false'
  });
  
  // Returns { activationId, text, code, country, receivedAt } when SMS arrives
  // Returns status string like "STATUS_WAIT_CODE" when waiting
  if (typeof data === 'object' && data.code) {
    return { status: 'completed', sms: data.code };
  }
  return { status: typeof data === 'string' ? data : 'unknown', sms: null };
}

/**
 * Get Balance - For pre-purchase validation
 */
export async function getBalance() {
  const data = await tigerRequest('getBalance');
  return parseFloat(data);
}
