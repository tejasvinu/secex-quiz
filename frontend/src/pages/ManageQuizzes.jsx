import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import axios from 'axios';
import { XMarkIcon } from '@heroicons/react/24/solid';

// Create an axios instance with baseURL
const axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

export default function ManageQuizzes() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showDocumentUploadForm, setShowDocumentUploadForm] = useState(false);
    const [showTopicForm, setShowTopicForm] = useState(false);
    const [showImportForm, setShowImportForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [stats, setStats] = useState(null);
    const [topicLoading, setTopicLoading] = useState(false);
    const [documentLoading, setDocumentLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [createLoading, setCreateLoading] = useState(false);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [newQuiz, setNewQuiz] = useState({
        title: '',
        description: '',
        timePerQuestion: 20,
        questions: []
    });
    const [topicQuiz, setTopicQuiz] = useState({
        title: '',
        description: '',
        topic: '',
        timePerQuestion: 30,
        numQuestions: 10
    });
    const [documentUpload, setDocumentUpload] = useState({
        title: '',
        description: '',
        timePerQuestion: 30,
        numQuestions: 10,
        file: null
    });
    const [importQuiz, setImportQuiz] = useState({
        jsonContent: ''
    });
    const [openMenuId, setOpenMenuId] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown')) {
                setOpenMenuId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axiosInstance.get('/api/quiz/my-quizzes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuizzes(response.data);
        } catch (error) {
            toast.error('Failed to fetch quizzes');
        } finally {
            setLoading(false);
        }
    };

    const fetchQuizDetails = async (quizId) => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axiosInstance.get(`/api/quiz/${quizId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSelectedQuiz(response.data);
            setShowEditForm(true);
        } catch (error) {
            toast.error('Failed to fetch quiz details');
        }
    };

    const fetchQuizStats = async (quizId) => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axiosInstance.get(`/api/quiz/${quizId}/stats`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(response.data);
            setShowStats(true);
        } catch (error) {
            toast.error('Failed to fetch quiz statistics');
        }
    };

    const handleUpdateQuiz = async (e) => {
        e.preventDefault();
        setUpdateLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axiosInstance.put(`/api/quiz/${selectedQuiz._id}`, selectedQuiz, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Quiz updated successfully!');
            setShowEditForm(false);
            fetchQuizzes();
        } catch (error) {
            toast.error('Failed to update quiz');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDeleteQuiz = async (quizId) => {
        if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
            return;
        }
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axiosInstance.delete(`/api/quiz/${quizId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Quiz deleted successfully!');
            fetchQuizzes();
        } catch (error) {
            toast.error('Failed to delete quiz');
        }
    };

    const handleDuplicateQuiz = async (quizId) => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axiosInstance.post(`/api/quiz/${quizId}/duplicate`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Quiz duplicated successfully!');
            fetchQuizzes();
        } catch (error) {
            toast.error('Failed to duplicate quiz');
        }
    };

    const handleDocumentUpload = async (e) => {
        e.preventDefault();
        setDocumentLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const formData = new FormData();
            formData.append('document', documentUpload.file);
            formData.append('title', documentUpload.title);
            formData.append('description', documentUpload.description);
            formData.append('timePerQuestion', documentUpload.timePerQuestion);
            formData.append('numQuestions', documentUpload.numQuestions);

            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/quiz/create-from-document`,
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            toast.success('Quiz generated successfully!');
            setShowDocumentUploadForm(false);
            fetchQuizzes();
            setDocumentUpload({
                title: '',
                description: '',
                timePerQuestion: 30,
                numQuestions: 10,
                file: null
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to generate quiz from document');
        } finally {
            setDocumentLoading(false);
        }
    };

    const handleImportQuiz = async (e) => {
        e.preventDefault();
        setImportLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            let quizData;
            try {
                quizData = JSON.parse(importQuiz.jsonContent);
            } catch (error) {
                toast.error('Invalid JSON format');
                return;
            }

            await axiosInstance.post('/api/quiz/import-json',
                { quiz: quizData },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('Quiz imported successfully!');
            setShowImportForm(false);
            fetchQuizzes();
            setImportQuiz({ jsonContent: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to import quiz');
        } finally {
            setImportLoading(false);
        }
    };

    const addQuestion = () => {
        setNewQuiz(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    question: '',
                    options: ['', '', '', ''],
                    correctOption: 0,
                    points: 1
                }
            ]
        }));
    };

    const updateQuestion = (index, field, value) => {
        setNewQuiz(prev => {
            const questions = [...prev.questions];
            questions[index] = { ...questions[index], [field]: value };
            return { ...prev, questions };
        });
    };

    const updateOption = (questionIndex, optionIndex, value) => {
        setNewQuiz(prev => {
            const questions = [...prev.questions];
            const options = [...questions[questionIndex].options];
            options[optionIndex] = value;
            questions[questionIndex] = { ...questions[questionIndex], options };
            return { ...prev, questions };
        });
    };

    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        setCreateLoading(true);
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axiosInstance.post('/api/quiz', newQuiz, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Quiz created successfully!');
            setShowCreateForm(false);
            fetchQuizzes();
            setNewQuiz({
                title: '',
                description: '',
                timePerQuestion: 20,
                questions: []
            });
        } catch (error) {
            toast.error('Failed to create quiz');
        } finally {
            setCreateLoading(false);
        }
    };

    const handleCreateTopicQuiz = async (e) => {
        e.preventDefault();
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            setTopicLoading(true);
            await axiosInstance.post('/api/quiz/create-from-topic', topicQuiz, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Topic Quiz created successfully!');
            setShowTopicForm(false);
            fetchQuizzes();
            setTopicQuiz({
                title: '',
                description: '',
                topic: '',
                timePerQuestion: 30,
                numQuestions: 10
            });
        } catch (error) {
            toast.error('Failed to create topic quiz');
        } finally {
            setTopicLoading(false);
        }
    };

    const startGame = async (quizId) => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axiosInstance.post(
                `/api/quiz/${quizId}/start-game`,
                {},
                { headers: { Authorization: `Bearer ${token}` }}
            );
            navigate(`/host-game/${response.data.sessionId}`, {
                state: { gameCode: response.data.code }
            });
        } catch (error) {
            toast.error('Failed to start game');
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
                    <h1 className="text-3xl font-bold text-slate-800">My Assessment Library</h1>
                    <div className="space-x-4">
                        <button
                            onClick={() => setShowTopicForm(true)}
                            className="btn-secondary px-4 py-2"
                        >
                            Topic Quiz
                        </button>
                        <button
                            onClick={() => setShowDocumentUploadForm(true)}
                            className="btn-secondary px-4 py-2"
                        >
                            Upload Document
                        </button>
                        <button
                            onClick={() => setShowImportForm(true)}
                            className="btn-secondary px-4 py-2"
                        >
                            Import Assessment
                        </button>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="btn-primary px-4 py-2"
                        >
                            Create New Assessment
                        </button>
                    </div>
                </div>

                {showTopicForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setShowTopicForm(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                aria-label="Close topic quiz form"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Generate Quiz from Topic</h2>
                            <form onSubmit={handleCreateTopicQuiz} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Title</label>
                                    <input
                                        type="text"
                                        value={topicQuiz.title}
                                        onChange={(e) => setTopicQuiz(prev => ({ ...prev, title: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        placeholder="Enter quiz title"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        value={topicQuiz.description}
                                        onChange={(e) => setTopicQuiz(prev => ({ ...prev, description: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        rows="2"
                                        placeholder="Enter quiz description"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Topic</label>
                                    <textarea
                                        value={topicQuiz.topic}
                                        onChange={(e) => setTopicQuiz(prev => ({ ...prev, topic: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        rows="3"
                                        placeholder="Enter the topic or concept you want to create a quiz about. Be as specific as possible."
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Time per question (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            value={topicQuiz.timePerQuestion}
                                            onChange={(e) => setTopicQuiz(prev => ({ ...prev, timePerQuestion: parseInt(e.target.value) }))}
                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                            min="5"
                                            max="300"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Number of Questions
                                        </label>
                                        <input
                                            type="number"
                                            value={topicQuiz.numQuestions}
                                            onChange={(e) => setTopicQuiz(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                            min="5"
                                            max="50"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowTopicForm(false)}
                                        className="btn-secondary px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-4 py-2 min-w-[150px] flex justify-center items-center"
                                        disabled={!topicQuiz.topic || topicLoading}
                                    >
                                        {topicLoading ? (
                                            <LoadingSpinner size="small" color="white" />
                                        ) : (
                                            'Generate Quiz'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showDocumentUploadForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setShowDocumentUploadForm(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                aria-label="Close document upload form"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Generate Quiz from Document</h2>
                            <form onSubmit={handleDocumentUpload} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Title</label>
                                    <input
                                        type="text"
                                        value={documentUpload.title}
                                        onChange={(e) => setDocumentUpload(prev => ({ ...prev, title: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        value={documentUpload.description}
                                        onChange={(e) => setDocumentUpload(prev => ({ ...prev, description: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        rows="3"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Time per question (seconds)
                                        </label>
                                        <input
                                            type="number"
                                            value={documentUpload.timePerQuestion}
                                            onChange={(e) => setDocumentUpload(prev => ({ ...prev, timePerQuestion: parseInt(e.target.value) }))}
                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                            min="5"
                                            max="300"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">
                                            Number of Questions
                                        </label>
                                        <input
                                            type="number"
                                            value={documentUpload.numQuestions}
                                            onChange={(e) => setDocumentUpload(prev => ({ ...prev, numQuestions: parseInt(e.target.value) }))}
                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                            min="5"
                                            max="50"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Upload Document</label>
                                    <input
                                        type="file"
                                        onChange={(e) => setDocumentUpload(prev => ({ ...prev, file: e.target.files[0] }))}
                                        className="mt-1 block w-full"
                                        accept=".pdf,.txt,.docx"
                                        required
                                    />
                                    <p className="mt-1 text-sm text-slate-500">
                                        Supported formats: PDF, TXT, DOCX (Max 5MB)
                                    </p>
                                </div>
                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowDocumentUploadForm(false)}
                                        className="btn-secondary px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-4 py-2 min-w-[150px] flex justify-center items-center"
                                        disabled={!documentUpload.file || documentLoading}
                                    >
                                        {documentLoading ? (
                                            <LoadingSpinner size="small" color="white" />
                                        ) : (
                                            'Generate Quiz'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showImportForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setShowImportForm(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                aria-label="Close import form"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Import Quiz from JSON</h2>
                            <form onSubmit={handleImportQuiz} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">JSON Content</label>
                                    <textarea
                                        value={importQuiz.jsonContent}
                                        onChange={(e) => setImportQuiz(prev => ({ ...prev, jsonContent: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono"
                                        rows="10"
                                        placeholder='{
  "title": "Quiz Title",
  "description": "Quiz Description",
  "timePerQuestion": 30,
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctOption": 0
    }
  ]
}'
                                        required
                                    />
                                </div>
                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowImportForm(false)}
                                        className="btn-secondary px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-4 py-2 min-w-[150px] flex justify-center items-center"
                                        disabled={!importQuiz.jsonContent || importLoading}
                                    >
                                        {importLoading ? (
                                            <LoadingSpinner size="small" color="white" />
                                        ) : (
                                            'Import Quiz'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showCreateForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                aria-label="Close create form"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Create New Quiz</h2>
                            <form onSubmit={handleCreateQuiz} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Title</label>
                                    <input
                                        type="text"
                                        value={newQuiz.title}
                                        onChange={(e) => setNewQuiz(prev => ({ ...prev, title: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        value={newQuiz.description}
                                        onChange={(e) => setNewQuiz(prev => ({ ...prev, description: e.target.value }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        rows="3"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">
                                        Time per question (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        value={newQuiz.timePerQuestion}
                                        onChange={(e) => setNewQuiz(prev => ({ ...prev, timePerQuestion: parseInt(e.target.value) }))}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        min="5"
                                        max="300"
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-slate-800">Questions</h3>
                                        <button
                                            type="button"
                                            onClick={addQuestion}
                                            className="btn-secondary px-3 py-1"
                                        >
                                            Add Question
                                        </button>
                                    </div>

                                    {newQuiz.questions.map((q, qIndex) => (
                                        <div key={qIndex} className="bg-gray-50 p-4 rounded-lg space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700">
                                                    Question {qIndex + 1}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={q.question}
                                                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                    required
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex}>
                                                        <label className="block text-sm font-medium text-slate-700">
                                                            Option {optIndex + 1}
                                                            {optIndex === q.correctOption && ' (Correct)'}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => updateOption(qIndex, optIndex, e.target.value)}
                                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                            required
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700">
                                                    Correct Option
                                                </label>
                                                <select
                                                    value={q.correctOption}
                                                    onChange={(e) => updateQuestion(qIndex, 'correctOption', parseInt(e.target.value))}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                    required
                                                >
                                                    {q.options.map((_, index) => (
                                                        <option key={index} value={index}>
                                                            Option {index + 1}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="btn-secondary px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-4 py-2 min-w-[150px] flex justify-center items-center"
                                        disabled={newQuiz.questions.length === 0 || createLoading}
                                    >
                                        {createLoading ? (
                                            <LoadingSpinner size="small" color="white" />
                                        ) : (
                                            'Create Quiz'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showEditForm && selectedQuiz && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setShowEditForm(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                aria-label="Close edit form"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Edit Quiz</h2>
                            <form onSubmit={handleUpdateQuiz} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Title</label>
                                    <input
                                        type="text"
                                        value={selectedQuiz.title}
                                        onChange={(e) => setSelectedQuiz({...selectedQuiz, title: e.target.value})}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        value={selectedQuiz.description}
                                        onChange={(e) => setSelectedQuiz({...selectedQuiz, description: e.target.value})}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        rows="3"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">
                                        Time per question (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        value={selectedQuiz.timePerQuestion}
                                        onChange={(e) => setSelectedQuiz({...selectedQuiz, timePerQuestion: parseInt(e.target.value)})}
                                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                        min="5"
                                        max="300"
                                        required
                                    />
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-medium text-slate-800">Questions</h3>
                                    </div>

                                    {selectedQuiz.questions.map((q, qIndex) => (
                                        <div key={qIndex} className="bg-gray-50 p-4 rounded-lg space-y-4">
                                            <div className="flex justify-between">
                                                <label className="block text-sm font-medium text-slate-700">
                                                    Question {qIndex + 1}
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const questions = [...selectedQuiz.questions];
                                                        questions.splice(qIndex, 1);
                                                        setSelectedQuiz({...selectedQuiz, questions});
                                                    }}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={q.question}
                                                onChange={(e) => {
                                                    const questions = [...selectedQuiz.questions];
                                                    questions[qIndex] = {...questions[qIndex], question: e.target.value};
                                                    setSelectedQuiz({...selectedQuiz, questions});
                                                }}
                                                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                required
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                {q.options.map((opt, optIndex) => (
                                                    <div key={optIndex}>
                                                        <label className="block text-sm font-medium text-slate-700">
                                                            Option {optIndex + 1}
                                                            {optIndex === q.correctOption && ' (Correct)'}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={opt}
                                                            onChange={(e) => {
                                                                const questions = [...selectedQuiz.questions];
                                                                const options = [...questions[qIndex].options];
                                                                options[optIndex] = e.target.value;
                                                                questions[qIndex] = {...questions[qIndex], options};
                                                                setSelectedQuiz({...selectedQuiz, questions});
                                                            }}
                                                            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                            required
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-slate-700">
                                                    Correct Option
                                                </label>
                                                <select
                                                    value={q.correctOption}
                                                    onChange={(e) => {
                                                        const questions = [...selectedQuiz.questions];
                                                        questions[qIndex] = {...questions[qIndex], correctOption: parseInt(e.target.value)};
                                                        setSelectedQuiz({...selectedQuiz, questions});
                                                    }}
                                                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2"
                                                    required
                                                >
                                                    {q.options.map((_, index) => (
                                                        <option key={index} value={index}>
                                                            Option {index + 1}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                    
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const questions = [...selectedQuiz.questions];
                                            questions.push({
                                                question: '',
                                                options: ['', '', '', ''],
                                                correctOption: 0,
                                                points: 1
                                            });
                                            setSelectedQuiz({...selectedQuiz, questions});
                                        }}
                                        className="btn-secondary px-3 py-1"
                                    >
                                        Add Question
                                    </button>
                                </div>

                                <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowEditForm(false)}
                                        className="btn-secondary px-4 py-2"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-4 py-2 min-w-[150px] flex justify-center items-center"
                                        disabled={updateLoading}
                                    >
                                        {updateLoading ? (
                                            <LoadingSpinner size="small" color="white" />
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showStats && stats && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto relative">
                            <button
                                onClick={() => setShowStats(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                                aria-label="Close statistics"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 mb-6">Quiz Statistics</h2>
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div className="bg-blue-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-blue-800">Total Games</h3>
                                    <p className="text-3xl font-bold text-blue-600">{stats.totalGames}</p>
                                </div>
                                <div className="bg-green-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-green-800">Total Participants</h3>
                                    <p className="text-3xl font-bold text-green-600">{stats.totalParticipants}</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-purple-800">Average Score</h3>
                                    <p className="text-3xl font-bold text-purple-600">{stats.averageScore}</p>
                                </div>
                                <div className="bg-orange-50 p-4 rounded-lg">
                                    <h3 className="text-lg font-semibold text-orange-800">Average Accuracy</h3>
                                    <p className="text-3xl font-bold text-orange-600">{stats.averageAccuracy}%</p>
                                </div>
                            </div>

                            <h3 className="text-xl font-semibold text-slate-800 mb-4">Question Statistics</h3>
                            <div className="space-y-4">
                                {stats.questionStats.map((stat, index) => (
                                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="font-medium text-slate-700">Question {stat.questionNumber}</h4>
                                            <span className="text-sm text-slate-500">{stat.totalAttempts} attempts</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                                            <div
                                                className="bg-blue-600 h-2.5 rounded-full"
                                                style={{ width: `${stat.correctPercentage}%` }}
                                            ></div>
                                        </div>
                                        <p className="text-sm text-slate-600 mt-1">{stat.correctPercentage}% correct</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex justify-end pt-4 border-t border-gray-200">
                                <button
                                    onClick={() => setShowStats(false)}
                                    className="btn-secondary px-4 py-2"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.length === 0 ? (
                        <div className="col-span-full py-16 text-center bg-white rounded-xl shadow-sm border border-gray-100">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-slate-700 mb-2">Your Assessment Library is Empty</h3>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">Start by creating a new assessment manually, generating one from a topic or document, or importing an existing one.</p>
                            <div className="flex justify-center space-x-4">
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="btn-primary px-5 py-2 transition-all duration-300 transform hover:scale-105"
                                >
                                    Create New
                                </button>
                                <button
                                    onClick={() => setShowTopicForm(true)}
                                    className="btn-secondary px-5 py-2 transition-all duration-300 transform hover:scale-105"
                                >
                                    Generate from Topic
                                </button>
                            </div>
                        </div>
                    ) : (
                        quizzes.map((quiz) => (
                            <div
                                key={quiz._id}
                                className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-gray-200 transform hover:-translate-y-1 flex flex-col"
                            >
                                <div className="p-6 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-semibold text-slate-800 hover:text-blue-600 transition-colors duration-200">{quiz.title}</h3>
                                        <div className="dropdown relative">
                                            <button 
                                                className={`p-1.5 rounded-full transition-colors duration-200 ${
                                                    openMenuId === quiz._id ? 'bg-gray-100' : 'hover:bg-gray-100'
                                                }`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenuId(openMenuId === quiz._id ? null : quiz._id);
                                                }}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                </svg>
                                            </button>
                                            <div 
                                                className={`dropdown-menu origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none transition-all duration-200 ${
                                                    openMenuId === quiz._id 
                                                        ? 'transform opacity-100 scale-100' 
                                                        : 'transform opacity-0 scale-95 pointer-events-none'
                                                }`}
                                            >
                                                <div className="py-1">
                                                    <button 
                                                        onClick={() => {
                                                            fetchQuizDetails(quiz._id);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                                                    >
                                                        Edit Assessment
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            handleDuplicateQuiz(quiz._id);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                                                    >
                                                        Duplicate Assessment
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            fetchQuizStats(quiz._id);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                                                    >
                                                        View Analytics
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            handleDeleteQuiz(quiz._id);
                                                            setOpenMenuId(null);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                                                    >
                                                        Delete Assessment
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-slate-600 mb-4 line-clamp-2">{quiz.description}</p>
                                    {quiz.sourceDocument && (
                                        <div className="flex items-center mb-3 text-sm text-slate-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 00-2-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="truncate" title={quiz.sourceDocument.name}>
                                                {quiz.sourceDocument.name}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex flex-wrap gap-2 mb-5">
                                        <span className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded-full flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {quiz.questions.length} questions
                                        </span>
                                        <span className="text-sm bg-purple-50 text-purple-700 px-2 py-1 rounded-full flex items-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {quiz.timePerQuestion}s per question
                                        </span>
                                        {quiz.isAiGenerated && (
                                            <span className="text-sm bg-green-50 text-green-700 px-2 py-1 rounded-full flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                </svg>
                                                AI Generated
                                            </span>
                                        )}
                                        {new Date(quiz.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                                            <span className="text-sm bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                </svg>
                                                New
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 border-t border-gray-100 flex">
                                    <button
                                        onClick={() => startGame(quiz._id)}
                                        className="btn-gradient flex-1 py-2 text-sm font-medium flex items-center justify-center transition-all duration-300 hover:opacity-90"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Begin Session
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}