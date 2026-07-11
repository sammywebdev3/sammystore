import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = process.env.TIGER_SMS_BASE_URL || 'https://api.tiger-sms.com/stubs/handler_api.php';

if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');

async function tigerRequest(action: string, params: Record<string, any> = {}) {
  const res = await axios.get(BASE_URL, {
    params: { api_key: API_KEY, action, ...params }
  });
  
  // Tiger-SMS returns errors as strings like "ERROR_NO_BALANCE"
  if (typeof res.data === 'string' && res.data.startsWith('ERROR')) {
    throw new Error(res.data);
  }
  return res.data;
}

export async function getCountries() {
  const data = await tigerRequest('getCountries');
  // Returns object { "6": "Russia", "12": "Ukraine", ... }
  return Object.entries(data).map(([id, name]: [string, any]) => ({
    id,
    name: typeof name === 'string' ? name : name.title || name.name || id
  })).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getServices(countryId: string) {
  const data = await tigerRequest('getPricesV3', { country: countryId });
  // Returns object { "tg": { "cost": 5.5, "count": 120 }, ... }
  return Object.entries(data)
    .filter(([_, info]: [string, any]) => info.count > 0)
    .map(([service, info]: [string, any]) => ({
      service,
      name: info.title || service.toUpperCase(),
      price: parseFloat(info.cost),
      count: info.count
    }))
    .sort((a, b) => a.price - b.price);
}

export async function buyNumber(countryId: string, service: string) {
  const data = await tigerRequest('getNumber', { country: countryId, service });
  // Returns { "activationId": "557860099", "number": "+79991234567" } or error string
  if (!data.activationId || !data.number) {
    throw new Error(typeof data === 'string' ? data : 'Failed to get number');
  }
  return { id: data.activationId, number: data.number };
}

export async function checkSms(activationId: string) {
  const data = await tigerRequest('getStatus', { id: activationId });
  // Returns { "activationId": "...", "text": "Your code is 123456", "code": "123456" }
  // Or status string like "STATUS_WAIT_CODE"
  if (typeof data === 'object' && data.code) {
    return { status: 'completed', sms: data.code };
  }
  return { status: data, sms: null };
}
