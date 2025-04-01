import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function JoinGame() {
    const [code, setCode] = useState('');
    const [username, setUsername] = useState('');
    const [step, setStep] = useState(1); // 1 for code, 2 for username
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleCodeSubmit = (e) => {
        e.preventDefault();
        if (code.length < 6) {
            toast.error('Please enter a valid game code');
            return;
        }
        setStep(2);
    };

    const handleJoinGame = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post('http://localhost:5000/api/quiz/join-game', {
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
                setStep(1);
                setCode('');
                setUsername('');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-xl">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-bold text-slate-800">
                        {step === 1 ? 'Enter Game Code' : 'Choose Your Name'}
                    </h2>
                    <p className="mt-2 text-center text-sm text-slate-600">
                        {step === 1 
                            ? 'Enter the 6-digit code to join the game'
                            : 'Enter your name to join the game'
                        }
                    </p>
                </div>

                {step === 1 ? (
                    <form className="mt-8 space-y-6" onSubmit={handleCodeSubmit}>
                        <div>
                            <label htmlFor="code" className="text-sm font-medium text-slate-700">
                                Game Code
                            </label>
                            <input
                                id="code"
                                type="text"
                                required
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="Enter 6-digit code"
                                className="appearance-none relative block w-full px-3 py-2 mt-1
                                    border border-gray-300 placeholder-gray-500 text-slate-900
                                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                                    focus:border-blue-500 text-center text-2xl tracking-widest"
                                maxLength={6}
                                autoFocus
                            />
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
                        </button>
                    </form>
                ) : (
                    <form className="mt-8 space-y-6" onSubmit={handleJoinGame}>
                        <div>
                            <label htmlFor="username" className="text-sm font-medium text-slate-700">
                                Your Name
                            </label>
                            <input
                                id="username"
                                type="text"
                                required
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter your name"
                                className="appearance-none relative block w-full px-3 py-2 mt-1
                                    border border-gray-300 placeholder-gray-500 text-slate-900
                                    rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500
                                    focus:border-blue-500"
                                maxLength={20}
                                autoFocus
                            />
                        </div>

                        <div className="flex space-x-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg
                                    text-sm font-medium text-slate-700 hover:bg-gray-50
                                    focus:outline-none focus:ring-2 focus:ring-offset-2
                                    focus:ring-blue-500 transition-all duration-200"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading || !username}
                                className={`flex-1 py-3 px-4 border border-transparent text-sm
                                    font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700
                                    focus:outline-none focus:ring-2 focus:ring-offset-2
                                    focus:ring-blue-500 transition-all duration-200
                                    ${loading || !username ? 'opacity-50 cursor-not-allowed' : 'transform hover:scale-105'}`}
                            >
                                {loading ? <LoadingSpinner size="small" color="white" /> : 'Join Game'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}