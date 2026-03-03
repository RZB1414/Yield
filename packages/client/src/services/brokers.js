import axios from "axios"
import { BASE_URL } from "./apiConfig"

const brokersApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

brokersApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

async function getBrokers(id) {
    try {
        const response = await brokersApi.get(`/auth/getBrokers/${id}`)
        return response.data
    } catch (error) {
        console.error('Error fetching brokers:', error)
        throw error
    }
}

async function addBroker(broker) {
    try {
        const response = await brokersApi.post('/auth/createBroker', broker)
        return response.data
    } catch (error) {
        console.error('Error adding broker:', error)
        throw error
    }
}

export { getBrokers,
         addBroker }