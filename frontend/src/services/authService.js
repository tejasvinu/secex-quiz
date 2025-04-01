import axios from 'axios';

// Create an axios instance with baseURL and common headers
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

const register = async (userData) => {
    const response = await axiosInstance.post('/api/auth/register', userData);
    if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

const login = async (credentials) => {
    const response = await axiosInstance.post('/api/auth/login', credentials);
    if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

const logout = () => {
    localStorage.removeItem('user');
};

const getCurrentUser = () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
};

export const authService = {
    register,
    login,
    logout,
    getCurrentUser,
};