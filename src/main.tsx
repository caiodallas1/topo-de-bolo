import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ImportCorel from './ImportCorel.tsx';
import './index.css';

window.addEventListener('hashchange', () => window.location.reload());

const hash = window.location.hash;
const isImporter = hash.startsWith('#/importar');
const isAdmin = hash.startsWith('#/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isImporter ? (
      <ImportCorel />
    ) : (
      <>
        <App />
        {isAdmin && (
          <a
            href="#/importar"
            className="fixed bottom-5 right-5 z-[9999] rounded-2xl bg-red-600 px-5 py-3 font-black text-white shadow-2xl shadow-red-300 hover:bg-red-700"
          >
            Importar pacote Corel
          </a>
        )}
      </>
    )}
  </StrictMode>,
);
