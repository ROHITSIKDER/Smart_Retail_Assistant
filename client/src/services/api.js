import axios from 'axios';

const API = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 30000 // 30s timeout for scraping + AI processing
});

export const analyzeProductUrl = async (url) => {
  try {
    const response = await API.post('/analyze', { url });
    return response.data;
  } catch (error) {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw new Error(error.message || 'Failed to analyze product URL. Please verify server connection.');
  }
};

export const fetchHistory = async () => {
  try {
    const response = await API.get('/history');
    return response.data;
  } catch (error) {
    console.warn('Failed to fetch analysis history:', error.message);
    return { success: false, data: [] };
  }
};
