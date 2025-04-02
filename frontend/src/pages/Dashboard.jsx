import Navigation from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default function Dashboard() {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [gameHistory, setGameHistory] = useState({ hostedGames: [], participatedGames: [] });
    const [error, setError] = useState(null);
    const [selectedSession, setSelectedSession] = useState(null);
    const [sessionDetails, setSessionDetails] = useState(null);

    useEffect(() => {
        const fetchGameHistory = async () => {
            try {
                if (!user?.token) {
                    throw new Error('No authentication token found');
                }

                const response = await axiosInstance.get('/api/quiz/my-game-history', {
                    headers: { 
                        Authorization: `Bearer ${user.token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.data) {
                    throw new Error('No data received from server');
                }

                setGameHistory(response.data);
            } catch (error) {
                console.error('Error fetching game history:', error);
                setError(error.message);
                toast.error(error.response?.data?.message || 'Failed to load game history');
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            if (user?.token) {
                fetchGameHistory();
            } else {
                setIsLoading(false);
            }
        }, 800);
        
        return () => clearTimeout(timer);
    }, [user]);

    const fetchSessionDetails = async (sessionId) => {
        try {
            const response = await axiosInstance.get(`/api/quiz/game/${sessionId}`, {
                headers: { 
                    Authorization: `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                }
            });
            setSessionDetails(response.data);
        } catch (error) {
            console.error('Error fetching session details:', error);
            toast.error('Failed to load session details');
        }
    };

    // Format date function
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true
        });
    };
    
    // Get relative time since date
    const getTimeSince = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
                <LoadingSpinner type="shine" color="gradient" size="large" text="Loading dashboard..." />
            </div>
        );
    }

    // Get all games sorted by date (most recent first)
    const allGames = [...gameHistory.hostedGames, ...gameHistory.participatedGames]
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50"> 
            <Navigation />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="animate-fade-in">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold heading-gradient heading-shadow">Welcome back, {user?.username || 'User'}!</h1>
                        <p className="mt-2 text-lg text-slate-600">Here's your quiz dashboard</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="mb-8 flex flex-wrap gap-4">
                        <Link to="/host-game" className="btn-gradient px-4 py-3 inline-flex items-center space-x-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                            </svg>
                            <span>Host a Quiz</span>
                        </Link>
                        <Link to="/join-game" className="btn-gradient px-4 py-3 inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                            </svg>
                            <span>Join a Quiz</span>
                        </Link>
                        <Link to="/manage-quizzes" className="btn-gradient px-4 py-3 inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                            </svg>
                            <span>My Quizzes</span>
                        </Link>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="mt-10 bg-white p-6 rounded-xl shadow-lg border border-gray-100 animate-fade-in-delay-2">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Recent Activity
                            </h2>
                        </div>
                        
                        {allGames.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 bg-blue-50 rounded-full mx-auto flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-medium text-slate-800 mb-2">No recent activities yet</h3>
                                <p className="text-slate-600 mb-6">Host or join a quiz to see your activities here.</p>
                                <div className="flex justify-center space-x-4">
                                    <Link to="/host-game" className="btn-gradient py-2.5 px-5 inline-flex items-center">
                                        Host a Quiz
                                    </Link>
                                    <Link to="/join-game" className="btn-gradient py-2.5 px-5 inline-flex items-center bg-gradient-to-r from-indigo-600 to-purple-600">
                                        Join a Quiz
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {allGames.map((game, index) => (
                                    <div 
                                        key={index} 
                                        className={`flex items-center space-x-4 p-4 rounded-lg border border-gray-100 hover:border-${game.role === 'host' ? 'purple' : 'blue'}-200 bg-gradient-to-r from-${game.role === 'host' ? 'purple' : 'blue'}-50 to-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer`}
                                        onClick={() => {
                                            setSelectedSession(game);
                                            fetchSessionDetails(game.id);
                                        }}
                                    >
                                        <div className="flex-shrink-0">
                                            <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-${game.role === 'host' ? 'purple' : 'blue'}-400 to-${game.role === 'host' ? 'indigo' : 'blue'}-600 flex items-center justify-center shadow-md`}>
                                                {game.role === 'host' ? (
                                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-md font-semibold text-slate-800">
                                                {game.role === 'host' ? `Hosted: ${game.quizTitle}` : `Completed: ${game.quizTitle}`}
                                            </p>
                                            <div className="flex items-center mt-1">
                                                {game.role === 'host' ? (
                                                    <span className="badge badge-gradient mr-2">{game.participants} Players</span>
                                                ) : (
                                                    <>
                                                        <span className="badge badge-gradient mr-2">{game.score} points</span>
                                                        <span className="badge badge-gradient mr-2">{game.accuracy}% accuracy</span>
                                                        <span className="badge badge-gradient mr-2">Rank {game.position}/{game.totalParticipants}</span>
                                                    </>
                                                )}
                                                <p className="text-sm text-slate-500">
                                                    {getTimeSince(game.date)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Session Details Modal */}
            {selectedSession && sessionDetails && (
                <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative">
                        {/* Close button at the absolute top right */}
                        <button 
                            onClick={() => {
                                setSelectedSession(null);
                                setSessionDetails(null);
                            }}
                            className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors z-20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        {/* Header */}
                        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">{sessionDetails.quiz.title}</h2>
                                <p className="text-slate-600">{formatDate(selectedSession.date)}</p>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="p-6 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-medium text-blue-800">Final Score</h3>
                                    <p className="text-2xl font-bold text-blue-600">{selectedSession.score || '-'}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-medium text-green-800">Accuracy</h3>
                                    <p className="text-2xl font-bold text-green-600">{selectedSession.accuracy || '-'}%</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-medium text-purple-800">Position</h3>
                                    <p className="text-2xl font-bold text-purple-600">{selectedSession.position || '-'}/{selectedSession.totalParticipants}</p>
                                </div>
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <h3 className="text-sm font-medium text-indigo-800">Questions</h3>
                                    <p className="text-2xl font-bold text-indigo-600">{sessionDetails.quiz.questions.length}</p>
                                </div>
                            </div>

                            {selectedSession.role === 'participant' && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold text-slate-800">Question Performance</h3>
                                    <div className="space-y-3">
                                        {sessionDetails.participants
                                            .find(p => p.username === user.username)?.answers
                                            .map((answer, index) => (
                                                <div 
                                                    key={index}
                                                    className="bg-gray-50 p-4 rounded-lg"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-medium text-slate-800">Question {index + 1}</h4>
                                                        <div className="flex items-center space-x-2">
                                                            <span className="text-sm text-slate-600">{answer.timeTaken}s</span>
                                                            {answer.pointsEarned && (
                                                                <span className="badge badge-gradient">{answer.pointsEarned} points</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <p className="text-slate-600">{sessionDetails.quiz.questions[answer.questionIndex].question}</p>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {selectedSession.role === 'host' && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-semibold text-slate-800">Participant Performance</h3>
                                    <div className="space-y-3">
                                        {sessionDetails.participants
                                            .sort((a, b) => b.score - a.score)
                                            .map((participant, index) => (
                                                <div 
                                                    key={index}
                                                    className="bg-gray-50 p-4 rounded-lg flex items-center justify-between"
                                                >
                                                    <div>
                                                        <h4 className="font-medium text-slate-800">{participant.username}</h4>
                                                        <p className="text-sm text-slate-600">
                                                            {participant.answers.filter(a => a.isCorrect).length} correct answers
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <span className="badge badge-gradient">{participant.score} points</span>
                                                        {index === 0 && (
                                                            <span className="badge badge-gradient bg-yellow-500">Winner</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}