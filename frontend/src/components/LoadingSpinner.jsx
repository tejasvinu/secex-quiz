export default function LoadingSpinner({ size = 'medium', color = 'blue' }) {
    const sizeClasses = {
        small: 'h-4 w-4',
        medium: 'h-8 w-8',
        large: 'h-12 w-12'
    };
    
    const colorClasses = {
        blue: 'border-blue-200 border-t-blue-600',
        slate: 'border-slate-200 border-t-slate-600',
        white: 'border-white/30 border-t-white'
    };

    return (
        <div className="flex justify-center items-center" role="status">
            <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 ${colorClasses[color]}`}></div>
            <span className="sr-only">Loading...</span>
        </div>
    );
}