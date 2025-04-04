import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import Navigation from '../components/Navigation';
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

export default function HostGame() {
    const { sessionId } = useParams();
    const location = useLocation();
    const socket = useSocket();
    const [gameState, setGameState] = useState(null);
    const [loading, setLoading] = useState(true);
    const [timeLeft, setTimeLeft] = useState(null);
    const [answeredPlayers, setAnsweredPlayers] = useState(new Set());

    const fetchGameState = async () => {
        try {
            const response = await axiosInstance.get(`/api/quiz/game/${sessionId}`);
            setGameState(response.data);
            if (response.data.status === 'playing' && timeLeft === null) {
                setTimeLeft(response.data.quiz.timePerQuestion);
            }
        } catch (error) {
            toast.error('Failed to fetch game state');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGameState();
        const interval = setInterval(fetchGameState, 5000); // Poll for new players

        return () => clearInterval(interval);
    }, [sessionId, timeLeft]);

    useEffect(() => {
        let timer;
        if (timeLeft !== null && gameState?.status === 'playing') {
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        handleNextQuestion();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [timeLeft, gameState?.status]);

    useEffect(() => {
        if (!socket || !gameState?.code) return;

        socket.emit('join-game', gameState.code);

        socket.on('player-answered', ({ username }) => {
            setAnsweredPlayers(prev => new Set([...prev, username]));
            toast.success(`${username} submitted their answer!`);
        });

        return () => {
            socket.off('player-answered');
        };
    }, [socket, gameState?.code]);

    const startGame = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axiosInstance.post(
                `/api/quiz/game/${sessionId}/start`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            socket.emit('start-game', gameState.code);
            setGameState(prev => ({ 
                ...prev, 
                status: 'playing',
                currentQuestion: 0
            }));
            setTimeLeft(gameState.quiz.timePerQuestion);
        } catch (error) {
            toast.error('Failed to start game');
        }
    };

    // Handle next question transition
    const handleNextQuestion = async () => {
        const nextQuestionIndex = (gameState.currentQuestion || 0) + 1;
        if (nextQuestionIndex >= gameState.quiz.questions.length) {
            try {
                const token = JSON.parse(localStorage.getItem('user')).token;
                await axiosInstance.post(
                    `/api/quiz/game/${sessionId}/end`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` }}
                );
                setGameState(prev => ({ ...prev, status: 'completed' }));
                setTimeLeft(null);
            } catch (error) {
                toast.error('Failed to end game');
            }
            return;
        }

        try {
            // Emit socket event first for immediate UI update
            socket.emit('next-question', { 
                gameCode: gameState.code,
                questionIndex: nextQuestionIndex
            });

            // Update local state immediately
            setGameState(prev => ({ ...prev, currentQuestion: nextQuestionIndex }));
            setTimeLeft(gameState.quiz.timePerQuestion);
            setAnsweredPlayers(new Set());

            // Make API call in background
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axiosInstance.post(
                `/api/quiz/game/${sessionId}/next-question`,
                { questionIndex: nextQuestionIndex },
                { headers: { Authorization: `Bearer ${token}` }}
            );
        } catch (error) {
            toast.error('Failed to move to next question');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
                    <LoadingSpinner size="large" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-3xl font-bold text-slate-800">
                            {gameState?.status === 'waiting' ? 'Session Lobby' : 'Session in Progress'}
                        </h1>
                        <div className="text-right">
                            <p className="text-sm text-slate-600">Session Code:</p>
                            <p className="text-2xl font-bold text-blue-600">{location.state?.gameCode}</p>
                        </div>
                    </div>

                    {gameState?.status === 'waiting' && (
                        <>
                            <div className="mb-8">
                                <h2 className="text-xl font-semibold text-slate-800 mb-4">Participants</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {gameState?.participants.map((participant, index) => (
                                        <div
                                            key={index}
                                            className="bg-blue-50 rounded-lg p-4 text-center"
                                        >
                                            <p className="font-medium text-blue-700">{participant.username}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col items-center justify-center space-y-4">
                                <p className="text-lg text-slate-600">Waiting for participants to join...</p>
                                <p className="text-sm text-slate-500">
                                    Share the session code with participants to allow them to join
                                </p>
                                {gameState.participants.length >= 1 && (
                                    <button
                                        className="btn-primary px-6 py-3"
                                        onClick={startGame}
                                    >
                                        Begin Session
                                    </button>
                                )}
                            </div>
                        </>
                    )}

                    {gameState?.status === 'playing' && (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-semibold text-slate-800">
                                    Question {gameState.currentQuestion + 1} of {gameState.quiz.questions.length}
                                </h2>
                                <div className="text-xl font-mono bg-blue-50 px-4 py-2 rounded-lg text-blue-600">
                                    {timeLeft}s
                                </div>
                            </div>

                            <div className="bg-blue-50 p-6 rounded-lg">
                                <p className="text-xl text-slate-800 mb-6">
                                    {gameState.quiz.questions[gameState.currentQuestion].question}
                                </p>
                                <div className="grid grid-cols-2 gap-4">
                                    {gameState.quiz.questions[gameState.currentQuestion].options.map((option, index) => (
                                        <div
                                            key={index}
                                            className="bg-white p-4 rounded-lg shadow-sm"
                                        >
                                            <p className="text-slate-800">{option}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-slate-800 mb-2">
                                    Responses received: {answeredPlayers.size}/{gameState.participants.length}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {Array.from(answeredPlayers).map((username, index) => (
                                        <span
                                            key={index}
                                            className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                                        >
                                            {username}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-center">
                                <button
                                    className="btn-primary px-6 py-3"
                                    onClick={handleNextQuestion}
                                >
                                    Proceed to Next Question
                                </button>
                            </div>
                        </div>
                    )}

                    {gameState?.status === 'completed' && (
                        <div className="text-center space-y-6">
                            <h2 className="text-2xl font-bold text-slate-800">Assessment Complete</h2>
                            <div className="space-y-4">
                                <h3 className="text-xl font-semibold text-slate-800">Final Results</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {gameState.participants
                                        .sort((a, b) => b.score - a.score)
                                        .map((participant, index) => (
                                            <div
                                                key={index}
                                                className={`p-4 rounded-lg text-center
                                                    ${index === 0 ? 'bg-yellow-100' : 'bg-blue-50'}`}
                                            >
                                                <p className={`font-medium ${index === 0 ? 'text-yellow-800' : 'text-blue-700'}`}>
                                                    {participant.username}
                                                </p>
                                                <p className={`text-sm ${index === 0 ? 'text-yellow-600' : 'text-blue-600'}`}>
                                                    {participant.score} points
                                                </p>
                                                <p className="text-sm text-gray-600">
                                                    {participant.accuracy}% correct
                                                </p>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}