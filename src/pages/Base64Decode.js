import React, { useState } from 'react';

function Base64Decode() {
  const [input, setInput] = useState('');
  const [decoded, setDecoded] = useState('');
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const value = e.target.value;
    setInput(value);

    try {
      const decodedValue = atob(value); // Decode from base64
      setDecoded(decodedValue);
      setError(''); // Clear any previous error
    } catch (err) {
      setDecoded(''); // Clear previous decoded value
      setError('Invalid base64 string'); // Set error message
    }
  };

  return (
    <div>
      <textarea 
        rows="4"
        value={input} 
        onChange={handleChange} 
        placeholder="Enter base64 string"
      />
      {decoded && <div>{decoded}</div>}
      {error && <div style={{color: 'red'}}>{error}</div>}
    </div>
  );
}

export default Base64Decode;