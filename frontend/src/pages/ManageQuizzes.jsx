import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navigation from '../components/Navigation';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import axios from 'axios';

export default function ManageQuizzes() {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newQuiz, setNewQuiz] = useState({
        title: '',
        description: '',
        timePerQuestion: 20,
        questions: []
    });
    const navigate = useNavigate();

    useEffect(() => {
        fetchQuizzes();
    }, []);

    const fetchQuizzes = async () => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.get('http://localhost:5000/api/quiz/my-quizzes', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuizzes(response.data);
        } catch (error) {
            toast.error('Failed to fetch quizzes');
        } finally {
            setLoading(false);
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
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            await axios.post('http://localhost:5000/api/quiz', newQuiz, {
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
        }
    };

    const startGame = async (quizId) => {
        try {
            const token = JSON.parse(localStorage.getItem('user')).token;
            const response = await axios.post(
                `http://localhost:5000/api/quiz/${quizId}/start-game`,
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
                    <h1 className="text-3xl font-bold text-slate-800">My Quizzes</h1>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn-primary px-4 py-2"
                    >
                        Create New Quiz
                    </button>
                </div>

                {showCreateForm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Create New Quiz</h2>
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

                                <div className="flex justify-end space-x-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-slate-700 hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-4 py-2"
                                        disabled={newQuiz.questions.length === 0}
                                    >
                                        Create Quiz
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quizzes.map((quiz) => (
                        <div key={quiz._id} className="card">
                            <h3 className="text-xl font-semibold text-slate-800 mb-2">{quiz.title}</h3>
                            <p className="text-slate-600 mb-4">{quiz.description}</p>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-500">
                                    {quiz.questions.length} questions
                                </span>
                                <button
                                    onClick={() => startGame(quiz._id)}
                                    className="btn-primary px-4 py-2"
                                >
                                    Start Game
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
}