import axios from 'axios';

const API = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 32000 // 32s safety floor (exceeds backend 26s request deadline)
});

export const analyzeProductUrl = async (url, options = {}) => {
  const { signal, forceRefresh = false } = options;
  try {
    const response = await API.post('/analyze', { url, forceRefresh }, { signal });
    return response.data;
  } catch (error) {
    if (axios.isCancel(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      const cancelError = new Error('Product analysis request was cancelled.');
      cancelError.isCancelled = true;
      cancelError.code = 'CANCELLED';
      throw cancelError;
    }

    const serverData = error.response?.data || {};
    const statusCode = error.response?.status || (error.code === 'ECONNABORTED' ? 504 : 500);
    const category = serverData.category || serverData.code || (error.code === 'ECONNABORTED' || statusCode === 504 ? 'TIMEOUT' : 'UNKNOWN');

    const isTimeout = error.code === 'ECONNABORTED' || statusCode === 504 || category === 'TIMEOUT' || (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'));
    const isBlocked = ['BOT_BLOCKED', 'CAPTCHA', 'ACCESS_DENIED', 'RATE_LIMITED', 'LOGIN_REQUIRED'].includes(category);
    const isTechnical = ['LAYOUT_CHANGED', 'INVALID_PRODUCT_PAGE', 'NETWORK_ERROR', 'EXTRACTION_FAILED'].includes(category);

    let displayMessage = serverData.error || error.message;
    if (isTimeout && !serverData.error) {
      displayMessage = 'Analysis timed out. The e-commerce store or AI engine took longer than expected to respond.';
    }

    const enhancedError = new Error(displayMessage || 'Failed to analyze product URL. Please verify server connection.');
    enhancedError.isTimeout = isTimeout;
    enhancedError.isBlocked = isBlocked;
    enhancedError.isTechnical = isTechnical;
    enhancedError.category = category;
    enhancedError.statusCode = statusCode;
    enhancedError.dataQualityState = serverData.dataQualityState;
    enhancedError.platform = serverData.platform;

    throw enhancedError;
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
