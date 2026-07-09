import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/AuthContext';
import Login from './pages/Login';
import PickPerson from './pages/PickPerson';
import Dashboard from './pages/Dashboard';
import SectionDetail from './pages/SectionDetail';
import CreateSection from './pages/CreateSection';
import Stats from './pages/Stats';
import Settings from './pages/Settings';

function ProtectedRoute({ children }) {
  const { person } = useAuth();
  if (!person) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/pick-person" element={<PickPerson />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/section/:id" element={<ProtectedRoute><SectionDetail /></ProtectedRoute>} />
      <Route path="/section/new" element={<ProtectedRoute><CreateSection /></ProtectedRoute>} />
      <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
