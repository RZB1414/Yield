import axios from "axios"
import { BASE_URL } from "./apiConfig"

const stocksApi = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

stocksApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);


async function searchStocks(search) {
    try {
        const response = await stocksApi.post('/auth/searchStocks', { "stock": search })
        if (response.data && response.data.aviso) {
            return { aviso: response.data.aviso };
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching stocks:', error);
        throw error;
    }
}


async function stockData(stock) {
    try {
        const response = await stocksApi.post('/auth/getStockData', { "stock": stock })
        if (response.data && response.data.aviso) {
            return { aviso: response.data.aviso };
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching stock data:', error);
        throw error;
    }
}


async function addStock(stock) {
    try {
        const response = await stocksApi.post('/auth/addStock', stock);
        if (response.data && response.data.aviso) {
            return { aviso: response.data.aviso };
        }
        
        return response.data;
    } catch (error) {
        console.error('Error adding stock:', error);
        throw error;
    }
}


async function getStocksList(id) {
    try {
        const response = await stocksApi.get(`/auth/getStocksList/${id}`);
        
        if (response.data && response.data.aviso) {
            return { aviso: response.data.aviso };
        }
        return response.data;
    } catch (error) {
        console.error('Error listing stocks:', error);
        throw error;
    }
}


async function updateStock(stock) {
    try {
        const response = await stocksApi.put(`/auth/updateStock/${stock._id}`, {
            averagePrice: stock.averagePrice,
            stocksQuantity: stock.stocksQuantity
        });
        if (response.data && response.data.aviso) {
            return { aviso: response.data.aviso };
        }
        return response.data;
    } catch (error) {
        console.error('Error updating stock:', error);
        throw error;
    }
}


async function deleteStock(stockId) {
    try {
        const response = await stocksApi.delete(`/auth/deleteStock/${stockId}`);
        if (response.data && response.data.aviso) {
            return { aviso: response.data.aviso };
        }
        return response.data;
    } catch (error) {
        console.error('Error deleting stock:', error);
        throw error;
    }
}

export { searchStocks,
            stockData,
            addStock,
            getStocksList,
            updateStock,
            deleteStock
        }