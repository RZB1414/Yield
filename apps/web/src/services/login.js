import axios from "axios"
import { BASE_URL } from "./apiConfig"


const loginApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Adiciona o token JWT em todas as requisições, se existir
loginApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

async function createUser(form) {
    try {
        const response = await loginApi.post('/auth/createUser', form)

        return response.data
    } catch (error) {
        console.error('Error creating user:', error)
        throw error
    }
}


async function loginUser(form) {
    try {
        const response = await loginApi.post('/auth/login', form);
        
        // Salva o token JWT no sessionStorage
        if (response.data && response.data.accessToken) {
            sessionStorage.setItem('accessToken', response.data.accessToken);
        }
        return response.data;
    } catch (error) {
        console.error('Error logging in:', error);
        throw error;
    }
}

async function getCurrentUser() {
    try {
        const response = await loginApi.get('/auth/me')        
        return response.data
    } catch (error) {
        console.error('Erro ao obter usuário atual:', error)
        throw error
    }
}

export {
    createUser,
    loginUser,
    getCurrentUser
}