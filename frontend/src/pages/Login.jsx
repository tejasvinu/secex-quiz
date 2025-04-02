import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [errors, setErrors] = useState({});
    const [rememberMe, setRememberMe] = useState(false);
    const navigate = useNavigate();
    const { login, authLoading } = useAuth();
    const [animateForm, setAnimateForm] = useState(false);

    useEffect(() => {
        // Trigger animation after component mounts
        setTimeout(() => setAnimateForm(true), 100);
    }, []);

    const validateForm = () => {
        const newErrors = {};
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
        if (!validateForm()) {
            // Apply shake animation to form when validation fails
            const form = document.getElementById('login-form');
            form.classList.add('form-error');
            setTimeout(() => form.classList.remove('form-error'), 500);
            return;
        }

        try {
            await login(formData, rememberMe);
            toast.success('Welcome back!', {
                duration: 3000,
                position: 'top-right',
                className: 'bg-green-50 text-green-800'
            });
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to login', {
                duration: 4000,
                position: 'top-right',
                className: 'bg-red-50 text-red-800'
            });
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 flex flex-col">
            <div className="absolute inset-0 bg-slate-900 opacity-40"></div>
            <div className="relative z-10">
                <nav className="bg-transparent py-6">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between items-center">
                            <Link to="/" className="text-white text-xl font-bold hover:text-gray-200 transition-colors flex items-center">
                                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 mr-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <span className="text-xl font-bold text-white transition-all duration-300 ease-in-out flex flex-col">
                                    <span className="font-bold">CII SecEx</span>
                                    <span className="text-xs text-blue-400 font-medium -mt-1">2025</span>
                                </span>
                            </Link>
                        </div>
                    </div>
                </nav>

                <div className="flex flex-grow items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
                    <div className={`max-w-md w-full space-y-8 bg-white/10 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-white/20 transform transition-all duration-700 ${animateForm ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div>
                            <div className="h-16 w-16 mx-auto flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 mb-6">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                </svg>
                            </div>
                            <h2 className="text-center text-3xl font-extrabold text-white tracking-tight">
                                Welcome Back
                            </h2>
                            <p className="mt-2 text-center text-sm text-slate-300">
                                Don't have an account?{' '}
                                <Link 
                                    to="/register" 
                                    className="font-medium text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    Sign up now
                                </Link>
                            </p>
                        </div>
                        
                        <form id="login-form" className="mt-8 space-y-6" onSubmit={handleSubmit}>
                            <div className="rounded-md space-y-5">
                                <div className="transform transition-all duration-200">
                                    <label htmlFor="email" className="text-sm font-medium text-slate-300 block mb-1.5">
                                        Email address
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                            </svg>
                                        </div>
                                        <input
                                            id="email"
                                            name="email"
                                            type="email"
                                            autoComplete="email"
                                            required
                                            className={`input-glass appearance-none relative block w-full pl-10 pr-3 py-3 border ${errors.email ? 'border-red-500' : 'border-white/20'} placeholder-white/50 text-white rounded-lg focus:outline-none focus:ring-2 ${errors.email ? 'focus:ring-red-500' : 'focus:ring-blue-500'} focus:border-transparent transition-all duration-300 ease-in-out bg-white/10 backdrop-blur-sm`}
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    {errors.email && (
                                        <p className="mt-1.5 text-sm text-red-400 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            {errors.email}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="transform transition-all duration-200">
                                    <label htmlFor="password" className="text-sm font-medium text-slate-300 block mb-1.5">
                                        Password
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="password"
                                            name="password"
                                            type="password"
                                            autoComplete="current-password"
                                            required
                                            className={`input-glass appearance-none relative block w-full pl-10 pr-3 py-3 border ${errors.password ? 'border-red-500' : 'border-white/20'} placeholder-white/50 text-white rounded-lg focus:outline-none focus:ring-2 ${errors.password ? 'focus:ring-red-500' : 'focus:ring-blue-500'} focus:border-transparent transition-all duration-300 ease-in-out bg-white/10 backdrop-blur-sm`}
                                            placeholder="••••••••"
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                    </div>
                                    {errors.password && (
                                        <p className="mt-1.5 text-sm text-red-400 flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            {errors.password}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <input
                                        id="remember-me"
                                        name="remember-me"
                                        type="checkbox"
                                        checked={rememberMe}
                                        onChange={() => setRememberMe(!rememberMe)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded bg-white/20"
                                    />
                                    <label htmlFor="remember-me" className="ml-2 block text-sm text-white">
                                        Remember me
                                    </label>
                                </div>

                                <div className="text-sm">
                                    <a href="#" className="font-medium text-blue-400 hover:text-blue-300 transition-colors">
                                        Forgot password?
                                    </a>
                                </div>
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={authLoading}
                                    className={`group relative w-full flex justify-center py-3 px-4 border border-transparent
                                    text-sm font-medium rounded-lg text-white btn-gradient
                                    ${authLoading ? 'opacity-75 cursor-not-allowed' : ''}
                                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                                    transform transition-all duration-300 ease-in-out shadow-lg hover:shadow-blue-500/20`}
                                >
                                    {authLoading ? (
                                        <LoadingSpinner size="small" color="white" type="wave" />
                                    ) : (
                                        <>
                                            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                                <svg className="h-5 w-5 text-white/70 group-hover:text-white transition-colors" 
                                                    xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                </svg>
                                            </span>
                                            Sign in
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                        
                        <div className="divider text-gray-400">or continue with</div>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <button className="btn-glass flex justify-center items-center py-2.5 px-4 rounded-lg hover:bg-white/20 transition-all duration-200">
                                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12.0003 0C5.3723 0 0 5.3723 0 12.0003C0 17.3003 3.438 21.8003 8.2073 23.3863C8.8073 23.4943 9.0243 23.1263 9.0243 22.8003C9.0243 22.5003 9.0153 21.9803 9.0093 21.0003C5.6723 21.7443 4.9683 19.4583 4.9683 19.4583C4.4223 18.0243 3.6383 17.6583 3.6383 17.6583C2.5453 16.9043 3.7223 16.9223 3.7223 16.9223C4.9223 17.0103 5.5553 18.1643 5.5553 18.1643C6.6263 20.0203 8.3643 19.5143 9.0483 19.2003C9.1563 18.4103 9.4663 17.9043 9.8103 17.6043C7.1453 17.3043 4.3443 16.2583 4.3443 11.5683C4.3443 10.2343 4.8093 9.1483 5.5793 8.2993C5.4543 7.9813 5.0443 6.7423 5.6953 5.0643C5.6953 5.0643 6.7043 4.7343 8.9963 6.3123C9.9563 6.0423 10.9793 5.9083 11.9993 5.9023C13.0193 5.9083 14.0423 6.0423 15.0023 6.3123C17.2943 4.7343 18.3033 5.0643 18.3033 5.0643C18.9543 6.7423 18.5443 7.9813 18.4193 8.2993C19.1903 9.1483 19.6543 10.2343 19.6543 11.5683C19.6543 16.2683 16.8493 17.2983 14.1753 17.5983C14.6063 17.9643 14.9913 18.6983 14.9913 19.8083C14.9913 21.4163 14.9753 22.4063 14.9753 22.8003C14.9753 23.1273 15.1913 23.4963 15.8033 23.3843C20.5653 21.7963 24.0003 17.2983 24.0003 12.0003C24.0003 5.3723 18.6273 0 12.0003 0Z" />
                                </svg>
                            </button>
                            <button className="btn-glass flex justify-center items-center py-2.5 px-4 rounded-lg hover:bg-white/20 transition-all duration-200">
                                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M24 12.0733C24 5.4043 18.6281 0 12.0012 0C5.37438 0 0 5.407 0 12.0733C0 18.0994 4.38938 23.0943 10.1252 24V15.5633H7.07775V12.0733H10.1264V9.413C10.1264 6.3842 11.9157 4.71617 14.6564 4.71617C15.9692 4.71617 17.3424 4.95217 17.3424 4.95217V7.9217H15.8305C14.3413 7.9217 13.8747 8.85383 13.8747 9.8095V12.0733H17.2031L16.6711 15.5633H13.8735V24.0012C19.6094 23.0955 24 18.1006 24 12.0733Z" />
                                </svg>
                            </button>
                            <button className="btn-glass flex justify-center items-center py-2.5 px-4 rounded-lg hover:bg-white/20 transition-all duration-200">
                                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C16.827 16.3285 14.6115 18 12 18C8.6865 18 6 15.3135 6 12C6 8.6865 8.6865 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C6.4775 2 2 6.4775 2 12C2 17.5225 6.4775 22 12 22C17.5225 22 22 17.5225 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" />
                                    <path d="M3.15302 7.3455L6.43851 9.755C7.32752 7.554 9.48052 6 12 6C13.5295 6 14.921 6.577 15.9805 7.5195L18.809 4.691C17.023 3.0265 14.634 2 12 2C8.15902 2 4.82802 4.1685 3.15302 7.3455Z" fill="#FF3D00" />
                                    <path d="M12 22C14.583 22 16.93 21.0115 18.7045 19.404L15.6095 16.785C14.5717 17.5742 13.3037 18.001 12 18C9.39897 18 7.19047 16.3415 6.35847 14.027L3.09747 16.5395C4.75247 19.778 8.11347 22 12 22Z" fill="#4CAF50" />
                                    <path d="M21.8055 10.0415H21V10H12V14H17.6515C17.2571 15.1082 16.5467 16.0766 15.608 16.7855L15.6095 16.7845L18.7045 19.4035C18.4855 19.6025 22 17 22 12C22 11.3295 21.931 10.675 21.8055 10.0415Z" fill="#1976D2" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}