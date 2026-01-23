/**
 * AIGRC Dashboard - Main Entry Point
 *
 * This is the entry point for the standalone dashboard application.
 * Used for development and demo purposes.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
