import { Link } from 'react-router-dom';
import Navigation from '../components/Navigation';

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 text-white">
            <Navigation />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
                <div className="text-center max-w-4xl mx-auto">
                    <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 mb-6 leading-tight animate-fade-in">
                        Interactive Quiz Platform
                    </h1>
                    <p className="text-lg sm:text-xl text-gray-300 mb-12 max-w-3xl mx-auto animate-fade-in-delay-1">
                        Create and participate in interactive quizzes. Test knowledge, track performance, and engage with other participants in real-time.
                    </p>

                    {/* Primary Call to Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-16 animate-fade-in-delay-1">
                        <Link
                            to="/join-game"
                            className="group relative overflow-hidden rounded-lg bg-blue-600 p-4 text-white shadow-lg transition-transform hover:scale-105"
                        >
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-1">Join Quiz</h3>
                                <p className="text-sm text-blue-100">Enter a session code to participate</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 transition-transform group-hover:translate-x-2">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </Link>
                        <Link
                            to="/register"
                            className="group relative overflow-hidden rounded-lg bg-slate-700 p-4 text-white shadow-lg transition-transform hover:scale-105"
                        >
                            <div className="relative z-10">
                                <h3 className="text-xl font-bold mb-1">Create Quiz</h3>
                                <p className="text-sm text-slate-300">Host your own quiz session</p>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-slate-700 to-slate-800 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute right-4 top-1/2 transform -translate-y-1/2 transition-transform group-hover:translate-x-2">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                            </div>
                        </Link>
                    </div>

                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-24 animate-fade-in-delay-2">
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 text-white transform hover:scale-105 transition-all duration-300 border border-white/10">
                            <div className="bg-blue-500/10 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Interactive Quizzes</h3>
                            <p className="text-gray-300">Real-time participation with instant feedback and scoring.</p>
                        </div>
                        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg rounded-xl p-6 text-white transform hover:scale-105 transition-all duration-300 border border-white/10">
                            <div className="bg-green-500/10 rounded-full w-12 h-12 flex items-center justify-center mb-4 mx-auto">
                                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Quiz Creation Tools</h3>
                            <p className="text-gray-300">Create quizzes from topics or documents with AI-powered question generation.</p>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-24 bg-gradient-to-r from-blue-600/20 to-blue-700/20 rounded-2xl p-8 backdrop-blur-lg border border-blue-500/10 animate-fade-in-delay-3">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Get Started?</h2>
                        <p className="text-gray-300 mb-8">Join a quiz session or create your own quiz.</p>
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            <Link
                                to="/join-game"
                                className="btn-secondary px-8 py-3 font-medium text-lg"
                            >
                                Join Quiz
                            </Link>
                            <Link
                                to="/login"
                                className="inline-block bg-transparent text-white border-2 border-white px-8 py-3 rounded-lg font-medium hover:bg-white/10 transform hover:scale-105 transition-all duration-200 text-lg"
                            >
                                Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}