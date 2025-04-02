import { useState, useEffect } from 'react';
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
    const [animateForm, setAnimateForm] = useState(false);
    const navigate = useNavigate();
    const { register, authLoading } = useAuth();

    useEffect(() => {
        // Trigger animation after component mounts
        setAnimateForm(true);
    }, []);

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
        if (!validateForm()) {
            // Apply shake animation to form when validation fails
            const form = document.getElementById('register-form');
            form.classList.add('form-error');
            setTimeout(() => form.classList.remove('form-error'), 500);
            return;
        }

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
        <div className="transform transition-all duration-200 hover:translate-y-[-2px]">
            <label htmlFor={name} className="text-sm font-medium text-slate-700 block mb-1">
                {label}
            </label>
            <input
                id={name}
                name={name}
                type={type}
                required
                className={`form-input ${errors[name] ? 'border-red-500' : ''}`}
                placeholder={`Enter your ${name === 'confirmPassword' ? 'password again' : name.toLowerCase()}`}
                value={formData[name]}
                onChange={handleChange}
            />
            {errors[name] && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {errors[name]}
                </p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col">
            <nav className="bg-transparent py-4">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center">
                        <Link to="/" className="text-white text-xl font-bold hover:text-gray-200 transition-colors flex items-center">
                            <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                            </svg>
                            CII SecEx 2025
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="flex flex-grow items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
                <div className={`max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-2xl transition-all duration-700 ${animateForm ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-bold text-slate-800 tracking-tight gradient-text">
                            Create your account
                        </h2>
                        <p className="mt-2 text-center text-sm text-slate-600">
                            Already have an account?{' '}
                            <Link 
                                to="/login" 
                                className="font-medium text-blue-600 hover:text-blue-500 transition-colors underline decoration-2 underline-offset-2"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                    <form id="register-form" className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="rounded-md space-y-5">
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
                                transform transition-all duration-300 ease-in-out shadow-md
                                hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`}
                            >
                                {authLoading ? (
                                    <LoadingSpinner size="small" color="white" />
                                ) : (
                                    <>
                                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                                            <svg className="h-5 w-5 text-blue-500 group-hover:text-blue-400 transition-colors" 
                                                 xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6z" />
                                                <path d="M16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                                            </svg>
                                        </span>
                                        Create Account
                                    </>
                                )}
                            </button>
                        </div>
                        
                        <p className="text-xs text-center text-gray-500 mt-3">
                            By signing up, you agree to our Terms of Service and Privacy Policy
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}