import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const navItems = user ? [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/manage-quizzes', label: 'My Quizzes' },
    ] : [
        { path: '/join-game', label: 'Join Game' }
    ];

    return (
        <nav className="bg-slate-800 shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0">
                            <h1 className="text-xl font-bold text-white">CII SecEx 2025</h1>
                        </Link>
                        <div className="hidden md:ml-6 md:flex md:space-x-4">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`${
                                        isActive(item.path)
                                            ? 'bg-slate-700 text-white'
                                            : 'text-gray-200 hover:bg-slate-700 hover:text-white'
                                    } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                            {!user && (
                                <Link
                                    to="/join-game"
                                    className="bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium
                                        hover:bg-blue-700 transition-colors duration-200"
                                >
                                    Join Game
                                </Link>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center">
                        <div className="hidden md:flex items-center space-x-4">
                            {user ? (
                                <>
                                    <span className="text-sm font-medium text-white">Welcome, {user.username}!</span>
                                    <button
                                        onClick={logout}
                                        className="btn-secondary text-sm py-1.5 px-3"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <div className="flex space-x-4">
                                    <Link
                                        to="/login"
                                        className="text-gray-200 hover:text-white transition-colors duration-200"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="btn-secondary text-sm py-1.5 px-3"
                                    >
                                        Register
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex md:hidden">
                            <button
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-white
                                         hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                                aria-controls="mobile-menu"
                                aria-expanded={isMobileMenuOpen}
                            >
                                <span className="sr-only">Open main menu</span>
                                <svg
                                    className={`block h-6 w-6 transition-opacity duration-200 ease-in-out ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100'}`}
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M4 6h16M4 12h16M4 18h16"
                                    />
                                </svg>
                                <svg
                                    className={`absolute h-6 w-6 transition-opacity duration-200 ease-in-out ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                                    stroke="currentColor"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-slate-700`} id="mobile-menu">
                <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`${
                                isActive(item.path)
                                    ? 'bg-slate-700 text-white'
                                    : 'text-gray-200 hover:bg-slate-700 hover:text-white'
                            } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            {item.label}
                        </Link>
                    ))}
                </div>
                {user ? (
                    <div className="pt-4 pb-3 border-t border-slate-700">
                        <div className="flex items-center px-5">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-sm font-medium">
                                    {user.username[0].toUpperCase()}
                                </div>
                            </div>
                            <div className="ml-3">
                                <div className="text-base font-medium text-white">{user.username}</div>
                                <div className="text-sm font-medium text-gray-300">{user.email}</div>
                            </div>
                        </div>
                        <div className="mt-3 px-2 space-y-1">
                            <button
                                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium
                                     text-gray-200 hover:bg-slate-700 hover:text-white transition-colors duration-200"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="pt-4 pb-3 border-t border-slate-700">
                        <div className="px-2 space-y-1">
                            <Link
                                to="/login"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-200
                                    hover:bg-slate-700 hover:text-white transition-colors duration-200"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-200
                                    hover:bg-slate-700 hover:text-white transition-colors duration-200"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Register
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}