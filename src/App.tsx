/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, ChangeEvent } from 'react';
import { Upload, Download, Printer, AlertCircle } from 'lucide-react';
import { generateCakeTopper } from './services/api';

export default function App() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setError("A imagem deve ter no máximo 10MB.");
      return;
    }

    setImageFile(file);
    setError(null);
    setResultImage(null); // Reset previous result

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setImagePreview(result);
      // Extract base64 data (remove data:image/png;base64, prefix)
      const base64 = result.split(',')[1];
      setImageBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imageBase64) return;

    setLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const generatedImageBase64 = await generateCakeTopper(imageBase64, name, age);
      setResultImage(`data:image/png;base64,${generatedImageBase64}`);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao gerar a imagem. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    
    // Create a canvas to ensure white background for JPEG
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Fill white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Draw image
        ctx.drawImage(img, 0, 0);
        
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.download = 'topo-de-bolo.jpeg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };
    img.src = resultImage;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4 font-sans text-gray-800">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-6 md:p-8 my-8">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">Gerador de Topo de Bolo IA</h1>
          <p className="text-gray-600">
            Envie uma imagem de referência e criaremos uma folha A4 pronta para imprimir e recortar!
          </p>
        </header>

        <main className="space-y-8">
          {/* Upload Section */}
          <div className="space-y-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer block w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <Upload className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span className="mt-2 block text-sm font-medium text-gray-900">
                {imageFile ? imageFile.name : "Clique para enviar uma imagem"}
              </span>
              <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF até 10MB</p>
            </div>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />

            {imagePreview && (
              <div className="flex justify-center">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-60 rounded-lg shadow-md object-contain"
                />
              </div>
            )}
          </div>

          {/* Inputs Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome (Opcional)
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Parabéns Maria!"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                Idade (Opcional)
              </label>
              <input
                type="text"
                id="age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Ex: 5 anos"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={!imageBase64 || loading}
              className={`
                px-8 py-3 rounded-lg font-bold text-white shadow-md transition-all
                ${!imageBase64 || loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5'}
              `}
            >
              {loading ? 'Gerando...' : 'Gerar Topo de Bolo'}
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="loader mb-4"></div>
              <p className="text-gray-600 animate-pulse">Aguarde, a mágica está acontecendo...</p>
              <p className="text-gray-400 text-sm mt-2">Isso pode levar até um minuto.</p>
            </div>
          )}

          {/* Result Section */}
          {resultImage && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
                  Seu Topo de Bolo está Pronto!
                </h2>
                
                {/* Print Container */}
                <div id="print-section" className="flex justify-center bg-gray-200 p-4 rounded-xl overflow-auto">
                  <div id="a4-page" className="bg-white shadow-2xl aspect-a4 w-full max-w-[500px] relative flex items-center justify-center">
                    <img 
                      src={resultImage} 
                      alt="Topo de Bolo Gerado" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
                  <button
                    onClick={handleDownload}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <Download className="h-5 w-5" />
                    Salvar como JPEG
                  </button>
                  <button
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg font-semibold hover:bg-gray-900 transition-colors shadow-sm"
                  >
                    <Printer className="h-5 w-5" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
