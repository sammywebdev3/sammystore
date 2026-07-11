import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = 'https://api.tiger-sms.com/stubs/handler_api.php';

if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');

async function tigerRequest(action: string, params: Record<string, any> = {}) {
  const res = await axios.get(BASE_URL, {
    params: { api_key: API_KEY, action, ...params }
  });
  
  if (typeof res.data === 'string' && res.data.startsWith('ERROR')) {
    throw new Error(res.data);
  }
  return res.data;
}

export async function getCountries() {
  // Use getServicesList which returns proper country names
  const data = await tigerRequest('getServicesList');
  
  console.log('Raw services list:', JSON.stringify(data).substring(0, 1000));
  
  // Extract unique countries from services list
  const countryMap = new Map();
  
  Object.entries(data).forEach(([serviceId, serviceInfo]: [string, any]) => {
    if (serviceInfo.countries && Array.isArray(serviceInfo.countries)) {
      serviceInfo.countries.forEach((country: any) => {
        const id = String(country.id || country.code || country);
        const name = country.title || country.name || country;
        if (id && name && !countryMap.has(id)) {
          countryMap.set(id, name);
        }
      });
    }
  });
  
  // Convert to sorted array
  const countries = Array.from(countryMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  
  console.log('Processed countries count:', countries.length);
  
  return countries;
}

export async function getServices(countryId: string) {
  const data = await tigerRequest('getPricesV3', { country: countryId });
  
  console.log('Raw services for country', countryId, ':', JSON.stringify(data).substring(0, 500));
  
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

export async function buyNumber(countryId: string, service: string) {
  const data = await tigerRequest('getNumber', { country: countryId, service });
  
  if (typeof data === 'string') throw new Error(data);
  if (!data.activationId || !data.number) throw new Error('Failed to get number');
  
  return { id: data.activationId, number: data.number };
}

export async function checkSms(activationId: string) {
  const data = await tigerRequest('getStatus', { id: activationId });
  
  if (typeof data === 'object' && data.code) {
    return { status: 'completed', sms: data.code };
  }
  return { status: data, sms: null };
}
