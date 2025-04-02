import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import axios from 'axios';

// Create an axios instance with baseURL
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default function JoinGame() {
    const [code, setCode] = useState('');
    const [username, setUsername] = useState('');
    const [step, setStep] = useState(1); // 1 for code, 2 for username
    const [loading, setLoading] = useState(false);
    const [fadeIn, setFadeIn] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Trigger fade-in animation after component mount
        setTimeout(() => setFadeIn(true), 100);
    }, []);

    const handleCodeSubmit = (e) => {
        e.preventDefault();
        if (code.length < 6) {
            toast.error('Please enter a valid game code');
            // Apply shake animation
            const form = document.getElementById('code-form');
            form.classList.add('form-error');
            setTimeout(() => form.classList.remove('form-error'), 500);
            return;
        }
        
        // Animate step transition
        setFadeIn(false);
        setTimeout(() => {
            setStep(2);
            setTimeout(() => setFadeIn(true), 100);
        }, 300);
    };

    const handleJoinGame = async (e) => {
        e.preventDefault();
        if (!username.trim()) {
            toast.error('Please enter your name');
            return;
        }
        
        setLoading(true);

        try {
            const response = await axiosInstance.post('/api/quiz/join-game', {
                code,
                username
            });

            toast.success('Successfully joined the game!');
            navigate(`/play-game/${response.data.sessionId}`, {
                state: { username }
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to join game');
            if (error.response?.data?.message?.includes('Username already taken')) {
                setUsername('');
            } else {
                // Animate back to code step
                setFadeIn(false);
                setTimeout(() => {
                    setStep(1);
                    setCode('');
                    setUsername('');
                    setTimeout(() => setFadeIn(true), 100);
                }, 300);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBackClick = () => {
        // Animate step transition backward
        setFadeIn(false);
        setTimeout(() => {
            setStep(1);
            setTimeout(() => setFadeIn(true), 100);
        }, 300);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center px-4">
            <div className={`max-w-md w-full transition-all duration-500 transform ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="absolute top-6 left-6">
                    <Link to="/" className="text-white flex items-center hover:text-blue-300 transition-all duration-300">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Back to Home
                    </Link>
                </div>
                
                <div className="space-y-8 bg-white p-8 rounded-xl shadow-2xl">
                    <div>
                        <h2 className="mt-6 text-center text-3xl font-bold gradient-text">
                            {step === 1 ? 'Enter Session Code' : 'Enter Your Name'}
                        </h2>
                        <p className="mt-2 text-center text-sm text-slate-600">
                            {step === 1 
                                ? 'Enter the 6-digit code to join the session'
                                : 'Please provide your name to continue'
                            }
                        </p>
                    </div>

                    {step === 1 ? (
                        <form id="code-form" className="mt-8 space-y-6" onSubmit={handleCodeSubmit}>
                            <div className="relative">
                                <label htmlFor="code" className="text-sm font-medium text-slate-700 mb-1 block">
                                    Session Code
                                </label>
                                <div className="relative">
                                    <input
                                        id="code"
                                        type="text"
                                        required
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        placeholder="Enter 6-digit code"
                                        className="appearance-none relative block w-full px-3 py-3 mt-1
                                            border border-gray-300 placeholder-gray-500 text-slate-900
                                            rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                                            focus:border-blue-500 text-center text-3xl tracking-widest
                                            shadow-sm transition-all duration-200"
                                        maxLength={6}
                                        autoFocus
                                        style={{ letterSpacing: '0.5em' }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 origin-left transition-transform duration-300 rounded-b-lg"
                                         style={{ transform: code.length ? `scaleX(${code.length/6})` : 'scaleX(0)' }}></div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={code.length !== 6}
                                className={`group relative w-full flex justify-center py-3 px-4
                                    border border-transparent text-sm font-medium rounded-lg text-white
                                    bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2
                                    focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200
                                    ${code.length !== 6 ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'}`}
                            >
                                Next
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </form>
                    ) : (
                        <form className="mt-8 space-y-6" onSubmit={handleJoinGame}>
                            <div>
                                <label htmlFor="username" className="text-sm font-medium text-slate-700 block mb-1">
                                    Your Name
                                </label>
                                <input
                                    id="username"
                                    type="text"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter your name"
                                    className="appearance-none relative block w-full px-3 py-3 mt-1
                                        border border-gray-300 placeholder-gray-500 text-slate-900
                                        rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                                        focus:border-blue-500 shadow-sm transition-all duration-200"
                                    maxLength={20}
                                    autoFocus
                                />
                            </div>

                            <div className="flex space-x-4">
                                <button
                                    type="button"
                                    onClick={handleBackClick}
                                    className="flex-1 py-3 px-4 border border-gray-300 rounded-lg
                                        text-sm font-medium text-slate-700 hover:bg-gray-50
                                        focus:outline-none focus:ring-2 focus:ring-offset-2
                                        focus:ring-blue-500 transition-all duration-200
                                        group"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 inline group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                                    </svg>
                                    Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !username}
                                    className={`flex-1 py-3 px-4 border border-transparent text-sm
                                        font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700
                                        focus:outline-none focus:ring-2 focus:ring-offset-2
                                        focus:ring-blue-500 transition-all duration-200 flex items-center justify-center
                                        ${loading || !username ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'}`}
                                >
                                    {loading ? <LoadingSpinner size="small" color="white" /> : (
                                        <>
                                            Join Game
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                    
                    <div className="text-center">
                        <p className="text-xs text-gray-500">
                            Having trouble joining? Make sure the game code is correct.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}