import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';

export default function ManageAssessments() {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const [newAssessment, setNewAssessment] = useState({
        title: '',
        description: '',
        questions: [{
            question: '',
            allowComments: true
        }]
    });

    useEffect(() => {
        fetchAssessments();
    }, []);

    const fetchAssessments = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.get(
                `${import.meta.env.VITE_API_URL}/api/assessment/my-assessments`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setAssessments(response.data);
        } catch (error) {
            console.error('Failed to fetch assessments:', error);
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setNewAssessment(prev => ({
            ...prev,
            questions: [...prev.questions, { question: '', allowComments: true }]
        }));
    };

    const handleQuestionChange = (index, field, value) => {
        setNewAssessment(prev => {
            const questions = [...prev.questions];
            questions[index] = { ...questions[index], [field]: value };
            return { ...prev, questions };
        });
    };

    const handleCreateAssessment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axios.post(
                `${import.meta.env.VITE_API_URL}/api/assessment`,
                newAssessment,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setShowCreateForm(false);
            setNewAssessment({
                title: '',
                description: '',
                questions: [{ question: '', allowComments: true }]
            });
            fetchAssessments();
        } catch (error) {
            console.error('Failed to create assessment:', error);
            alert('Failed to create assessment. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewResponses = (assessmentId) => {
        navigate(`/assessment/${assessmentId}/responses`);
    };

    const handleShareAssessment = (assessmentId) => {
        const url = `${window.location.origin}/take-assessment/${assessmentId}`;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url)
                .then(() => alert('Assessment link copied to clipboard!'))
                .catch((err) => alert('Failed to copy link: ' + err));
        } else {
            // Fallback for environments where clipboard API is unavailable
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Assessment link copied to clipboard!');
            } catch (err) {
                alert('Failed to copy link: ' + err);
            } finally {
                document.body.removeChild(textArea);
            }
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <Navigation />
                <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
                    <LoadingSpinner size="large" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <Navigation />
            <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">My Assessments</h1>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                        Create New Assessment
                    </button>
                </div>

                {showCreateForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>

                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Assessment</h2>
                            
                            <form onSubmit={handleCreateAssessment} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Title</label>
                                    <input
                                        type="text"
                                        value={newAssessment.title}
                                        onChange={(e) => setNewAssessment(prev => ({ ...prev, title: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        value={newAssessment.description}
                                        onChange={(e) => setNewAssessment(prev => ({ ...prev, description: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        rows="3"
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-slate-800">Questions</h3>
                                        <button
                                            type="button"
                                            onClick={addQuestion}
                                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200"
                                        >
                                            Add Question
                                        </button>
                                    </div>

                                    {newAssessment.questions.map((q, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700">
                                                    Question {index + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={(e) => handleQuestionChange(index, 'question', e.target.value)}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                    required
                                                />
                                            </div>
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    id={`allowComments-${index}`}
                                                    checked={q.allowComments}
                                                    onChange={(e) => handleQuestionChange(index, 'allowComments', e.target.checked)}
                                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <label htmlFor={`allowComments-${index}`} className="ml-2 text-sm text-gray-700">
                                                    Allow additional comments for this question
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                                        disabled={submitting}
                                    >
                                        {submitting ? 'Creating...' : 'Create Assessment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assessments.map((assessment) => (
                        <div
                            key={assessment._id}
                            className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg"
                        >
                            <div className="p-6">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">{assessment.title}</h3>
                                <p className="text-gray-600 mb-4">{assessment.description}</p>
                                <div className="flex items-center text-sm text-gray-500 mb-4">
                                    <span className="flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {assessment.questions.length} questions
                                    </span>
                                </div>
                                <div className="flex flex-col space-y-2">
                                    <button
                                        onClick={() => handleViewResponses(assessment._id)}
                                        className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
                                    >
                                        View Responses
                                    </button>
                                    <button
                                        onClick={() => handleShareAssessment(assessment._id)}
                                        className="w-full bg-blue-50 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-100"
                                    >
                                        Share Assessment
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {assessments.length === 0 && (
                    <div className="text-center py-12">
                        <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-slate-700 mb-2">No Assessments Created Yet</h3>
                        <p className="text-gray-500">Create your first assessment to get started!</p>
                    </div>
                )}
            </main>
        </div>
    );
}