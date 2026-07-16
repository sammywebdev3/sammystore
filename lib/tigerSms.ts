import axios from 'axios';

const API_KEY = process.env.TIGER_SMS_API_KEY;
const BASE_URL = 'https://api.tiger-sms.com/stubs/handler_api.php';

// Fallback names used only if the live getServicesList call fails entirely
const FALLBACK_SERVICE_NAMES: Record<string, string> = {
  "wa": "WhatsApp", "tg": "Telegram", "go": "Google", "ig": "Instagram",
  "fb": "Facebook", "tw": "Twitter", "vk": "VK", "ok": "OK",
  "mm": "Viber", "vi": "Viber", "ub": "Uber", "ya": "Yandex",
  "li": "LinkedIn", "sn": "Snapchat", "dc": "Discord", "nf": "Netflix"
};

// Cache the code->name map in memory since TigerSMS's service catalog rarely
// changes - avoids an extra API round-trip on every single services request.
let serviceNameCache: Record<string, string> | null = null;
let serviceNameCacheAt = 0;
const SERVICE_NAME_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

async function getServiceNameMap(): Promise<Record<string, string>> {
  const now = Date.now();
  if (serviceNameCache && now - serviceNameCacheAt < SERVICE_NAME_CACHE_TTL) {
    return serviceNameCache;
  }

  try {
    const data = await tigerRequest('getServicesList', { lang: 'en' });
    const map: Record<string, string> = {};

    const list = Array.isArray(data)
      ? data
      : Array.isArray(data?.services)
      ? data.services
      : null;

    if (list) {
      for (const item of list) {
        const code = item.code || item.service;
        const name = item.name || item.title;
        if (code && name) map[code] = name;
      }
    } else if (data && typeof data === 'object') {
      for (const [code, name] of Object.entries(data)) {
        if (typeof name === 'string') map[code] = name;
      }
    }

    if (Object.keys(map).length > 0) {
      serviceNameCache = map;
      serviceNameCacheAt = now;
      return map;
    }
  } catch (e: any) {
    console.error('[TigerSMS] Failed to fetch service names, using fallback list:', e.message);
  }

  return FALLBACK_SERVICE_NAMES;
}

async function tigerRequest(action: string, params: Record<string, any> = {}) {
  if (!API_KEY) throw new Error('TIGER_SMS_API_KEY is not set');
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
  // NOTE: getPricesV3 requires BOTH `service` and `country` per Tiger-SMS's
  // spec - it has no "browse all services for a country" mode, and calling
  // it with country only returns a BAD_SERVICE error ("Unknown or missing
  // service code"). Since this screen's whole purpose is letting the user
  // browse every available service for a chosen country (the service isn't
  // known yet), we must use the v1 `getPrices` action instead, which treats
  // both `service` and `country` as optional filters and returns every
  // service for a country when `service` is omitted.
  const data = await tigerRequest('getPrices', { country: countryId });
  
  // v1 getPrices returns a plain-text token on failure (not JSON), one of
  // BAD_SERVICE / BAD_COUNTRY / BAD_VALUES / BAD_KEY - not an "ERROR:..."
  // string as previously assumed.
  if (typeof data === 'string') {
    if (data === 'BAD_KEY') {
      throw new Error('TigerSMS API key is invalid or missing');
    }
    if (data === 'BAD_COUNTRY') {
      throw new Error('Unknown country');
    }
    if (data === 'BAD_SERVICE' || data === 'BAD_VALUES') {
      throw new Error(`Prices error: ${data}`);
    }
    throw new Error(`Prices error: ${data}`);
  }
  
  if (typeof data !== 'object' || !data) {
    throw new Error('No services available for this country');
  }

  // getPrices nests results by country then service:
  // { "<countryId>": { "<serviceCode>": { cost, count } } }. Unwrap that
  // layer before reading services, otherwise every entry's serviceData is
  // a country object with no cost/count, price computes to 0, and every
  // service gets filtered out (this is why the services list appeared
  // empty in the UI).
  let serviceMap: Record<string, any> = data;
  const topLevelValues = Object.values(data);
  const looksNested =
    topLevelValues.length > 0 &&
    topLevelValues.every(
      (v) => v && typeof v === 'object' && !('cost' in v) && !('price' in v)
    );

  if (looksNested) {
    serviceMap = (data as any)[countryId] ?? topLevelValues[0] ?? {};
  }

  const nameMap = await getServiceNameMap();

  const services = Object.entries(serviceMap)
    .map(([serviceCode, serviceData]: [string, any]) => ({
      service: serviceCode,
      name: nameMap[serviceCode] || FALLBACK_SERVICE_NAMES[serviceCode] || serviceCode.toUpperCase(),
      price: parseFloat(serviceData?.cost ?? serviceData?.price ?? 0),
      count: parseInt(serviceData?.count ?? 0)
    }))
    .filter(s => s.price > 0 && s.count > 0)
    .sort((a, b) => a.price - b.price);

  return services;
}

export async function buyNumber(countryId: string, serviceCode: string) {
  // NOTE: `getNumber` (v1) returns a plain-text response like
  // "ACCESS_NUMBER:123456789:79991234567" on success, or a bare error
  // token (NO_NUMBERS, NO_BALANCE, BAD_SERVICE, ...) on failure - it never
  // returns JSON. The code here previously assumed a JSON object with
  // `id`/`number` fields, so every single purchase fell through to
  // "Invalid buy number response" regardless of whether TigerSMS actually
  // issued a number. `getNumberV2` is the JSON-native equivalent and
  // returns {activationId, phoneNumber, ...} on success while still
  // returning the same bare error tokens as plain text on failure.
  // NOTE: fixedPrice was previously set to 'true', which tells TigerSMS to
  // reject the purchase outright if its real-time price has moved even
  // slightly since our getPrices() call a moment earlier - rather than just
  // charging the current price. For most services this window is harmless
  // since prices barely move, but WhatsApp is by far the most contested
  // service on this API (every reseller's customers are drawing from the
  // same number pool), so its price/stock can shift within the same
  // request cycle. That made fixedPrice reject WhatsApp purchases far more
  // often than any other service - this is why WhatsApp specifically kept
  // failing. Omitting it lets TigerSMS fulfill at its actual current price.
  const data = await tigerRequest('getNumberV2', {
    country: countryId,
    service: serviceCode,
    activationType: 'SMS'
  });

  if (typeof data === 'string') {
    const KNOWN_ERRORS: Record<string, string> = {
      NO_NUMBERS: 'No numbers available for this service/country right now',
      NO_BALANCE: 'Provider balance too low to fulfil this order',
      BAD_KEY: 'TigerSMS API key is invalid or missing',
      BAD_SERVICE: 'Unknown service',
      BAD_COUNTRY: 'Unknown country',
      WRONG_SERVICE: 'Unknown service',
      ERROR_SQL: 'TigerSMS provider error, please try again',
    };
    throw new Error(KNOWN_ERRORS[data] || `Buy number error: ${data}`);
  }

  if (typeof data !== 'object' || !data) {
    throw new Error('Invalid buy number response');
  }

  // getNumberV2 success shape: {activationId, phoneNumber, activationCost, ...}
  const id = data.activationId ?? data.id;
  const number = data.phoneNumber ?? data.number;

  if (!id || !number) {
    throw new Error(`Invalid response: ${JSON.stringify(data)}`);
  }

  return {
    id: String(id),
    number: String(number),
    server: data.server,
    // Actual provider-side cost, now that fixedPrice no longer forces an
    // exact match to our quoted price - useful for spotting drift, not
    // used to change what the customer is charged.
    providerCost: data.activationCost !== undefined ? parseFloat(data.activationCost) : null
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
