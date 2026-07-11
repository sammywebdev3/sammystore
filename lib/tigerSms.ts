import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = 'https://api.tiger-sms.com/stubs/handler_api.php';

if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');

async function tigerRequest(action: string, params: Record<string, any> = {}) {
  try {
    const res = await axios.get(BASE_URL, {
      params: { api_key: API_KEY, action, ...params }
    });
    
    // Handle string errors like "ERROR_BAD_SERVICE"
    if (typeof res.data === 'string') {
      if (res.data.startsWith('ERROR')) throw new Error(res.data);
      return res.data; // Sometimes it returns just a number or status string
    }
    return res.data;
  } catch (error: any) {
    console.error(`TigerSMS ${action} error:`, error.response?.data || error.message);
    throw error;
  }
}

export async function getCountries() {
  // Fetch services list for US with English names as a reference
  const data = await tigerRequest('getServicesList', { country: 'US', lang: 'en' });
  
  console.log('=== TIGER SMS RAW COUNTRY DATA ===');
  console.log(JSON.stringify(data).substring(0, 2000)); 
  console.log('==================================');

  const countryMap = new Map<string, string>();

  // Safely iterate through the object
  if (data && typeof data === 'object') {
    Object.values(data).forEach((service: any) => {
      if (service && service.countries && Array.isArray(service.countries)) {
        service.countries.forEach((c: any) => {
          // Extract ID and Name safely
          const id = String(c.id || c.code || '');
          const name = c.title || c.name || '';
          
          if (id && name && !countryMap.has(id)) {
            countryMap.set(id, name);
          }
        });
      }
    });
  }

  const countries = Array.from(countryMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  console.log(`Processed ${countries.length} countries`);
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
