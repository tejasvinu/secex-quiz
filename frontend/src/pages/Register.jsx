import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Register() {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect users to the login page
        navigate('/login');
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <p className="text-gray-600">Registration is currently disabled. Please contact the administrator for assistance.</p>
        </div>
    );
}