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
    const [progressPercentage, setProgressPercentage] = useState(0);
    
    const circumference = 2 * Math.PI * 24; // 2 * pi * radius
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    useEffect(() => {
        const fetchGameHistory = async () => {
            try {
                const token = JSON.parse(localStorage.getItem('user')).token;
                const response = await axiosInstance.get('/api/quiz/my-game-history', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setGameHistory(response.data);
                
                // Calculate overall progress based on game participation and performance
                const totalGames = response.data.hostedGames.length + response.data.participatedGames.length;
                if (totalGames > 0) {
                    // Calculate average performance from participated games
                    const totalAccuracy = response.data.participatedGames.reduce((sum, game) => sum + game.accuracy, 0);
                    const avgAccuracy = response.data.participatedGames.length > 0 
                        ? Math.round(totalAccuracy / response.data.participatedGames.length) 
                        : 0;
                    
                    // Factor in number of games and average accuracy
                    const gameCountFactor = Math.min(totalGames * 10, 50); // Max 50% from count (5+ games = 50%)
                    const accuracyFactor = Math.round(avgAccuracy / 2); // Max 50% from accuracy
                    
                    setProgressPercentage(Math.min(gameCountFactor + accuracyFactor, 100));
                }
            } catch (error) {
                console.error('Error fetching game history:', error);
                toast.error('Failed to load game history');
            } finally {
                setIsLoading(false);
            }
        };

        // Simulate minimum loading time for better UX
        const timer = setTimeout(() => {
            if (user?.token) {
                fetchGameHistory();
            } else {
                setIsLoading(false);
            }
        }, 800);
        
        return () => clearTimeout(timer);
    }, [user]);

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
        
        let interval = seconds / 31536000; // seconds in a year
        
        if (interval > 1) {
            return Math.floor(interval) + " years ago";
        }
        interval = seconds / 2592000; // seconds in a month
        if (interval > 1) {
            return Math.floor(interval) + " months ago";
        }
        interval = seconds / 86400; // seconds in a day
        if (interval > 1) {
            return Math.floor(interval) + " days ago";
        }
        interval = seconds / 3600; // seconds in an hour
        if (interval > 1) {
            return Math.floor(interval) + " hours ago";
        }
        interval = seconds / 60; // seconds in a minute
        if (interval > 1) {
            return Math.floor(interval) + " minutes ago";
        }
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

    // Get three most recent games for recent activity
    const recentGames = allGames.slice(0, 3);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50"> 
            <Navigation />

            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="animate-fade-in">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold heading-gradient heading-shadow">Welcome back, {user?.username || 'Learner'}!</h1>
                        <p className="mt-2 text-lg text-slate-600">Here's your learning dashboard</p>
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
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                            </svg>
                            <span>Join a Quiz</span>
                        </Link>
                        <Link to="/manage-quizzes" className="btn-gradient px-4 py-3 inline-flex items-center space-x-2 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L14 2.586A2 2 0 0012.586 2H9z" />
                                <path d="M3 8a2 2 0 012-2v10h8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                            </svg>
                            <span>My Quizzes</span>
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-delay-1">
                        {/* Card 1: Available Quizzes */}
                        <div className="card card-hover bg-white rounded-xl shadow-lg border border-gray-100 p-6 group">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors duration-200 flex items-center">
                                    <div className="p-2 mr-3 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                    </div>
                                    Available Quizzes
                                </h2>
                                <span className="badge badge-gradient">New</span>
                            </div>
                            <p className="text-slate-600 mb-6 pl-11">Start a new quiz or continue where you left off.</p>
                            <div className="pl-11">
                                <Link to="/manage-quizzes" className="btn-gradient text-sm py-2.5 px-5 inline-flex items-center group">
                                    View Quizzes
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>

                        {/* Card 2: Your Progress */}
                        <div className="card card-hover bg-white rounded-xl shadow-lg border border-gray-100 p-6 group">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-800 group-hover:text-indigo-600 transition-colors duration-200 flex items-center">
                                    <div className="p-2 mr-3 rounded-lg bg-indigo-50 group-hover:bg-indigo-100 transition-colors duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    Your Progress
                                </h2>
                                <div className="relative w-14 h-14">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            className="text-indigo-100"
                                            strokeWidth="4"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="24"
                                            cx="28"
                                            cy="28"
                                        />
                                        <circle
                                            className="text-indigo-600"
                                            strokeWidth="4"
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="24"
                                            cx="28"
                                            cy="28"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-indigo-700">
                                        {progressPercentage}%
                                    </span>
                                </div>
                            </div>
                            <p className="text-slate-600 mb-6 pl-11">
                                {gameHistory.participatedGames.length > 0
                                    ? `You've participated in ${gameHistory.participatedGames.length} quizzes with an average score of ${Math.round(
                                        gameHistory.participatedGames.reduce((sum, game) => sum + game.score, 0) / gameHistory.participatedGames.length
                                      )} points.`
                                    : 'Join quizzes to track your learning journey and achievements.'}
                            </p>
                            <div className="pl-11">
                                <Link to="/manage-quizzes" className="btn-gradient text-sm py-2.5 px-5 inline-flex items-center group bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
                                    View All Games
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>

                        {/* Card 3: Achievements */}
                        <div className="card card-hover bg-white rounded-xl shadow-lg border border-gray-100 p-6 group">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-slate-800 group-hover:text-green-600 transition-colors duration-200 flex items-center">
                                    <div className="p-2 mr-3 rounded-lg bg-green-50 group-hover:bg-green-100 transition-colors duration-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    Achievements
                                </h2>
                                <span className="badge badge-green">
                                    {gameHistory.participatedGames.filter(game => game.position === 1).length} Wins
                                </span>
                            </div>
                            <p className="text-slate-600 mb-6 pl-11">
                                {gameHistory.participatedGames.filter(game => game.position === 1).length > 0
                                    ? `Congratulations! You've won ${gameHistory.participatedGames.filter(game => game.position === 1).length} ${gameHistory.participatedGames.filter(game => game.position === 1).length === 1 ? 'quiz' : 'quizzes'}.`
                                    : 'Complete quizzes to earn achievements and track your progress.'}
                            </p>
                            <div className="pl-11">
                                <Link to="/manage-quizzes" className="btn-gradient text-sm py-2.5 px-5 inline-flex items-center group bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700">
                                    View Achievements
                                    <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                    </svg>
                                </Link>
                            </div>
                        </div>
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
                            <Link to="/manage-quizzes" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200">
                                View All
                            </Link>
                        </div>
                        
                        {recentGames.length === 0 ? (
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
                                {recentGames.map((game, index) => {
                                    // Determine what type of activity this was
                                    const isHost = game.role === 'host';
                                    const isWinner = !isHost && game.position === 1;
                                    const isCompleted = !isHost;
                                    
                                    // Set item styling based on type
                                    let bgGradient, iconBg, actionText, icon, actionVerb;
                                    
                                    if (isHost) {
                                        bgGradient = "from-purple-50 to-white";
                                        iconBg = "from-purple-400 to-indigo-600";
                                        actionText = `Hosted ${game.quizTitle}`;
                                        actionVerb = "Hosted";
                                        icon = (
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        );
                                    } else if (isWinner) {
                                        bgGradient = "from-green-50 to-white";
                                        iconBg = "from-green-400 to-green-600";
                                        actionText = `Won ${game.quizTitle}`;
                                        actionVerb = "Won";
                                        icon = (
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                        );
                                    } else {
                                        bgGradient = "from-blue-50 to-white";
                                        iconBg = "from-blue-400 to-indigo-600";
                                        actionText = `Completed ${game.quizTitle}`;
                                        actionVerb = "Completed";
                                        icon = (
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        );
                                    }
                                    
                                    return (
                                        <div key={index} className={`flex items-center space-x-4 p-4 rounded-lg border border-gray-100 hover:border-${isWinner ? 'green' : isHost ? 'purple' : 'blue'}-200 bg-gradient-to-r ${bgGradient} shadow-sm hover:shadow-md transition-all duration-200`}>
                                            <div className="flex-shrink-0">
                                                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-md`}>
                                                    {icon}
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-md font-semibold text-slate-800">{actionText}</p>
                                                <div className="flex items-center mt-1">
                                                    {isHost ? (
                                                        <span className="badge badge-gradient mr-2 bg-gradient-to-r from-purple-500 to-indigo-600">{game.participants} Players</span>
                                                    ) : isWinner ? (
                                                        <span className="badge badge-gradient mr-2">{game.score} points</span>
                                                    ) : (
                                                        <>
                                                            <span className="badge badge-gradient mr-2">{game.accuracy}%</span>
                                                            <span className="text-xs text-slate-500 mr-2">{game.position}/{game.totalParticipants}</span>
                                                        </>
                                                    )}
                                                    <p className="text-sm text-slate-500 flex items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {getTimeSince(game.date)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="ml-auto">
                                                {isHost ? (
                                                    <Link to="/manage-quizzes" className="btn-gradient text-sm py-1.5 px-3 inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                                                        Host Again
                                                    </Link>
                                                ) : (
                                                    <Link to="/manage-quizzes" className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors duration-200">
                                                        Review
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                                
                                {/* Show new quiz when there are fewer than 3 activities */}
                                {recentGames.length < 3 && (
                                    <div className="flex items-center space-x-4 p-4 rounded-lg border border-gray-100 hover:border-purple-200 bg-gradient-to-r from-purple-50 to-white shadow-sm hover:shadow-md transition-all duration-200">
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center shadow-md">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-md font-semibold text-slate-800">New Quiz Available: Incident Response</p>
                                            <div className="flex items-center mt-1">
                                                <span className="badge badge-gradient mr-2 bg-gradient-to-r from-purple-500 to-indigo-600">New</span>
                                                <p className="text-sm text-slate-500 flex items-center">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    Just now
                                                </p>
                                            </div>
                                        </div>
                                        <div className="ml-auto">
                                            <button className="btn-gradient text-sm py-1.5 px-3 inline-flex items-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                                                Start Quiz
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}