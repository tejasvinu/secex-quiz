import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TakeAssessment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState('details'); // 'details' or 'questions'
    
    const [formData, setFormData] = useState({
        participantName: '',
        participantEmail: '',
        participantDepartment: '',
        participantDesignation: '', // Added designation field
        responses: [],
        additionalFeedback: ''
    });

    useEffect(() => {
        fetchAssessment();
    }, [id]);

    const fetchAssessment = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/assessment/${id}`);
            setAssessment(response.data);
            setFormData(prev => ({
                ...prev,
                responses: response.data.questions.map(q => ({ question: q.question, response: '', comments: '' }))
            }));
        } catch (error) {
            console.error('Failed to fetch assessment:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDetailsSubmit = (e) => {
        e.preventDefault();
        setCurrentStep('questions');
    };

    const handleResponseChange = (index, field, value) => {
        setFormData(prev => {
            const newResponses = [...prev.responses];
            newResponses[index] = { ...newResponses[index], [field]: value };
            return { ...prev, responses: newResponses };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/assessment/${id}/submit`, formData);
            alert('Thank you for completing the assessment!');
            navigate('/');
        } catch (error) {
            console.error('Failed to submit assessment:', error);
            alert('Failed to submit assessment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center items-center">
                <LoadingSpinner size="large" />
            </div>
        );
    }

    if (!assessment) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center items-center">
                <p className="text-red-600">Assessment not found</p>
            </div>
        );
    }

    if (currentStep === 'details') {
        return (
            <div className="min-h-screen bg-gray-50 py-8 px-4">
                <div className="max-w-3xl mx-auto">
                    <h1 className="text-3xl font-bold text-gray-900 mb-8">{assessment.title}</h1>
                    <p className="text-gray-600 mb-8">{assessment.description}</p>
                    
                    <form onSubmit={handleDetailsSubmit} className="bg-white shadow-md rounded-lg p-6 space-y-6">
                        <h2 className="text-xl font-semibold text-gray-800 mb-4">Participant Information</h2>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Name</label>
                            <input
                                type="text"
                                value={formData.participantName}
                                onChange={(e) => setFormData(prev => ({ ...prev, participantName: e.target.value }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={formData.participantEmail}
                                onChange={(e) => setFormData(prev => ({ ...prev, participantEmail: e.target.value }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Department</label>
                            <input
                                type="text"
                                value={formData.participantDepartment}
                                onChange={(e) => setFormData(prev => ({ ...prev, participantDepartment: e.target.value }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Designation</label>
                            <input
                                type="text"
                                value={formData.participantDesignation}
                                onChange={(e) => setFormData(prev => ({ ...prev, participantDesignation: e.target.value }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            >
                                Next
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-3xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">{assessment.title}</h1>
                
                <form onSubmit={handleSubmit} className="space-y-8">
                    {assessment.questions.map((question, index) => (
                        <div key={index} className="bg-white shadow-md rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">{question.question}</h3>
                            
                            <div className="space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    {question.options.map((option, optIndex) => (
                                        <label key={optIndex} className="flex items-center">
                                            <input
                                                type="radio"
                                                name={`question-${index}`}
                                                value={option}
                                                checked={formData.responses[index]?.response === option}
                                                onChange={(e) => handleResponseChange(index, 'response', e.target.value)}
                                                className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                                                required
                                            />
                                            <span className="ml-2 text-sm text-gray-700">{option}</span>
                                        </label>
                                    ))}
                                </div>
                                
                                {question.allowComments && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Additional Comments</label>
                                        <textarea
                                            value={formData.responses[index]?.comments || ''}
                                            onChange={(e) => handleResponseChange(index, 'comments', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            rows="2"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <div className="bg-white shadow-md rounded-lg p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Feedback</h3>
                        <textarea
                            value={formData.additionalFeedback}
                            onChange={(e) => setFormData(prev => ({ ...prev, additionalFeedback: e.target.value }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                            rows="4"
                            placeholder="Any additional comments or feedback..."
                        />
                    </div>

                    <div className="flex justify-between">
                        <button
                            type="button"
                            onClick={() => setCurrentStep('details')}
                            className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                        >
                            Back
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            disabled={submitting}
                        >
                            {submitting ? 'Submitting...' : 'Submit Assessment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}