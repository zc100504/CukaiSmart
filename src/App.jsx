import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import StyleGuide from './pages/StyleGuide.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients from './pages/Clients.jsx';
import Upload from './pages/Upload.jsx';
import ReviewQueue from './pages/ReviewQueue.jsx';
import Processing from './pages/Processing.jsx';
import Review from './pages/Review.jsx';
import Compliance from './pages/Compliance.jsx';
import Finish from './pages/Finish.jsx';
import Records from './pages/Records.jsx';
import Settings from './pages/Settings.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/style-guide" element={<StyleGuide />} />

      {/* Signed-in app (AppLayout redirects to /login when signed out) */}
      <Route path="/app" element={<AppLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="upload" element={<Upload />} />
        <Route path="review-queue" element={<ReviewQueue />} />
        <Route path="documents/:id/processing" element={<Processing />} />
        <Route path="documents/:id/review" element={<Review />} />
        <Route path="documents/:id/compliance" element={<Compliance />} />
        <Route path="documents/:id/finish" element={<Finish />} />
        <Route path="records" element={<Records />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
