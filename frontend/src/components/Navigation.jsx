import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Menu, X, LogOut, User, LogIn, UserPlus, LayoutDashboard, ListChecks, Gamepad2, Home, ClipboardList } from 'lucide-react';

// Main Navigation Component
export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuth();
  const mobileMenuRef = useRef(null);
  const location = useLocation();

  // Function to check if a navigation link is active using React Router
  const isActive = (path) => location.pathname === path;

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Define navigation items based on user login status
  const commonNavItems = [
    { path: '/', label: 'Home', Icon: Home },
  ];

  const loggedInNavItems = [
    { path: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
    { path: '/manage-quizzes', label: 'My Quizzes', Icon: ListChecks },
    { path: '/manage-assessments', label: 'My Assessments', Icon: ClipboardList },
  ];

  const loggedOutNavItems = [
    { path: '/join-game', label: 'Join Session', Icon: Gamepad2, isPrimary: true },
  ];

  // Combine nav items based on user status
  const navItems = user
    ? [...commonNavItems, ...loggedInNavItems]
    : [...commonNavItems, ...loggedOutNavItems];

  // Close mobile menu if clicked outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        if (!event.target.closest || !event.target.closest('button[aria-controls="mobile-menu"]')) {
          setIsMobileMenuOpen(false);
        }
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  // Function to render a single navigation link
  const renderNavLink = (item, isMobile = false) => {
    const activeClasses = 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md';
    const inactiveClasses = 'text-gray-300 hover:bg-slate-700/50 hover:text-white';
    const baseClasses = `flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out`;
    const mobileBaseClasses = `block px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ease-in-out`;
    const primaryButtonClasses = `bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-blue-500/20`;

    // Use React Router Link instead of anchor tags
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`${isMobile ? mobileBaseClasses : baseClasses} ${
          isActive(item.path) ? activeClasses : inactiveClasses
        } ${item.isPrimary && !isActive(item.path) ? primaryButtonClasses : ''}`}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
      >
        {item.Icon && <item.Icon className="mr-2.5 h-5 w-5" strokeWidth={1.8} aria-hidden="true" />}
        {item.label}
      </Link>
    );
  };

  // Function to render authentication buttons
  const renderAuthSection = (isMobile = false) => {
    const buttonBaseClasses = `px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out flex items-center`;
    const mobileButtonBaseClasses = `block w-full text-left px-4 py-3 rounded-lg text-base font-medium transition-all duration-300 ease-in-out flex items-center`;
    const secondaryButtonClasses = `bg-slate-700/80 hover:bg-slate-600 text-white shadow-md hover:shadow-lg`;
    const primaryButtonClasses = `bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-blue-500/20`;
    const textLinkClasses = `text-gray-300 hover:text-white`;

    if (user) {
      return (
        <div className={`flex ${isMobile ? 'flex-col space-y-3 px-3 pt-3 pb-4 border-t border-slate-700/50' : 'items-center space-x-4'}`}>
          {/* User Info Section (Mobile) */}
          {isMobile && (
            <div className="flex items-center px-3 pt-2 pb-3 mb-2 border-b border-slate-700/50">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-medium ring-2 ring-offset-2 ring-offset-slate-800 ring-white/30 shadow-lg">
                  {user.username ? user.username[0].toUpperCase() : '?'}
                </div>
              </div>
              <div className="ml-3.5">
                <div className="text-base font-medium text-white">{user.username || 'User'}</div>
                {user.email && <div className="text-sm font-medium text-gray-400">{user.email}</div>}
              </div>
            </div>
          )}
          {/* Welcome Message (Desktop) */}
          {!isMobile && (
            <span className="text-sm font-medium text-white hidden lg:flex lg:items-center">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-medium mr-2.5 ring-2 ring-white/10">
                {user.username ? user.username[0].toUpperCase() : '?'}
              </div>
              <span>Welcome, {user.username || 'User'}!</span>
            </span>
          )}
          {/* Logout Button */}
          <button
            onClick={() => {
              logout();
              setIsMobileMenuOpen(false);
            }}
            className={`${isMobile ? mobileButtonBaseClasses : buttonBaseClasses} ${secondaryButtonClasses} ${isMobile ? 'justify-start' : ''}`}
          >
            <LogOut className={`mr-2.5 h-4 w-4 ${isMobile ? 'ml-0' : ''}`} aria-hidden="true" />
            Logout
          </button>
        </div>
      );
    } else {
      // Logged Out State
      return (
        <div className={`flex ${isMobile ? 'flex-col space-y-3 px-3 pt-4 pb-4 border-t border-slate-700/50' : 'items-center space-x-3'}`}>
          {/* Login Button */}
          <Link
            to="/login"
            onClick={() => isMobile && setIsMobileMenuOpen(false)}
            className={`${isMobile ? mobileButtonBaseClasses : buttonBaseClasses} ${textLinkClasses} border border-gray-600 hover:border-gray-400 hover:bg-slate-700/50 ${isMobile ? 'justify-start' : ''}`}
          >
            <LogIn className="mr-2.5 h-4 w-4" aria-hidden="true" />
            Login
          </Link>
          {/* Register Button */}
          <Link
            to="/register"
            onClick={() => isMobile && setIsMobileMenuOpen(false)}
            className={`${isMobile ? mobileButtonBaseClasses : buttonBaseClasses} ${primaryButtonClasses} ${isMobile ? 'justify-start' : ''}`}
          >
            <UserPlus className="mr-2.5 h-4 w-4" aria-hidden="true" />
            Register
          </Link>
        </div>
      );
    }
  };

  return (
    <nav className={`${isScrolled ? 'bg-slate-900/90 backdrop-blur-lg shadow-xl' : 'bg-slate-800'} transition-all duration-300 sticky top-0 z-50`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Section: Logo and Desktop Nav */}
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center space-x-3 group">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 transform group-hover:scale-105 transition-all duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white transition-all duration-300 ease-in-out flex flex-col">
                <span className="font-bold">CII SecEx</span>
                <span className="text-xs text-blue-400 font-medium -mt-1">2025</span>
              </span>
            </Link>
            {/* Desktop Navigation Links */}
            <div className="hidden md:ml-8 md:flex md:space-x-2">
              {navItems.map(item => renderNavLink(item, false))}
            </div>
          </div>

          {/* Right Section: Auth Buttons and Mobile Menu Toggle */}
          <div className="flex items-center">
            {/* Desktop Auth Buttons */}
            <div className="hidden md:flex">
              {renderAuthSection(false)}
            </div>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors duration-200"
                aria-controls="mobile-menu"
                aria-expanded={isMobileMenuOpen}
                aria-label={isMobileMenuOpen ? "Close main menu" : "Open main menu"}
              >
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        ref={mobileMenuRef}
        className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${isMobileMenuOpen ? 'max-h-screen border-t border-slate-700/50 pb-2' : 'max-h-0'}`}
        id="mobile-menu"
      >
        {/* Mobile Navigation Links */}
        <div className="px-3 pt-3 pb-3 space-y-2 sm:px-4">
          {navItems.map(item => renderNavLink(item, true))}
        </div>
        {/* Mobile Auth Buttons/Info */}
        {renderAuthSection(true)}
      </div>
    </nav>
  );
}
