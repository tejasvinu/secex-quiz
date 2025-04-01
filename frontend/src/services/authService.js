import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

const register = async (userData) => {
    const response = await axios.post(`${API_URL}/register`, userData);
    if (response.data) {
        localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
};

const login = async (credentials) => {
    const response = await axios.post(`${API_URL}/login`, credentials);
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