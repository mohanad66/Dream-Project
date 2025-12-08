// src/components/RealtimeComponent.jsx
import React, { useState, useEffect } from 'react';
import useWebSocket from '../hooks/useWebSocket';

// The WebSocket URL should point to your Django Channels endpoint
const WS_URL = 'ws://127.0.0.1:8000/ws/some_path/';

function RealtimeComponent() {
  const [message, setMessage] = useState('');
  const [received, setReceived] = useState([]);
  const { lastMessage, sendMessage } = useWebSocket(WS_URL);

  useEffect(() => {
    if (lastMessage !== null) {
      // New message from the server
      const data = JSON.parse(lastMessage.data);
      setReceived(prev => [...prev, data.message]);
    }
  }, [lastMessage]);

  const handleSend = () => {
    sendMessage(JSON.stringify({ message: message }));
    setMessage('');
  };

  return (
    <div>
      <h1>Real-time Django + React</h1>
      <div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={handleSend}>Send Message</button>
      </div>
      <h2>Messages from Server:</h2>
      <ul>
        {received.map((msg, index) => (
          <li key={index}>{msg}</li>
        ))}
      </ul>
    </div>
  );
}

export default RealtimeComponent;
