import axios from "axios"
import { BASE_URL } from "./apiConfig"

const totalValuesApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

totalValuesApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

async function getAllTotalValues(id) {
    try {
        const response = await totalValuesApi.get(`/auth/getAllTotalValueBrokers/${id}`)
        return response.data
    } catch (error) {
        console.error('Error fetching total values:', error)
        throw error
    }
}

async function addTotalValue(totalValue) {
    try {
        const response = await totalValuesApi.post('/auth/createTotalValueBroker', totalValue)
        return response.data
    } catch (error) {
        console.error('Error adding total value:', error)
        throw error
    }
}

async function deleteTotalValue(id) {
    try {
        const response = await totalValuesApi.delete(`/auth/deleteTotalValueBroker/${id}`)
        return response.data
    } catch (error) {
        console.error('Error deleting total value:', error)
        throw error
    }
}

export { getAllTotalValues,
         addTotalValue,
         deleteTotalValue
        }