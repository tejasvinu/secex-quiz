import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import ManageQuizzes from './pages/ManageQuizzes';
import ManageAssessments from './pages/ManageAssessments';
import TakeAssessment from './pages/TakeAssessment';
import HostGame from './pages/HostGame';
import JoinGame from './pages/JoinGame';
import PlayGame from './pages/PlayGame';
import AssessmentResponses from './pages/AssessmentResponses';
import { useAuth } from './context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

function AppContent() {
  const location = useLocation();

  return (
    <TransitionGroup>
      <CSSTransition key={location.key} classNames="page" timeout={300}>
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join-game" element={<JoinGame />} />
          <Route path="/play-game/:sessionId" element={<PlayGame />} />
          <Route path="/take-assessment/:id" element={<TakeAssessment />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/manage-quizzes"
            element={
              <PrivateRoute>
                <ManageQuizzes />
              </PrivateRoute>
            }
          />
          <Route
            path="/manage-assessments"
            element={
              <PrivateRoute>
                <ManageAssessments />
              </PrivateRoute>
            }
          />
          <Route
            path="/host-game/:sessionId"
            element={
              <PrivateRoute>
                <HostGame />
              </PrivateRoute>
            }
          />
          <Route
            path="/assessment/:id/responses"
            element={
              <PrivateRoute>
                <AssessmentResponses />
              </PrivateRoute>
            }
          />
        </Routes>
      </CSSTransition>
    </TransitionGroup>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#fff',
                color: '#333',
              },
              success: {
                className: 'border-l-4 border-green-500',
                duration: 3000,
              },
              error: {
                className: 'border-l-4 border-red-500',
                duration: 4000,
              }
            }}
          />
          <AppContent />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
