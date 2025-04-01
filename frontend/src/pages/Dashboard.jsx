import Navigation from '../components/Navigation';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function Dashboard() {
    const { user } = useAuth();
    // Example progress value (replace with actual data)
    const progressPercentage = 60;
    const circumference = 2 * Math.PI * 20; // 2 * pi * radius
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    return (
        <div className="min-h-screen bg-gray-50"> {/* Lighter background */}
            <Navigation />

            <main className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
                <div className="px-4 py-6 sm:px-0">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-800">Welcome back, {user?.username}!</h1>
                        <p className="mt-2 text-base text-slate-600">Here's your learning dashboard.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Card 1: Available Quizzes */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-slate-800">Available Quizzes</h2>
                                <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-0.5 rounded-full">New</span>
                            </div>
                            <p className="text-slate-600 mb-4">Start a new quiz or continue where you left off.</p>
                            <Link to="/quizzes" className="btn-primary text-sm py-2 px-4 inline-flex items-center group">
                                View Quizzes
                                <svg className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>

                        {/* Card 2: Your Progress */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-slate-800">Your Progress</h2>
                                <div className="relative w-12 h-12">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            className="text-gray-200"
                                            strokeWidth="5"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="20"
                                            cx="24"
                                            cy="24"
                                        />
                                        <circle
                                            className="text-blue-600"
                                            strokeWidth="5"
                                            strokeLinecap="round"
                                            stroke="currentColor"
                                            fill="transparent"
                                            r="20"
                                            cx="24"
                                            cy="24"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={strokeDashoffset}
                                            style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
                                        />
                                    </svg>
                                    <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-800">
                                        {progressPercentage}%
                                    </span>
                                </div>
                            </div>
                            <p className="text-slate-600 mb-4">Track your learning journey and achievements.</p>
                            <Link to="/progress" className="btn-primary text-sm py-2 px-4 inline-flex items-center group">
                                View Progress
                                <svg className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>

                        {/* Card 3: Certificates */}
                        <div className="card">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-slate-800">Certificates</h2>
                                <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full">2 Earned</span>
                            </div>
                            <p className="text-slate-600 mb-4">View and download your earned certificates.</p>
                            <Link to="/certificates" className="btn-primary text-sm py-2 px-4 inline-flex items-center group">
                                View Certificates
                                <svg className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Recent Activity Section */}
                    <div className="mt-8 bg-white p-6 rounded-lg shadow-md border border-gray-100">
                        <h2 className="text-xl font-semibold text-slate-800 mb-4">Recent Activity</h2>
                        <div className="space-y-4">
                            {/* Activity Item 1 */}
                            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow duration-200">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">Completed Basic Security Quiz</p>
                                    <p className="text-sm text-slate-500">Score: 85% · 2 hours ago</p>
                                </div>
                            </div>
                            {/* Activity Item 2 */}
                            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow duration-200">
                                <div className="flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-800">Started Advanced Security Module</p>
                                    <p className="text-sm text-slate-500">Progress: 20% · 1 day ago</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}