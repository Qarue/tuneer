// HomePage.js
import React from 'react';
import { Link } from 'react-router-dom';
import './HomePage.css'; // Assuming CSS modules

const HomePage = () => {
    return (
        <div className="homePage">
            <Link to="/join-pdf" className="utilityTile">Join PDF</Link>
            {/* Repeat for other utilities */}
        </div>
    );
}

export default HomePage;
