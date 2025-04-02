import React from 'react';

export default function LoadingSpinner({ size = 'medium', color = 'blue', type = 'border', text = null }) {
    const sizeClasses = {
        tiny: 'h-3 w-3',
        small: 'h-5 w-5',
        medium: 'h-10 w-10',
        large: 'h-14 w-14',
        xl: 'h-20 w-20'
    };
    
    const colorClasses = {
        blue: 'border-blue-200 border-t-blue-600',
        indigo: 'border-indigo-200 border-t-indigo-600',
        slate: 'border-slate-200 border-t-slate-600',
        white: 'border-white/30 border-t-white',
        green: 'border-green-200 border-t-green-600',
        red: 'border-red-200 border-t-red-600',
        purple: 'border-purple-200 border-t-purple-600',
        gradient: 'border-gradient'
    };

    // For pulse type
    const pulseColorClasses = {
        blue: 'bg-blue-600',
        indigo: 'bg-indigo-600',
        slate: 'bg-slate-600',
        white: 'bg-white',
        green: 'bg-green-600',
        red: 'bg-red-600',
        purple: 'bg-purple-600',
        gradient: 'bg-gradient-to-r from-blue-500 to-indigo-600'
    };

    // Text size based on spinner size
    const textSizeClasses = {
        tiny: 'text-xs',
        small: 'text-sm',
        medium: 'text-base',
        large: 'text-lg',
        xl: 'text-xl'
    };

    // For shine type (new)
    if (type === 'shine') {
        return (
            <div className="flex flex-col items-center justify-center gap-3" role="status">
                <div className={`${sizeClasses[size]} relative`}>
                    <div className={`absolute inset-0 ${pulseColorClasses[color]} rounded-full opacity-30 blur-sm`}></div>
                    <div className={`absolute inset-0 ${pulseColorClasses[color]} rounded-full`}>
                        <span className="absolute inset-0 animate-spin-slow rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-70 blur-sm"></span>
                    </div>
                    <div className={`absolute inset-1 bg-slate-900 rounded-full`}></div>
                    <div className={`absolute inset-0 ${pulseColorClasses[color]} rounded-full animate-ping opacity-30`}></div>
                </div>
                {text && <p className={`mt-2 ${textSizeClasses[size]} text-slate-300 font-medium`}>{text}</p>}
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    // For pulse type
    if (type === 'pulse') {
        return (
            <div className="flex flex-col items-center justify-center gap-2" role="status">
                <div className="relative">
                    <div className={`${sizeClasses[size]} ${pulseColorClasses[color]} rounded-full animate-ping opacity-75`}></div>
                    <div className={`${sizeClasses[size]} ${pulseColorClasses[color]} opacity-90 rounded-full absolute inset-0 scale-50`}></div>
                </div>
                {text && <p className={`mt-2 ${textSizeClasses[size]} text-slate-300 font-medium`}>{text}</p>}
                <span className="sr-only">Loading...</span>
            </div>
        );
    }
    
    // For dots type
    if (type === 'dots') {
        return (
            <div className="flex flex-col items-center justify-center" role="status">
                <div className="flex justify-center items-center space-x-2">
                    <div className={`${sizeClasses.tiny} ${pulseColorClasses[color]} rounded-full animate-bounce`} style={{animationDelay: '0ms'}}></div>
                    <div className={`${sizeClasses.tiny} ${pulseColorClasses[color]} rounded-full animate-bounce`} style={{animationDelay: '150ms'}}></div>
                    <div className={`${sizeClasses.tiny} ${pulseColorClasses[color]} rounded-full animate-bounce`} style={{animationDelay: '300ms'}}></div>
                </div>
                {text && <p className={`mt-3 ${textSizeClasses[size]} text-slate-300 font-medium`}>{text}</p>}
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    // For wave type (new)
    if (type === 'wave') {
        return (
            <div className="flex flex-col items-center justify-center" role="status">
                <div className="flex justify-center items-end space-x-1.5 h-10">
                    {[0, 1, 2, 3, 4].map((index) => (
                        <div 
                            key={index}
                            className={`w-1.5 ${pulseColorClasses[color]} rounded-t-sm animate-wave`} 
                            style={{
                                height: `${Math.max(3, Math.min(24, 12 + Math.sin(index) * 8))}px`,
                                animationDelay: `${index * 100}ms`
                            }}
                        ></div>
                    ))}
                </div>
                {text && <p className={`mt-3 ${textSizeClasses[size]} text-slate-300 font-medium`}>{text}</p>}
                <span className="sr-only">Loading...</span>
            </div>
        );
    }

    // For default spinner type with improved visual
    return (
        <div className="flex flex-col items-center justify-center gap-2" role="status">
            <div className={`relative ${sizeClasses[size]}`}>
                <div className={`absolute inset-0 rounded-full ${color === 'gradient' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 opacity-30' : ''} blur-sm`}></div>
                <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 ${colorClasses[color]} shadow-md`}></div>
            </div>
            {text && <p className={`mt-2 ${textSizeClasses[size]} text-slate-300 font-medium`}>{text}</p>}
            <span className="sr-only">Loading...</span>
        </div>
    );
}