// # Import React — the core library that makes components work
import React from 'react';

// # Import ReactDOM — connects React to the browser's HTML
import ReactDOM from 'react-dom/client';

// # Import our main App component — the root of everything
import App from './App';

// # Import toast notifications styles — for success/error popups
import { Toaster } from 'react-hot-toast';

// # Global CSS styles applied to entire app
import './styles/global.css';

// # Find the <div id="root"> in index.html and take control of it
const root = ReactDOM.createRoot(document.getElementById('root'));

// # Render our entire app inside that div
// # React.StrictMode helps catch bugs during development
root.render(
  <React.StrictMode>
    {/* # Our entire app lives inside App component */}
    <App />

    {/* # Toaster sits here so it can show popups from anywhere in the app */}
    <Toaster
      position="top-right"           
      toastOptions={{
        duration: 3000,              
        style: {
          background: '#1a1a2e',     
          color: '#ffffff',          
          borderRadius: '8px',       
          fontSize: '14px',          
        },
        success: {
          iconTheme: {
            primary: '#22c55e',      
            secondary: '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',      
            secondary: '#ffffff',
          },
        },
      }}
    />
  </React.StrictMode>
);