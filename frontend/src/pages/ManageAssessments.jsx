import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, ShareIcon, EyeIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';

export default function ManageAssessments() {
    const navigate = useNavigate();
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [selectedAssessment, setSelectedAssessment] = useState(null);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [showDeleteQuestionConfirmation, setShowDeleteQuestionConfirmation] = useState(false);
    const [questionToDeleteIndex, setQuestionToDeleteIndex] = useState(null);
    const [isEditingQuestion, setIsEditingQuestion] = useState(false); // Tracks if question deletion is for edit form    
    const [openMenuId, setOpenMenuId] = useState(null);
    const [newAssessment, setNewAssessment] = useState({
        title: '',
        description: '',
        assessmentType: 'survey',
        timeLimit: null,
        passingScore: null,
        questions: [{
            question: '',
            questionType: 'survey',
            options: ['No', 'Little', 'Somewhat', 'Mostly', 'Completely'],
            allowComments: true,
            correctOption: null,
            points: 0
        }]
    });

    useEffect(() => {
        fetchAssessments();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openMenuId && !event.target.closest('.assessment-menu')) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openMenuId]);

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
            toast.error('Failed to load assessments.');
        } finally {
            setLoading(false);
        }
    };    const addQuestion = (isEditing = false) => {
        const stateSetter = isEditing ? setSelectedAssessment : setNewAssessment;
        const currentAssessment = isEditing ? selectedAssessment : newAssessment;
        
        if (!currentAssessment) return;
        
        stateSetter(prev => ({
            ...prev,
            questions: [
                ...(prev.questions || []),
                {
                    question: '',
                    questionType: prev.assessmentType,
                    options: prev.assessmentType === 'survey'
                        ? ['No', 'Little', 'Somewhat', 'Mostly', 'Completely']
                        : ['', '', '', ''],
                    allowComments: prev.assessmentType === 'survey',
                    correctOption: null,
                    points: prev.assessmentType === 'quiz' ? 1 : 0
                }
            ]
        }));
    };

    const handleQuestionChange = (index, field, value, isEditing = false) => {
        const stateSetter = isEditing ? setSelectedAssessment : setNewAssessment;
        stateSetter(prev => {
            const questions = [...prev.questions];
            questions[index] = { ...questions[index], [field]: value };

            // Reset correctOption if options array changes and correctOption becomes invalid
            if (field === 'options' && Array.isArray(value)) {
                if (questions[index].correctOption >= value.length) {
                    questions[index].correctOption = null;
                }
            }
            // Ensure points are numbers
            if (field === 'points') {
                questions[index].points = Number(value) || 0;
            }

            return { ...prev, questions };
        });
    };

    const handleAssessmentTypeChange = (type) => {
        setNewAssessment(prev => ({
            ...prev,
            assessmentType: type,
            questions: prev.questions.map(q => ({
                ...q,
                questionType: type,
                options: type === 'survey'
                    ? ['No', 'Little', 'Somewhat', 'Mostly', 'Completely']
                    : ['', '', '', ''],
                allowComments: type === 'survey',
                correctOption: null,
                points: type === 'quiz' ? 1 : 0
            }))
        }));
    };

    const handleCreateAssessment = async (e) => {
        e.preventDefault();
        // Ensure ALL questions have content
        if (newAssessment.questions.some(q => !q.question.trim())) {
            toast.error('Please ensure all questions have content before creating.');
            return;
        }

        setSubmitting(true);
        const loadingToast = toast.loading('Creating assessment...');
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;

            // Validate required fields for quiz type
            if (newAssessment.assessmentType === 'quiz') {
                for (const question of newAssessment.questions) {
                    if (question.correctOption === null) {
                        toast.error('Please select correct answers for all quiz questions', { id: loadingToast });
                        setSubmitting(false);
                        return;
                    }
                }
            }

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/assessment`,
                newAssessment,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            if (response.data) {
                toast.success('Assessment created successfully!', { id: loadingToast });
                await fetchAssessments(); // Wait for the fetch to complete
                setShowCreateForm(false);
                setNewAssessment({
                    title: '',
                    description: '',
                    assessmentType: 'survey',
                    timeLimit: null,
                    passingScore: null,
                    questions: [{
                        question: '',
                        questionType: 'survey',
                        options: ['No', 'Little', 'Somewhat', 'Mostly', 'Completely'],
                        allowComments: true,
                        correctOption: null,
                        points: 0
                    }]
                });
            }
        } catch (error) {
            console.error('Failed to create assessment:', error);
            toast.error('Failed to create assessment. Please try again.', { id: loadingToast });
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewResponses = (assessmentId) => {
        navigate(`/assessment/${assessmentId}/responses`);
    };

    const handleShareAssessment = async (assessmentId) => {
        const url = `${window.location.origin}/take-assessment/${assessmentId}`;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(url);
                toast.success('Assessment link copied to clipboard!');
            } else {
                // Fallback for browsers where clipboard API is not available
                const textArea = document.createElement('textarea');
                textArea.value = url;
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    toast.success('Assessment link copied to clipboard!');
                } catch (err) {
                    toast.error('Failed to copy link. Please copy it manually.');
                }
                document.body.removeChild(textArea);
            }
        } catch (err) {
            toast.error('Failed to copy link: ' + err.message);
        }
    };

    const handleEditAssessment = (assessment) => {
        setSelectedAssessment(assessment);
        setShowEditForm(true);
    };

    const handleUpdateAssessment = async (e) => {
        e.preventDefault();
        if (!selectedAssessment.questions.some(q => q.question.trim())) {
            toast.error('Please ensure all questions have content');
            return;
        }
        setSubmitting(true);
        const loadingToast = toast.loading('Updating assessment...');
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;

            // Validate required fields for quiz type during update
            if (selectedAssessment.assessmentType === 'quiz') {
                for (const question of selectedAssessment.questions) {
                    if (question.correctOption === null) {
                        toast.error('Please select correct answers for all quiz questions', { id: loadingToast });
                        setSubmitting(false);
                        return;
                    }
                    if (!question.options || question.options.length < 2 || question.options.some(opt => !opt.trim())) {
                         toast.error('Please ensure all quiz questions have at least two non-empty options.', { id: loadingToast });
                         setSubmitting(false);
                         return;
                    }
                }
            }


            // Send the entire updated assessment object
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/assessment/${selectedAssessment._id}`,
                selectedAssessment, // Send the whole object
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setShowEditForm(false);
            setSelectedAssessment(null);
            fetchAssessments(); // Refetch to show updated data
            toast.success('Assessment updated successfully!', { id: loadingToast });
        } catch (error) {
            console.error('Failed to update assessment:', error);
            toast.error(error.response?.data?.message || 'Failed to update assessment. Please try again.', { id: loadingToast });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAssessment = async () => {
        setSubmitting(true);
        const loadingToast = toast.loading('Deleting assessment...');
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axios.delete(
                `${import.meta.env.VITE_API_URL}/api/assessment/${selectedAssessment._id}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setShowDeleteConfirmation(false);
            setSelectedAssessment(null);
            fetchAssessments();
            toast.success('Assessment deleted successfully!', { id: loadingToast });
        } catch (error) {
            console.error('Failed to delete assessment:', error);
            toast.error('Failed to delete assessment. Please try again.', { id: loadingToast });
        } finally {
            setSubmitting(false);
        }
    };

    const removeQuestion = (index, isEditing = false) => {
        const questions = isEditing ? selectedAssessment.questions : newAssessment.questions;
        if (questions.length <= 1) {
            toast.error("An assessment must have at least one question.");
            return;
        }
        setQuestionToDeleteIndex(index);
        setIsEditingQuestion(isEditing); // Set context for deletion confirmation
        setShowDeleteQuestionConfirmation(true);
    };

    const confirmRemoveQuestion = () => {
        const index = questionToDeleteIndex;
        if (index === null) return;

        const stateSetter = isEditingQuestion ? setSelectedAssessment : setNewAssessment;
        stateSetter(prev => ({
            ...prev,
            questions: prev.questions.filter((_, i) => i !== index)
        }));

        setShowDeleteQuestionConfirmation(false);
        setQuestionToDeleteIndex(null);
        setIsEditingQuestion(false); // Reset flag
        toast.success('Question removed.');
    };

    const handleToggleStatus = async (assessment) => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.patch(
                `${import.meta.env.VITE_API_URL}/api/assessment/${assessment._id}/toggle-status`,
                {},
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            toast.success(response.data.message);
            fetchAssessments();
        } catch (error) {
            console.error('Failed to toggle assessment status:', error);
            toast.error('Failed to update assessment status');
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
            <Navigation />
            <main className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">My Assessments</h1>
                        <p className="mt-1 text-sm text-gray-600">Manage, create, and view responses for your assessments.</p>
                    </div>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors duration-200"
                    >
                        <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                        Create New Assessment
                    </button>
                </div>

                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-semibold text-slate-800">Create New Assessment</h2>
                                <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-gray-600">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

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

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Assessment Type</label>
                                    <div className="flex gap-4">
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                value="survey"
                                                checked={newAssessment.assessmentType === 'survey'}
                                                onChange={(e) => handleAssessmentTypeChange(e.target.value)}
                                                className="form-radio h-4 w-4 text-blue-600"
                                            />
                                            <span className="ml-2">Survey</span>
                                        </label>
                                        <label className="inline-flex items-center">
                                            <input
                                                type="radio"
                                                value="quiz"
                                                checked={newAssessment.assessmentType === 'quiz'}
                                                onChange={(e) => handleAssessmentTypeChange(e.target.value)}
                                                className="form-radio h-4 w-4 text-blue-600"
                                            />
                                            <span className="ml-2">Quiz</span>
                                        </label>
                                    </div>
                                </div>

                                {newAssessment.assessmentType === 'quiz' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Time Limit (minutes)</label>
                                            <input
                                                type="number"
                                                value={newAssessment.timeLimit || ''}
                                                onChange={(e) => setNewAssessment(prev => ({
                                                    ...prev,
                                                    timeLimit: e.target.value ? Number(e.target.value) : null
                                                }))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                min="1"
                                                placeholder="Optional"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Passing Score (%)</label>
                                            <input
                                                type="number"
                                                value={newAssessment.passingScore || ''}
                                                onChange={(e) => setNewAssessment(prev => ({
                                                    ...prev,
                                                    passingScore: e.target.value ? Number(e.target.value) : null
                                                }))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                min="0"
                                                max="100"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                )}

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
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4 relative group">
                                            {newAssessment.questions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(index, false)} // Pass false for create form
                                                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700">
                                                    Question {index + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={(e) => handleQuestionChange(index, 'question', e.target.value, false)}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Options</label>
                                                {q.options.map((option, optIndex) => (
                                                    <div key={optIndex} className="flex items-center mb-2">
                                                        <input
                                                            type="text"
                                                            value={option}
                                                            onChange={(e) => {
                                                                const newOptions = [...q.options];
                                                                newOptions[optIndex] = e.target.value;
                                                                handleQuestionChange(index, 'options', newOptions, false);
                                                            }}
                                                            className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                            readOnly={newAssessment.assessmentType === 'survey'} // Make survey options readonly
                                                        />
                                                        {newAssessment.assessmentType === 'quiz' && (
                                                            <div className="ml-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`correct-${index}`}
                                                                    checked={q.correctOption === optIndex}
                                                                    onChange={() => handleQuestionChange(index, 'correctOption', optIndex, false)}
                                                                    className="form-radio h-4 w-4 text-blue-600"
                                                                    required
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {newAssessment.assessmentType === 'quiz' && (
                                                    <div className="mt-2">
                                                        <label className="block text-sm font-medium text-slate-700">
                                                            Points for this question
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={q.points}
                                                            onChange={(e) => handleQuestionChange(index, 'points', Number(e.target.value), false)}
                                                            className="mt-1 block w-24 rounded-lg border border-gray-300 px-3 py-2"
                                                            min="0"
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {newAssessment.assessmentType === 'survey' && (
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`allowComments-${index}`}
                                                        checked={q.allowComments}
                                                        onChange={(e) => handleQuestionChange(index, 'allowComments', e.target.checked, false)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor={`allowComments-${index}`} className="ml-2 text-sm text-gray-700">
                                                        Allow additional comments for this question
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                </div>

                                <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>

                                                <LoadingSpinner size="small" className="mr-2" />
                                                Creating...
                                            </>
                                        ) : 'Create Assessment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEditForm && selectedAssessment && ( // Ensure selectedAssessment is not null
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-semibold text-slate-800">Edit Assessment</h2>
                                    <p className="text-sm text-gray-500 mt-1">Modify the assessment details and questions.</p> {/* Updated description */}
                                </div>
                                <button onClick={() => { setShowEditForm(false); setSelectedAssessment(null); }} className="text-gray-400 hover:text-gray-600">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateAssessment} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Title</label>
                                    <input
                                        type="text"
                                        value={selectedAssessment.title}
                                        onChange={(e) => setSelectedAssessment(prev => ({ ...prev, title: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        value={selectedAssessment.description}
                                        onChange={(e) => setSelectedAssessment(prev => ({ ...prev, description: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        rows="3"
                                        required
                                    />
                                </div>

                                {/* Display Assessment Type (Read-only in edit mode) */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Type</label>
                                    <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-full capitalize">
                                        {selectedAssessment.assessmentType}
                                    </span>
                                </div>

                                {/* Display Quiz specific fields (Read-only in edit mode) */}
                                {selectedAssessment.assessmentType === 'quiz' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Time Limit (minutes)</label>
                                            <input
                                                type="number"
                                                value={selectedAssessment.timeLimit || ''}
                                                onChange={(e) => setSelectedAssessment(prev => ({
                                                    ...prev,
                                                    timeLimit: e.target.value ? Number(e.target.value) : null
                                                }))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                min="1"
                                                placeholder="Optional"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700">Passing Score (%)</label>
                                            <input
                                                type="number"
                                                value={selectedAssessment.passingScore || ''}
                                                onChange={(e) => setSelectedAssessment(prev => ({
                                                    ...prev,
                                                    passingScore: e.target.value ? Number(e.target.value) : null
                                                }))}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                min="0"
                                                max="100"
                                                placeholder="Optional"
                                            />
                                        </div>
                                    </div>
                                )}


                                {/* Questions Section for Editing */}
                                <div className="space-y-4 pt-4 border-t border-gray-200">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-slate-800">Questions</h3>
                                        <button
                                            type="button"
                                            onClick={() => addQuestion(true)} // Pass true for edit form
                                            className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200"
                                        >
                                            Add Question
                                        </button>
                                    </div>

                                    {selectedAssessment.questions.map((q, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4 relative group">
                                            {selectedAssessment.questions.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(index, true)} // Pass true for edit form
                                                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XMarkIcon className="h-4 w-4" />
                                                </button>
                                            )}

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700">
                                                    Question {index + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={(e) => handleQuestionChange(index, 'question', e.target.value, true)}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">Options</label>
                                                {q.options.map((option, optIndex) => (
                                                    <div key={optIndex} className="flex items-center mb-2">
                                                        <input
                                                            type="text"
                                                            value={option}
                                                            onChange={(e) => {
                                                                const newOptions = [...q.options];
                                                                newOptions[optIndex] = e.target.value;
                                                                handleQuestionChange(index, 'options', newOptions, true);
                                                            }}
                                                            className="block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                            required={selectedAssessment.assessmentType === 'quiz'} // Options required for quiz
                                                            readOnly={selectedAssessment.assessmentType === 'survey'} // Readonly for survey default options
                                                        />
                                                        {selectedAssessment.assessmentType === 'quiz' && (
                                                            <div className="ml-2">
                                                                <input
                                                                    type="radio"
                                                                    name={`edit-correct-${index}`} // Unique name for edit form radios
                                                                    checked={q.correctOption === optIndex}
                                                                    onChange={() => handleQuestionChange(index, 'correctOption', optIndex, true)}
                                                                    className="form-radio h-4 w-4 text-blue-600"
                                                                    required
                                                                />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {selectedAssessment.assessmentType === 'quiz' && (
                                                    <div className="mt-2">
                                                        <label className="block text-sm font-medium text-slate-700">
                                                            Points for this question
                                                        </label>
                                                        <input
                                                            type="number"
                                                            value={q.points}
                                                            onChange={(e) => handleQuestionChange(index, 'points', Number(e.target.value), true)}
                                                            className="mt-1 block w-24 rounded-lg border border-gray-300 px-3 py-2"
                                                            min="0"
                                                            required
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {selectedAssessment.assessmentType === 'survey' && (
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`edit-allowComments-${index}`}
                                                        checked={q.allowComments}
                                                        onChange={(e) => handleQuestionChange(index, 'allowComments', e.target.checked, true)}
                                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor={`edit-allowComments-${index}`} className="ml-2 text-sm text-gray-700">
                                                        Allow additional comments for this question
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end space-x-4 pt-6 mt-6 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => { setShowEditForm(false); setSelectedAssessment(null); }}
                                        className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <LoadingSpinner size="small" className="mr-2" />
                                                Updating...
                                            </>
                                        ) : 'Update Assessment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Assessment List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assessments.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">Your Assessment Library is Empty</h3>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">Start by creating a new assessment to evaluate knowledge or gather feedback.</p>
                        </div>
                    ) : (
                        assessments.map((assessment) => (
                            <div
                                key={assessment._id}
                                className={`bg-white rounded-xl shadow-md border border-gray-100 overflow-visible transition-all duration-300 hover:shadow-lg hover:border-gray-200 transform hover:-translate-y-1 ${openMenuId === assessment._id ? 'relative z-10' : ''}`}>
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-lg font-semibold text-slate-800 flex-1 pr-4">{assessment.title}</h3>
                                        <div className="relative assessment-menu"> {/* Keep relative positioning here */}
                                            <button
                                                onClick={() => setOpenMenuId(openMenuId === assessment._id ? null : assessment._id)}
                                                className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                                                aria-label="Assessment options"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                                </svg>
                                            </button>
                                            {openMenuId === assessment._id && (
                                                <div
                                                    className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50" // This z-index is now relative to the card's z-10
                                                    style={{
                                                        transform: 'translateY(0)',
                                                        maxHeight: '90vh',
                                                        overflowY: 'auto'
                                                    }}
                                                >
                                                    <div className="py-1 divide-y divide-gray-100">
                                                        <div className="px-4 py-3 bg-gray-50 rounded-t-lg">
                                                            <p className="text-sm font-medium text-gray-900">Assessment Options</p>
                                                        </div>
                                                        <div>
                                                            <button
                                                                onClick={() => {
                                                                    handleEditAssessment(assessment);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <PencilIcon className="h-5 w-5 text-gray-500" />
                                                                <div>
                                                                    <div className="font-medium">Edit Assessment</div>
                                                                    <div className="text-xs text-gray-500">Modify assessment details and questions</div> {/* Updated description */}
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleShareAssessment(assessment._id);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <ShareIcon className="h-5 w-5 text-gray-500" />
                                                                <div>
                                                                    <div className="font-medium">Share Link</div>
                                                                    <div className="text-xs text-gray-500">Copy assessment URL to clipboard</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleViewResponses(assessment._id);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <EyeIcon className="h-5 w-5 text-gray-500" />
                                                                <div>
                                                                    <div className="font-medium">View Responses</div>
                                                                    <div className="text-xs text-gray-500">See all participant submissions</div>
                                                                </div>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    handleToggleStatus(assessment);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <DocumentDuplicateIcon className="h-5 w-5 text-gray-500" />
                                                                <div>
                                                                    <div className="font-medium">{assessment.isActive ? 'Disable' : 'Enable'} Assessment</div>
                                                                    <div className="text-xs text-gray-500">{assessment.isActive ? 'Prevent' : 'Allow'} new submissions</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAssessment(assessment);
                                                                    setShowDeleteConfirmation(true);
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                                            >
                                                                <TrashIcon className="h-5 w-5 text-red-500" />
                                                                <div>
                                                                    <div className="font-medium">Delete Assessment</div>
                                                                    <div className="text-xs text-red-500">This action cannot be undone</div>
                                                                </div>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 mb-4 line-clamp-2">{assessment.description}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <span className={`text-sm ${assessment.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'} px-2 py-1 rounded-full`}>
                                            {assessment.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                                            {assessment.assessmentType === 'survey' ? 'Survey' : 'Quiz'}
                                        </span>
                                        {assessment.timeLimit && (
                                            <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
                                                {assessment.timeLimit} min
                                            </span>
                                        )}
                                        {assessment.passingScore && (
                                            <span className="text-sm bg-green-50 text-green-700 px-2 py-1 rounded-full">
                                                Pass: {assessment.passingScore}%
                                            </span>
                                        )}
                                        <span className="text-sm bg-orange-50 text-orange-700 px-2 py-1 rounded-full">
                                            {assessment.questions.length} questions
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Delete confirmation modal */}
                {showDeleteConfirmation && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4">Delete Assessment</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this assessment? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => setShowDeleteConfirmation(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDeleteAssessment}
                                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete question confirmation modal */}
                {showDeleteQuestionConfirmation && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                            <h3 className="text-xl font-semibold text-slate-800 mb-4">Delete Question</h3>
                            <p className="text-gray-600 mb-6">
                                Are you sure you want to delete this question? This action cannot be undone.
                            </p>
                            <div className="flex justify-end space-x-4">
                                <button
                                    onClick={() => {
                                        setShowDeleteQuestionConfirmation(false);
                                        setQuestionToDeleteIndex(null);
                                        setIsEditingQuestion(false); // Reset flag on cancel
                                    }}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmRemoveQuestion}
                                    className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}