import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function App() {
  const [health, setHealth] = useState<string>('loading');

  useEffect(() => {
    axios
      .get('/api/health')
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'));
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui', padding: 24 }}>
      <h1>BBL</h1>
      <p>API health: {health}</p>
    </div>
  );
}

