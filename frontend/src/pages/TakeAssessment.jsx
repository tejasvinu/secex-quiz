import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

export default function TakeAssessment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assessment, setAssessment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [currentStep, setCurrentStep] = useState('details');
    const [timer, setTimer] = useState(null);
    
    const [formData, setFormData] = useState({
        participantName: '',
        participantEmail: '',
        participantDepartment: '',
        participantDesignation: '',
        participantCentre: '', // Add new field
        responses: [],
        additionalFeedback: '',
        answers: [],
        experience: 'beginner'
    });

    useEffect(() => {
        fetchAssessment();
    }, [id]);

    useEffect(() => {
        if (assessment?.timeLimit && currentStep === 'questions') {
            const timeLimit = assessment.timeLimit * 60;
            setTimer(timeLimit);
            
            const interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [assessment, currentStep]);

    const fetchAssessment = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/assessment/${id}`);
            if (!response.data.isActive) {
                toast.error('This assessment is currently not available');
                navigate('/');
                return;
            }
            setAssessment(response.data);
        } catch (error) {
            console.error('Failed to fetch assessment:', error);
            toast.error('Failed to load assessment');
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const handleDetailsSubmit = (e) => {
        e.preventDefault();
        setCurrentStep('questions');
    };

    const handleResponseChange = (index, field, value) => {
        if (assessment.assessmentType === 'survey') {
            setFormData(prev => {
                const newResponses = [...prev.responses];
                newResponses[index] = { ...newResponses[index], [field]: value };
                return { ...prev, responses: newResponses };
            });
        } else {
            setFormData(prev => {
                const newAnswers = [...prev.answers];
                newAnswers[index] = { 
                    ...newAnswers[index], 
                    selectedOption: parseInt(value)
                };
                return { ...prev, answers: newAnswers };
            });
        }
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();
        setSubmitting(true);
        const loadingToast = toast.loading('Submitting assessment...');
        
        try {
            const submitData = {
                participantName: formData.participantName,
                participantEmail: formData.participantEmail,
                participantDepartment: formData.participantDepartment,
                participantDesignation: formData.participantDesignation,
                participantCentre: formData.participantCentre,
                experience: formData.experience
            };

            if (assessment.assessmentType === 'survey') {
                submitData.responses = formData.responses;
                submitData.additionalFeedback = formData.additionalFeedback;
            } else {
                submitData.answers = formData.answers;
            }

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/assessment/${id}/submit`,
                submitData
            );

            toast.success(
                assessment.assessmentType === 'quiz' 
                    ? `Assessment completed! Score: ${response.data.score}` 
                    : 'Thank you for completing the assessment!',
                { id: loadingToast, duration: 4000 }
            );
            
            navigate('/');
        } catch (error) {
            console.error('Failed to submit assessment:', error);
            toast.error('Failed to submit assessment. Please try again.', { id: loadingToast });
        } finally {
            setSubmitting(false);
        }
    };

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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto">
                    <div className="card-enhanced p-8">
                        <div className="text-center mb-8">
                            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{assessment.title}</h1>
                            <p className="text-slate-600">{assessment.description}</p>
                            {assessment.assessmentType !== 'survey' && (
                                <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
                                    <p className="text-sm text-blue-800">
                                        This is a {assessment.assessmentType} assessment. 
                                        {assessment.timeLimit && ` You will have ${assessment.timeLimit} minutes to complete it.`}
                                        {assessment.passingScore && ` Passing score: ${assessment.passingScore}%`}
                                    </p>
                                </div>
                            )}
                        </div>

                        <StepIndicator current={1} total={2} />

                        <form onSubmit={handleDetailsSubmit} className="space-y-6">
                            <div className="field-group">
                                <h2 className="text-lg font-semibold text-slate-800 pb-2 border-b border-gray-200">Your Information</h2>
                                
                                <div className="field-group-horizontal">
                                    <div className="input-group">
                                        <label htmlFor="participantName" className="label-enhanced">Full Name</label>
                                        <input
                                            id="participantName"
                                            type="text"
                                            value={formData.participantName}
                                            onChange={(e) => setFormData(prev => ({ ...prev, participantName: e.target.value }))}
                                            className="form-input-enhanced"
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label htmlFor="participantEmail" className="label-enhanced">Email Address</label>
                                        <input
                                            id="participantEmail"
                                            type="email"
                                            value={formData.participantEmail}
                                            onChange={(e) => setFormData(prev => ({ ...prev, participantEmail: e.target.value }))}
                                            className="form-input-enhanced"
                                            placeholder="your@email.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="field-group-horizontal">
                                    <div className="input-group">
                                        <label htmlFor="participantDepartment" className="label-enhanced">Department</label>
                                        <input
                                            id="participantDepartment"
                                            type="text"
                                            value={formData.participantDepartment}
                                            onChange={(e) => setFormData(prev => ({ ...prev, participantDepartment: e.target.value }))}
                                            className="form-input-enhanced"
                                            placeholder="Your department"
                                            required
                                        />
                                    </div>

                                    <div className="input-group">
                                        <label htmlFor="participantDesignation" className="label-enhanced">Designation</label>
                                        <input
                                            id="participantDesignation"
                                            type="text"
                                            value={formData.participantDesignation}
                                            onChange={(e) => setFormData(prev => ({ ...prev, participantDesignation: e.target.value }))}
                                            className="form-input-enhanced"
                                            placeholder="Your designation"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label htmlFor="participantCentre" className="label-enhanced">Centre</label>
                                    <select
                                        id="participantCentre"
                                        value={formData.participantCentre}
                                        onChange={(e) => setFormData(prev => ({ ...prev, participantCentre: e.target.value }))}
                                        className="form-input-enhanced"
                                        required
                                    >
                                        <option value="">Select your centre</option>
                                        <option value="delhi">Delhi</option>
                                        <option value="bengaluru">Bengaluru</option>
                                        <option value="mumbai">Mumbai</option>
                                        <option value="kolkatta">Kolkatta</option>
                                    </select>
                                </div>

                                {assessment.assessmentType !== 'survey' && (
                                    <div className="input-group">
                                        <label htmlFor="experience" className="label-enhanced">Experience Level</label>
                                        <select
                                            id="experience"
                                            value={formData.experience}
                                            onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
                                            className="form-input-enhanced"
                                            required
                                        >
                                            <option value="beginner">Beginner</option>
                                            <option value="intermediate">Intermediate</option>
                                            <option value="advanced">Advanced</option>
                                            <option value="expert">Expert</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="pt-6 border-t border-gray-200">
                                <div className="flex justify-end">
                                    <button type="submit" className="btn-primary-enhanced">
                                        Continue to Questions
                                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </svg>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
                <div className="card-enhanced p-8 mb-8 text-center">
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{assessment.title}</h1>
                    <p className="text-slate-600 max-w-2xl mx-auto">{assessment.description}</p>
                    {timer !== null && (
                        <div className="mt-6">
                            <div className={`inline-flex items-center px-4 py-2 rounded-full ${
                                timer < 300 
                                    ? 'bg-red-50 text-red-700 animate-soft-pulse' 
                                    : 'bg-blue-50 text-blue-700'
                            }`}>
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-semibold">{formatTime(timer)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <StepIndicator current={2} total={2} />

                <form onSubmit={handleSubmit} className="space-y-6">
                    {assessment.questions.map((question, index) => (
                        <div key={index} className="card-enhanced p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
                            <div className="flex items-start gap-4">
                                <span className="flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
                                    {index + 1}
                                </span>
                                <div className="flex-1 space-y-6">
                                    <h3 className="text-xl font-semibold text-slate-900">
                                        {question.question}
                                    </h3>

                                    <fieldset>
                                        <legend className="sr-only">Response options for question {index + 1}</legend>
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            {question.options.map((option, optIndex) => (
                                                <label key={optIndex} 
                                                    className="relative flex items-start p-4 border-2 rounded-lg cursor-pointer 
                                                        transition-all duration-200
                                                        hover:border-blue-400 hover:bg-blue-50/50
                                                        has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50/70
                                                        has-[:checked]:shadow-md">
                                                    <div className="flex items-center h-5">
                                                        <input
                                                            type="radio"
                                                            name={`question-${index}`}
                                                            value={assessment.assessmentType === 'survey' ? option : optIndex}
                                                            checked={assessment.assessmentType === 'survey' 
                                                                ? formData.responses[index]?.response === option
                                                                : formData.answers[index]?.selectedOption === optIndex
                                                            }
                                                            onChange={(e) => handleResponseChange(
                                                                index,
                                                                assessment.assessmentType === 'survey' ? 'response' : 'selectedOption',
                                                                e.target.value
                                                            )}
                                                            className="custom-radio"
                                                            required
                                                        />
                                                    </div>
                                                    <div className="ml-3">
                                                        <span className="text-base text-slate-900">{option}</span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>

                                    {(assessment.assessmentType === 'survey' && question.allowComments) && (
                                        <div className="input-group">
                                            <label htmlFor={`comments-${index}`} className="label-enhanced">
                                                Additional Comments (Optional)
                                            </label>
                                            <textarea
                                                id={`comments-${index}`}
                                                value={formData.responses[index]?.comments || ''}
                                                onChange={(e) => handleResponseChange(index, 'comments', e.target.value)}
                                                className="form-input-enhanced"
                                                rows="3"
                                                placeholder="Provide any specific details or context here..."
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {assessment.assessmentType === 'survey' && (
                        <div className="card-enhanced p-6 sm:p-8">
                            <div className="input-group">
                                <label htmlFor="additionalFeedback" className="text-xl font-semibold text-slate-900 mb-4">
                                    Overall Feedback (Optional)
                                </label>
                                <textarea
                                    id="additionalFeedback"
                                    value={formData.additionalFeedback}
                                    onChange={(e) => setFormData(prev => ({ ...prev, additionalFeedback: e.target.value }))}
                                    className="form-input-enhanced"
                                    rows="4"
                                    placeholder="Any other comments or feedback about the assessment process..."
                                />
                            </div>
                        </div>
                    )}

                    <div className="sticky bottom-0 pt-6 pb-4 bg-gradient-to-t from-slate-50 to-transparent">
                        <div className="flex justify-between items-center max-w-4xl mx-auto">
                            <button
                                type="button"
                                onClick={() => setCurrentStep('details')}
                                className="btn-secondary-enhanced"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Details
                            </button>
                            <button
                                type="submit"
                                className="btn-primary-enhanced"
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <>
                                        <LoadingSpinner size="small" className="mr-2" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        Submit Assessment
                                        <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}