import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Reset básico
const style = document.createElement('style');
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; }
  button { font-family: inherit; }
  input:focus { outline: none; border-color: rgba(255,255,255,0.3) !important; }
`;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
