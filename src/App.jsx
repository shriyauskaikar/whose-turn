import { Routes, Route, Navigate } from 'react-router-dom';
import { useIdentity } from './lib/IdentityContext';
import WhoAreYou from './pages/WhoAreYou';
import Dashboard from './pages/Dashboard';
import SectionDetail from './pages/SectionDetail';
import CreateSection from './pages/CreateSection';
import Stats from './pages/Stats';

function ProtectedRoute({ children }) {
  const { person } = useIdentity();
  if (!person) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WhoAreYou />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/section/:id" element={<ProtectedRoute><SectionDetail /></ProtectedRoute>} />
      <Route path="/section/new" element={<ProtectedRoute><CreateSection /></ProtectedRoute>} />
      <Route path="/stats" element={<ProtectedRoute><Stats /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
