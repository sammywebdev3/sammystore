import axios from 'axios';

const BASE_URL = 'https://clubkonnect.com/api';

export async function clubkonnectRequest(endpoint: string, params: Record<string, any> = {}) {
  const apiKey = process.env.CLUBKONNECT_API_KEY;
  
  if (!apiKey) throw new Error('Clubkonnect API key not configured');

  const response = await axios.get(`${BASE_URL}${endpoint}`, {
    params: {
      key: apiKey,
      ...params
    }
  });

  return response.data;
}
