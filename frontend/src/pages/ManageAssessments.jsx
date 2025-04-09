import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// Import icons and toast
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon, ShareIcon, EyeIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Navigation from '../components/Navigation';
// Import ConfirmationModal if you create one, or handle confirmation inline
// import ConfirmationModal from '../components/ConfirmationModal'; // Example import

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
    const [isEditingQuestion, setIsEditingQuestion] = useState(false); // Track if deleting from edit modal

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
            toast.error('Failed to load assessments.'); // Add toast
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
        const loadingToast = toast.loading('Creating assessment...'); // Add loading toast
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
            toast.success('Assessment created successfully!', { id: loadingToast }); // Success toast
        } catch (error) {
            console.error('Failed to create assessment:', error);
            toast.error('Failed to create assessment. Please try again.', { id: loadingToast }); // Error toast
        } finally {
            setSubmitting(false);
        }
    };

    const handleViewResponses = (assessmentId) => {
        navigate(`/assessment/${assessmentId}/responses`);
    };

    const handleShareAssessment = (assessmentId) => {
        const url = `${window.location.origin}/take-assessment/${assessmentId}`;
        navigator.clipboard.writeText(url)
            .then(() => toast.success('Assessment link copied to clipboard!')) // Use toast
            .catch((err) => toast.error('Failed to copy link: ' + err)); // Use toast
    };

    const handleEditAssessment = (assessment) => {
        setSelectedAssessment(assessment);
        setShowEditForm(true);
    };

    const handleUpdateAssessment = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const loadingToast = toast.loading('Updating assessment...'); // Add loading toast
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axios.put(
                `${import.meta.env.VITE_API_URL}/api/assessment/${selectedAssessment._id}`,
                selectedAssessment,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setShowEditForm(false);
            setSelectedAssessment(null);
            fetchAssessments();
            toast.success('Assessment updated successfully!', { id: loadingToast }); // Success toast
        } catch (error) {
            console.error('Failed to update assessment:', error);
            toast.error('Failed to update assessment. Please try again.', { id: loadingToast }); // Error toast
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteAssessment = async () => {
        setSubmitting(true);
        const loadingToast = toast.loading('Deleting assessment...'); // Add loading toast
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
            toast.success('Assessment deleted successfully!', { id: loadingToast }); // Success toast
        } catch (error) {
            console.error('Failed to delete assessment:', error);
            toast.error('Failed to delete assessment. Please try again.', { id: loadingToast }); // Error toast
        } finally {
            setSubmitting(false);
        }
    };

    const removeQuestion = (index) => {
        // Prevent removing the last question
        if (newAssessment.questions.length <= 1) {
            toast.error("An assessment must have at least one question.");
            return;
        }
        setQuestionToDeleteIndex(index);
        setIsEditingQuestion(false); // Deleting from create modal
        setShowDeleteQuestionConfirmation(true);
    };

    const removeQuestionFromEdit = (index) => {
        // Prevent removing the last question
        if (selectedAssessment.questions.length <= 1) {
            toast.error("An assessment must have at least one question.");
            return;
        }
        setQuestionToDeleteIndex(index);
        setIsEditingQuestion(true); // Deleting from edit modal
        setShowDeleteQuestionConfirmation(true);
    };

    const confirmRemoveQuestion = () => {
        const index = questionToDeleteIndex;
        if (index === null) return;

        if (isEditingQuestion) {
            setSelectedAssessment(prev => ({
                ...prev,
                questions: prev.questions.filter((_, i) => i !== index)
            }));
        } else {
            setNewAssessment(prev => ({
                ...prev,
                questions: prev.questions.filter((_, i) => i !== index)
            }));
        }
        setShowDeleteQuestionConfirmation(false);
        setQuestionToDeleteIndex(null);
        toast.success('Question removed.');
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50"> {/* Subtle gradient background */}
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

                {/* Create Form Modal */}
                {showCreateForm && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-enter">
                            {/* ... modal content ... */}
                             <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-semibold text-slate-800">Create New Assessment</h2>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
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
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4 relative group"> {/* Added relative and group */}
                                            {/* Remove Button - appears on hover */}
                                            {newAssessment.questions.length > 1 && ( // Only show if more than one question
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestion(index)}
                                                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-red-200"
                                                    title="Remove Question"
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

                                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6"> {/* Improved spacing and border */}
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
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

                {/* Edit Form Modal (similar styling improvements as Create) */}
                {showEditForm && selectedAssessment && (
                     <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-enter">
                           {/* ... modal content ... */}
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-2xl font-semibold text-slate-800">Edit Assessment</h2>
                                <button
                                    onClick={() => setShowEditForm(false)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
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

                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium text-slate-800">Questions</h3>
                                    {selectedAssessment.questions.map((q, index) => (
                                        <div key={index} className="bg-gray-50 p-4 rounded-lg space-y-4 relative group"> {/* Added relative and group */}
                                             {/* Remove Button - appears on hover */}
                                             {selectedAssessment.questions.length > 1 && ( // Only show if more than one question
                                                <button
                                                    type="button"
                                                    onClick={() => removeQuestionFromEdit(index)}
                                                    className="absolute top-2 right-2 p-1 bg-red-100 text-red-600 rounded-full opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity duration-200 hover:bg-red-200"
                                                    title="Remove Question"
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
                                                    onChange={(e) => {
                                                        const questions = [...selectedAssessment.questions];
                                                        questions[index] = { ...questions[index], question: e.target.value };
                                                        setSelectedAssessment(prev => ({ ...prev, questions }));
                                                    }}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditForm(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <LoadingSpinner size="small" className="mr-2" />
                                                Saving...
                                            </>
                                         ) : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal (improved styling) */}
                {showDeleteConfirmation && selectedAssessment && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-enter">
                            <div className="sm:flex sm:items-start">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                    <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
                                </div>
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Delete Assessment
                                    </h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500">
                                            Are you sure you want to delete "{selectedAssessment.title}"? This action cannot be undone. All associated responses will also be deleted.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                                <button
                                    type="button"
                                    onClick={handleDeleteAssessment}
                                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 transition-colors"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirmation(false)}
                                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Question Confirmation Modal (Simple Example) */}
                {showDeleteQuestionConfirmation && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[60] transition-opacity duration-300 ease-in-out"> {/* Higher z-index */}
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-enter">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Remove Question?</h3>
                            <p className="text-sm text-gray-500 mb-6">
                                Are you sure you want to remove this question?
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteQuestionConfirmation(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmRemoveQuestion}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assessment Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assessments.map((assessment) => (
                        <div
                            key={assessment._id}
                            className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col" // Added flex-col
                        >
                            <div className="p-6 flex-grow"> {/* Added flex-grow */}
                                <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">{assessment.title}</h3>
                                <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-grow">{assessment.description}</p> {/* Added flex-grow */}
                                <div className="flex items-center text-xs text-gray-500 mb-4">
                                    <DocumentDuplicateIcon className="h-4 w-4 mr-1.5 text-gray-400" />
                                    {assessment.questions.length} questions
                                </div>
                            </div>
                            {/* Actions Footer */}
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 border-t border-gray-100">
                                <div className="flex flex-wrap justify-start gap-2">
                                    <button
                                        onClick={() => handleViewResponses(assessment._id)}
                                        className="inline-flex items-center gap-x-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                                    >
                                        <EyeIcon className="h-4 w-4 text-gray-500" /> Responses
                                    </button>
                                    <button
                                        onClick={() => handleShareAssessment(assessment._id)}
                                        className="inline-flex items-center gap-x-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                                    >
                                        <ShareIcon className="h-4 w-4 text-gray-500" /> Share
                                    </button>
                                    <button
                                        onClick={() => handleEditAssessment(assessment)}
                                        className="inline-flex items-center gap-x-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                                    >
                                        <PencilIcon className="h-4 w-4 text-gray-500" /> Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelectedAssessment(assessment);
                                            setShowDeleteConfirmation(true);
                                        }}
                                        className="inline-flex items-center gap-x-1 rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-red-600 shadow-sm ring-1 ring-inset ring-red-200 hover:bg-red-50 transition-colors"
                                    >
                                        <TrashIcon className="h-4 w-4" /> Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Empty State */}
                {assessments.length === 0 && !loading && (
                    <div className="text-center py-16 px-6 bg-white rounded-lg shadow-sm border border-gray-100 mt-8">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <h3 className="mt-4 text-lg font-semibold text-slate-800">No Assessments Found</h3>
                        <p className="mt-1 text-sm text-gray-500">Get started by creating a new assessment.</p>
                        <div className="mt-6">
                            <button
                                onClick={() => setShowCreateForm(true)}
                                type="button"
                                className="inline-flex items-center gap-x-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
                            >
                                <PlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
                                Create New Assessment
                            </button>
                        </div>
                    </div>
                )}
            </main>
            {/* Add CSS for modal animation */}
            <style>{`
                @keyframes modal-enter {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
                .animate-modal-enter { animation: modal-enter 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}