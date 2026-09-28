import { Navigate, Route, Routes } from 'react-router-dom';
import StyleGuide from './pages/StyleGuide.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/style-guide" element={<StyleGuide />} />
      {/* Temporary until the landing page is built */}
      <Route path="*" element={<Navigate to="/style-guide" replace />} />
    </Routes>
  );
}
