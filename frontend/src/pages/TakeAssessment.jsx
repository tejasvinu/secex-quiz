import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast'; // Import toast

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
        const loadingToast = toast.loading('Submitting assessment...'); // Loading toast
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/api/assessment/${id}/submit`, formData);
            toast.success('Thank you for completing the assessment!', { id: loadingToast, duration: 4000 }); // Success toast
            navigate('/'); // Navigate after showing toast
        } catch (error) {
            console.error('Failed to submit assessment:', error);
            toast.error('Failed to submit assessment. Please try again.', { id: loadingToast }); // Error toast
        } finally {
            setSubmitting(false);
        }
    };

    // Helper component for step indicator
    const StepIndicator = ({ current, total }) => (
        <div className="text-sm text-gray-500 mb-4">
            Step {current} of {total}
        </div>
    );

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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8"> {/* Added gradient, padding */}
                <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden"> {/* Improved card styling */}
                    <div className="px-6 py-8 sm:px-10"> {/* Increased padding */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{assessment.title}</h1>
                            <p className="mt-2 text-sm text-gray-600">{assessment.description}</p>
                        </div>

                        <StepIndicator current={1} total={2} />

                        <form onSubmit={handleDetailsSubmit} className="space-y-6">
                            <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 mb-6">Your Information</h2> {/* Added heading style */}

                            {/* ... Input fields for name, email, department, designation ... */}
                            {/* Example for Name */}
                            <div>
                                <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    id="participantName"
                                    type="text"
                                    value={formData.participantName}
                                    onChange={(e) => setFormData(prev => ({ ...prev, participantName: e.target.value }))}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" // Added sm:text-sm
                                    required
                                />
                            </div>
                             {/* Repeat similar structure for Email, Department, Designation */}
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

                            <div className="pt-5"> {/* Added padding top */}
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Next: Questions
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8"> {/* Added gradient, padding */}
            <div className="max-w-3xl mx-auto">
                 <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{assessment.title}</h1>
                 </div>

                <StepIndicator current={2} total={2} />

                <form onSubmit={handleSubmit} className="space-y-8">
                    {assessment.questions.map((question, index) => (
                        <div key={index} className="bg-white shadow-lg rounded-xl overflow-hidden"> {/* Improved card styling */}
                            <div className="px-6 py-6 sm:px-8"> {/* Increased padding */}
                                <label className="block text-lg font-semibold text-slate-800 mb-5"> {/* Changed to label for semantics */}
                                    {index + 1}. {question.question}
                                </label>

                                <fieldset className="mt-4"> {/* Use fieldset for radio group */}
                                    <legend className="sr-only">Response options for question {index + 1}</legend>
                                    {/* Improved Radio Button Layout */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                        {question.options.map((option, optIndex) => (
                                            <label key={optIndex} className="flex items-center justify-center p-3 border border-gray-200 rounded-md hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-colors has-[:checked]:bg-blue-100 has-[:checked]:border-blue-500 has-[:checked]:ring-1 has-[:checked]:ring-blue-500">
                                                <input
                                                    type="radio"
                                                    name={`question-${index}`}
                                                    value={option}
                                                    checked={formData.responses[index]?.response === option}
                                                    onChange={(e) => handleResponseChange(index, 'response', e.target.value)}
                                                    className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 focus:ring-offset-1" // Added focus offset
                                                    required
                                                />
                                                <span className="ml-3 text-sm font-medium text-gray-800">{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>

                                {question.allowComments && (
                                    <div className="mt-6">
                                        <label htmlFor={`comments-${index}`} className="block text-sm font-medium text-gray-700 mb-1">Additional Comments (Optional)</label>
                                        <textarea
                                            id={`comments-${index}`}
                                            value={formData.responses[index]?.comments || ''}
                                            onChange={(e) => handleResponseChange(index, 'comments', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" // Added sm:text-sm
                                            rows="3"
                                            placeholder="Provide any specific details or context here..."
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Additional Feedback Section */}
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                         <div className="px-6 py-6 sm:px-8">
                            <label htmlFor="additionalFeedback" className="block text-lg font-semibold text-slate-800 mb-3">Overall Feedback (Optional)</label>
                            <textarea
                                id="additionalFeedback"
                                value={formData.additionalFeedback}
                                onChange={(e) => setFormData(prev => ({ ...prev, additionalFeedback: e.target.value }))}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" // Added sm:text-sm
                                rows="4"
                                placeholder="Any other comments or feedback about the assessment process..."
                            />
                        </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="pt-6 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => setCurrentStep('details')}
                            className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        >
                            Back to Details
                        </button>
                        <button
                            type="submit"
                            className="inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                            disabled={submitting}
                        >
                            {submitting ? (
                                <>
                                    <LoadingSpinner size="small" className="mr-2" />
                                    Submitting...
                                </>
                            ) : 'Submit Assessment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}