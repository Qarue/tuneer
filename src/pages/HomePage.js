// HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Assuming CSS modules

const HomePage = () => {
    return (
        <div className="homePage">
            <Link to="/join-pdf" className="utilityTile">Join PDF</Link>
            <Link to="/base64decode" className="utilityTile">Base64 Decode</Link>
            <Link to="/jwtDecoder" className="utilityTile">JWT Decode</Link>
            <Link to="/split-pdf" className="utilityTile">Split PDF</Link>
        </div>
    );
}

export default HomePage;
