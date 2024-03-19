import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './HomePage.js';
import JoinPDFPage from './JoinPDFPage.js';
import 'tailwindcss/tailwind.css';
// Import other utility pages similarly

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/join-pdf" element={<JoinPDFPage />} />
      </Routes>
    </Router>
  );
}

export default App;
