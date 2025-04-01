import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import LoadingSpinner from '../components/LoadingSpinner'; // Import LoadingSpinner

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            try {
                const user = authService.getCurrentUser();
                setUser(user);
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (credentials) => {
        setAuthLoading(true);
        setError(null);
        try {
            const userData = await authService.login(credentials);
            setUser(userData);
            return userData;
        } catch (error) {
            setError(error.response?.data?.message || 'Login failed');
            throw error;
        } finally {
            setAuthLoading(false);
        }
    };

    const register = async (userData) => {
        setAuthLoading(true);
        setError(null);
        try {
            const newUser = await authService.register(userData);
            setUser(newUser);
            return newUser;
        } catch (error) {
            setError(error.response?.data?.message || 'Registration failed');
            throw error;
        } finally {
            setAuthLoading(false);
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-blue-700">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ 
            user, 
            login, 
            register, 
            logout, 
            authLoading,
            error 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};