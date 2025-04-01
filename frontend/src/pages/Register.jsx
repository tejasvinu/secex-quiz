import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();
    const { register, authLoading } = useAuth();

    const validateForm = () => {
        const newErrors = {};
        if (!formData.username) {
            newErrors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (!formData.confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        try {
            const { confirmPassword, ...registerData } = formData;
            await register(registerData);
            toast.success('Registration successful! Welcome aboard!', {
                duration: 3000,
                position: 'top-right',
                className: 'bg-green-50 text-green-800'
            });
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed', {
                duration: 4000,
                position: 'top-right',
                className: 'bg-red-50 text-red-800'
            });
        }
    };

    const renderInput = (name, label, type = 'text') => (
        <div>
            <label htmlFor={name} className="text-sm font-medium text-slate-700">
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                required
                className={`appearance-none relative block w-full px-3 py-2 mt-1
                border ${errors[name] ? 'border-red-500' : 'border-gray-300'}
                placeholder-gray-500 text-slate-900 bg-white rounded-lg
                focus:outline-none input-focus
                transition-all duration-200`}
                placeholder={`Enter your ${name.toLowerCase()}`}
                value={formData[name]}
                onChange={handleChange}
            />
            {errors[name] && (
                <p className="mt-1 text-sm text-red-600">{errors[name]}</p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col">
            <nav className="bg-transparent py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <Link to="/" className="text-white text-xl font-bold hover:text-gray-200 transition-colors">
                            CII SecEx 2025
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="flex flex-grow items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-xl">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-bold text-slate-800">
                            Create your account
                        </h2>
                        <p className="mt-2 text-center text-sm text-slate-600">
                            Already have an account?{' '}
                            <Link 
                                to="/login" 
                                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="rounded-md space-y-4">
                            {renderInput('username', 'Username')}
                            {renderInput('email', 'Email address', 'email')}
                            {renderInput('password', 'Password', 'password')}
                            {renderInput('confirmPassword', 'Confirm Password', 'password')}
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={authLoading}
                                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent
                                text-sm font-medium rounded-lg text-white bg-blue-600
                                ${authLoading ? 'opacity-75 cursor-not-allowed' : 'hover:bg-blue-700'}
                                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                transform hover:scale-105 transition-all duration-200 ease-in-out`}
                            >
                                {authLoading ? (
                                    <LoadingSpinner size="small" />
                                ) : (
                                    'Create Account'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}