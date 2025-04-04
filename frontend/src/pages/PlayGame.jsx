import { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
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

export default function PlayGame() {
    const { sessionId } = useParams();
    const location = useLocation();
    const socket = useSocket();
    const [gameState, setGameState] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const username = location.state?.username;

    useEffect(() => {
        if (!username) {
            toast.error('Username not provided');
            return;
        }

        const fetchGameState = async () => {
            try {
                const response = await axiosInstance.get(`/api/quiz/game/${sessionId}`);
                setGameState(response.data);
                if (response.data.status === 'playing') {
                    setCurrentQuestion(response.data.quiz.questions[response.data.currentQuestion]);
                    setTimeLeft(response.data.quiz.timePerQuestion);
                }
            } catch (error) {
                toast.error('Failed to fetch game state');
            } finally {
                setLoading(false);
            }
        };

        fetchGameState();
    }, [sessionId, username]);

    const handleNewQuestion = ({ questionIndex }) => {
        // Update game state immediately
        setGameState(prev => ({
            ...prev,
            currentQuestion: questionIndex
        }));
        
        // Pre-fetch and set the next question data
        if (gameState?.quiz?.questions) {
            const nextQuestion = gameState.quiz.questions[questionIndex];
            setCurrentQuestion(nextQuestion);
            setTimeLeft(gameState.quiz.timePerQuestion);
            setSelectedAnswer(null);
            setHasAnswered(false);
        }
    };

    useEffect(() => {
        if (!socket || !gameState?.code) return;

        socket.emit('join-game', gameState.code);

        const handleGameStarted = () => {
            setGameState(prev => ({ 
                ...prev, 
                status: 'playing',
                currentQuestion: 0
            }));
            setCurrentQuestion(gameState.quiz.questions[0]);
            setTimeLeft(gameState.quiz.timePerQuestion);
            toast.success('Game is starting!');
        };

        socket.on('game-started', handleGameStarted);
        socket.on('new-question', handleNewQuestion);
        socket.on('player-answered', handlePlayerAnswered);
        socket.on('game-over', handleGameOver);

        // Cleanup listeners
        return () => {
            socket.off('game-started', handleGameStarted);
            socket.off('new-question', handleNewQuestion);
            socket.off('player-answered', handlePlayerAnswered);
            socket.off('game-over', handleGameOver);
        };
    }, [socket, gameState?.code]);

    // Timer effect with cleanup
    useEffect(() => {
        let timerId;

        if (timeLeft === null || hasAnswered || gameState?.status !== 'playing') return;

        timerId = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    if (!hasAnswered) {
                        handleAnswer(-1); // Auto-submit on timeout
                    }
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [timeLeft, hasAnswered, gameState?.status]);

    const handleAnswer = async (optionIndex) => {
        if (hasAnswered || !socket || !gameState?.code) return;

        setSelectedAnswer(optionIndex);
        setHasAnswered(true);

        const timeTaken = gameState.quiz.timePerQuestion - timeLeft;
        
        try {
            const response = await axiosInstance.post(`/api/quiz/game/${sessionId}/answer`, {
                username,
                answer: optionIndex,
                timeTaken
            });

            // Always use blue color for consistency
            document.querySelector(`button[data-option="${optionIndex}"]`)?.classList.add('bg-blue-500/50');
        } catch (error) {
            toast.error('Failed to submit answer');
        }

        // Stop the timer when answer is submitted
        setTimeLeft(0);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <LoadingSpinner size="large" color="white" />
            </div>
        );
    }

    // Update the render section for the options to include data-option attribute
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white p-4">
            <div className="max-w-3xl mx-auto">
                {gameState?.status === 'waiting' && (
                    <div className="text-center space-y-4">
                        <h1 className="text-3xl font-bold">Waiting for the session to begin...</h1>
                        <p className="text-xl">Please standby, {username}</p>
                        <div className="animate-bounce mt-8">
                            <LoadingSpinner size="large" color="white" />
                        </div>
                    </div>
                )}

                {gameState?.status === 'playing' && currentQuestion && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold">Question {gameState.currentQuestion + 1}</h2>
                                {/* Remove score display */}
                            </div>
                            <div className="text-xl font-mono bg-white/10 px-4 py-2 rounded-lg">
                                {timeLeft}s
                            </div>
                        </div>

                        <div className="bg-white/10 p-6 rounded-lg">
                            <p className="text-xl mb-6">{currentQuestion.question}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.options.map((option, index) => (
                                    <button
                                        key={index}
                                        data-option={index}
                                        onClick={() => handleAnswer(index)}
                                        disabled={hasAnswered}
                                        className={`p-4 rounded-lg text-left transition-all duration-200
                                            ${hasAnswered
                                                ? index === selectedAnswer
                                                    ? 'bg-blue-500/50' // Change color to neutral feedback
                                                    : 'bg-white/5'
                                                : 'bg-white/5 hover:bg-white/20'
                                            }
                                            ${hasAnswered && 'cursor-not-allowed'}`}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {hasAnswered && (
                            <div className="text-center text-xl">
                                Awaiting other participants' responses...
                            </div>
                        )}
                    </div>
                )}

                {gameState?.status === 'completed' && (
                    <div className="text-center space-y-8">
                        <div className="bg-gradient-to-br from-blue-600/20 to-purple-600/20 p-8 rounded-xl border border-blue-500/20 backdrop-blur-lg">
                            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                                Session Complete
                            </h1>
                            <p className="text-gray-300 text-lg mb-8">Thank you for participating</p>

                            {/* Trophy animation for winner */}
                            {gameState.participants.sort((a, b) => b.score - a.score)[0]?.username === username && (
                                <div className="flex justify-center mb-6 animate-bounce">
                                    <svg className="w-16 h-16 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 2a1 1 0 0 1 1 1v1.323l3.954 1.582 1.599-.8a1 1 0 0 1 1.447 1.186l-3 14A1 1 0 0 1 14.06 21H5.94a1 1 0 0 1-.94-.709l-3-14A1 1 0 0 1 3.447 5.05l1.599.8L9 4.323V3a1 1 0 0 1 1-1zm0 2.618L6.08 6.309 8.78 17h2.44l2.7-10.691L10 4.618z" clipRule="evenodd"/>
                                    </svg>
                                </div>
                            )}

                            <div className="bg-white/10 p-6 rounded-lg backdrop-blur-md">
                                <h2 className="text-2xl font-semibold mb-6 text-blue-300">Final Scores</h2>
                                <div className="space-y-4 max-w-2xl mx-auto">
                                    {gameState.participants
                                        .sort((a, b) => b.score - a.score)
                                        .map((participant, index) => (
                                            <div
                                                key={index}
                                                className={`transform transition-all duration-300 hover:scale-105
                                                    ${participant.username === username 
                                                        ? 'bg-blue-500/30 border-2 border-blue-500/50' 
                                                        : index === 0 
                                                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30' 
                                                            : 'bg-white/5 border border-white/10'
                                                    } rounded-lg p-4`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <span className={`
                                                            ${index === 0 ? 'text-yellow-400' : 
                                                              index === 1 ? 'text-gray-400' :
                                                              index === 2 ? 'text-orange-400' : 'text-gray-500'}
                                                            text-2xl font-bold`}
                                                        >
                                                            {index + 1}
                                                        </span>
                                                        <div>
                                                            <span className="font-medium text-lg">
                                                                {participant.username}
                                                                {participant.username === username && 
                                                                    <span className="ml-2 text-blue-400">(You)</span>
                                                                }
                                                            </span>
                                                            {participant.accuracy && (
                                                                <p className="text-sm text-gray-400">
                                                                    Accuracy: {participant.accuracy}% • 
                                                                    {participant.correctAnswers}/{participant.totalQuestions} correct
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                                            {participant.score}
                                                        </span>
                                                        <p className="text-sm text-gray-400">points</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>

                            {/* Navigation buttons */}
                            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                                <Link
                                    to="/join-game"
                                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 
                                        transform transition-all duration-200 hover:scale-105 flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                                    </svg>
                                    Join Another Session
                                </Link>
                                <Link
                                    to="/"
                                    className="px-6 py-3 border-2 border-white/20 text-white rounded-lg font-medium
                                        hover:bg-white/10 transform transition-all duration-200 hover:scale-105
                                        flex items-center justify-center"
                                >
                                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                    </svg>
                                    Back to Home
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}