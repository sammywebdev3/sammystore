import axios from 'axios';

const BASE_URL = 'https://justanotherpanel.com/api/v2';

export async function japRequest(action: string, params: Record<string, any> = {}) {
  const apiKey = process.env.JAP_API_KEY;
  
  if (!apiKey) throw new Error('JAP API key not configured');

  const response = await axios.post(BASE_URL, new URLSearchParams({
    key: apiKey,
    action,
    ...params
  }));

  return response.data;
}
