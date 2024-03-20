import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage.js';
import JoinPDFPage from './pages/JoinPDFPage.js';
import Base64Decode from './pages/Base64Decode.js';
import JWTDecoder from './pages/JWTDecoder.js';
import 'tailwindcss/tailwind.css';
// Import other utility pages similarly

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join-pdf" element={<JoinPDFPage />} />
        <Route path="/base64decode" element={<Base64Decode />} />
        <Route path="/jwtDecoder" element={<JWTDecoder />} />
      </Routes>
    </Router>
  );
}

export default App;
