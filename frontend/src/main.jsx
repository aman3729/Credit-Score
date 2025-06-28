import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import '@fortawesome/fontawesome-free/css/all.min.css';
// Ant Design v5 styles
import 'antd/dist/reset.css';
import './index.css';
import { WebSocketProvider } from './contexts/WebSocketContext';
import { AuthProvider } from './contexts/AuthContext';

console.log('main.jsx: Starting application...');

const rootElement = document.getElementById('root');
console.log('main.jsx: Root element found?', !!rootElement);

if (!rootElement) {
  console.error('main.jsx: Could not find root element with id "root"');
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.padding = '20px';
  errorDiv.style.backgroundColor = '#f8d7da';
  errorDiv.style.color = '#721c24';
  errorDiv.style.borderBottom = '1px solid #f5c6cb';
  errorDiv.style.zIndex = '1000';
  errorDiv.style.fontFamily = 'sans-serif';
  errorDiv.innerHTML = `
    <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">Error: Root element not found</h2>
    <p style="margin: 0;">Could not find an element with id="root". Please check your index.html file.</p>
  `;
  document.body.prepend(errorDiv);
  throw new Error('Could not find root element with id "root"');
}

try {
  console.log('main.jsx: Creating root...');
  const root = ReactDOM.createRoot(rootElement);
  
  // Create a temporary loading message
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'app-loading';
  loadingDiv.style.padding = '20px';
  loadingDiv.style.fontFamily = 'sans-serif';
  loadingDiv.textContent = 'Loading application...';
  rootElement.appendChild(loadingDiv);
  
  console.log('main.jsx: Rendering app...');
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <WebSocketProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </WebSocketProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
  
  console.log('main.jsx: App mounting...');
  
  // Remove loading message after a short delay
  setTimeout(() => {
    const loadingElement = document.getElementById('app-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
  }, 1000);
  
} catch (error) {
  console.error('main.jsx: Error rendering app:', error);
  
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.right = '0';
  errorDiv.style.padding = '20px';
  errorDiv.style.backgroundColor = '#f8d7da';
  errorDiv.style.color = '#721c24';
  errorDiv.style.borderBottom = '1px solid #f5c6cb';
  errorDiv.style.zIndex = '1000';
  errorDiv.style.fontFamily = 'sans-serif';
  errorDiv.style.whiteSpace = 'pre';
  errorDiv.innerHTML = `
    <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: bold;">Test App Error</h2>
    <p style="margin: 0 0 10px 0;">${error.message}</p>
    <p style="margin: 0; font-size: 14px; color: #666;">Check the console for more details.</p>
  `;
  
  rootElement.appendChild(errorDiv);
  throw error;
}
