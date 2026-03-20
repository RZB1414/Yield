import axios from 'axios';
import { BASE_URL } from './apiConfig';

// Axios instance replicating pattern used in other services
const holdingsApi = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

holdingsApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Fetch holdings history
 * @param {string} userId - User identifier
 * @param {string} [symbol] - Optional stock symbol filter
 * @returns {Promise<Array>} Array of history objects
 */
async function getHoldingsHistory(userId, symbol) {
  if (!userId) throw new Error('userId is required');
  try {
    const params = symbol ? { userId, symbol } : { userId };
    const response = await holdingsApi.get('/auth/holdings/history', { params });
    if (response.data && response.data.aviso) {
      return { aviso: response.data.aviso };
    }
    return response.data; // Expecting an array of { symbol, quantity, averagePrice, validFrom, validTo }
  } catch (error) {
    console.error('Error fetching holdings history:', error);
    throw error;
  }
}

export { getHoldingsHistory };
