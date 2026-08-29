import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ImportCorelNext from './ImportCorelNext.tsx';
import { installThemeStorageShim } from './services/themeStorage';
import './index.css';

// Aceita packs antigos do Corel com BOM e alguns números serializados como 210.
const nativeJsonParse = JSON.parse.bind(JSON);
JSON.parse = ((text: string, reviver?: (this: any, key: string, value: any) => any) => {
  const clean = typeof text === 'string'
    ? text
        .replace(/^\uFEFF/, '')
        .replace(/^ï»¿/, '')
        .trimStart()
        .replace(/(-?\d+)\.(?=\s*[,}\]])/g, '$1')
    : text;
  return nativeJsonParse(clean, reviver);
}) as typeof JSON.parse;

window.addEventListener('hashchange', () => window.location.reload());

async function bootstrap() {
  await installThemeStorageShim();

  const hash = window.location.hash;
  const isImporter = hash.startsWith('#/importar');
  const isAdmin = hash.startsWith('#/admin');

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {isImporter ? (
        <ImportCorelNext />
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
}

void bootstrap();
