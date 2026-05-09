import { createRoot } from 'react-dom/client';
import './bootstrap/index.css';
import App from './bootstrap/App';
import '@/i18n';

createRoot(document.getElementById('root')!).render(<App />);
