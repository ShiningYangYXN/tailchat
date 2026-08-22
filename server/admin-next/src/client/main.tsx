import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './auth';
import { ToastProvider } from './components';
import { I18nProvider } from './i18n';
import '@arco-design/web-react/dist/css/arco.css';
import './styles.css';

document.body.setAttribute('arco-theme', 'dark');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </I18nProvider>
  </React.StrictMode>
);
