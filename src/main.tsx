import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

const storedTheme = localStorage.getItem('uiTheme');
const initialTheme = storedTheme === 'light' ? 'light' : 'dark';
document.documentElement.dataset.theme = initialTheme;
document.documentElement.style.colorScheme = initialTheme;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
