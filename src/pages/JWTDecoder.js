import React, { useState } from 'react';

function JWTDecoder() {
  const [input, setInput] = useState('');
  const [decodedPayload, setDecodedPayload] = useState('');
  const [error, setError] = useState('');

  const decodeJWT = (jwt) => {
    try {
      const base64Url = jwt.split('.')[1]; // Get payload segment
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/'); // Convert to base64
      const payload = decodeURIComponent(atob(base64).split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(payload);
    } catch (err) {
      setError('Invalid JWT Token');
      return null;
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);
    const decoded = decodeJWT(value);
    if (decoded) {
      setDecodedPayload(JSON.stringify(decoded, null, 2)); // Format JSON with 2 space indentation
      setError('');
    } else {
      setDecodedPayload('');
    }
  };

  return (
    <div>
      <textarea 
        value={input} 
        onChange={handleChange} 
        placeholder="Enter JWT Token"
        style={{ width: '100%', height: '100px' }}
      />
      {decodedPayload && (
        <pre style={{ background: '#f0f0f0', color: '#003300', padding: '10px', marginTop: '10px' }}>
          {decodedPayload}
        </pre>
      )}
      {error && <div style={{color: 'red'}}>{error}</div>}
    </div>
  );
}

export default JWTDecoder;
