import '@/i18n';
import { createRoot } from 'react-dom/client';
import App from './bootstrap/App';
import './bootstrap/index.css';

createRoot(document.getElementById('root')!).render(<App />);
