'use client';

import { useState, useEffect, useRef, MouseEvent, DragEvent } from 'react';
// 1. NUEVO: Importamos la fuente premium de Next.js
import { Outfit } from 'next/font/google';

// 2. NUEVO: Configuramos la fuente
const outfit = Outfit({ subsets: ['latin'] });

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [targetLang, setTargetLang] = useState('ES');
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'COMPLETED' | 'FAILED'>('IDLE');
  const [statusText, setStatusText] = useState('Sube tu PDF para comenzar');
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 1000, height: 1000 });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const languages = [
    { code: 'ES', name: 'Español' },
    { code: 'FR', name: 'Francés' },
    { code: 'DE', name: 'Alemán' },
    { code: 'PT-BR', name: 'Portugués' },
    { code: 'IT', name: 'Italiano' },
    { code: 'EN-US', name: 'Inglés' }
  ];

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLElement>) => {
    const x = (e.clientX / windowSize.width - 0.5) * 2;
    const y = (e.clientY / windowSize.height - 0.5) * 2;
    setMousePos({ x, y });
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (status !== 'PROCESSING') setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (status === 'PROCESSING') return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type !== 'application/pdf') {
        setStatusText('Solo podemos leer archivos .PDF');
        return;
      }
      setFile(droppedFile);
      setStatusText(`${droppedFile.name}`);
      setDownloadUrl(null);
      setProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatusText(`${e.target.files[0].name}`);
      setDownloadUrl(null);
      setProgress(0);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (documentId && status === 'PROCESSING') {
      interval = setInterval(async () => {
        try {
          const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
          const res = await fetch(`${API_URL}/api/translator/status/${documentId}/`);
          const data = await res.json();
          setProgress(data.progress || 0);
          setStatusText(`Estado: ${data.status_display}`);

          if (data.status === 'COMPLETED') {
            setStatus('COMPLETED');
            if (data.translated_file_url.startsWith('http')) {
                setDownloadUrl(data.translated_file_url); // Producción (Amazon S3)
            } else {
                setDownloadUrl(`http://localhost:8000${data.translated_file_url}`); // Local
            }
            setStatusText('¡Documento listo para ti!');
            clearInterval(interval);
          } else if (data.status === 'FAILED') {
            setStatus('FAILED');
            setStatusText(`Detalle técnico: ${data.error_message}`);
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error consultando estado:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [documentId, status]);

  const handleUpload = async () => {
    if (!file) return;
    setStatus('PROCESSING');
    setStatusText('Iniciando la lectura del documento...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_lang', targetLang);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${API_URL}/api/translator/upload/`, { ... })
      const data = await res.json();
      
      if (res.ok) {
        setDocumentId(data.document_id);
      } else {
        setStatus('FAILED');
        setStatusText(`Aviso: ${data.error}`);
      }
    } catch (error) {
      setStatus('FAILED');
      setStatusText('El servidor maestro no responde.');
    }
  };

  return (
    // 3. NUEVO: Agregamos {outfit.className} aquí abajo para inyectar la tipografía
    <main 
      onMouseMove={handleMouseMove}
      className={`min-h-screen relative flex items-center justify-center p-6 overflow-hidden bg-[#F8F9FF] selection:bg-indigo-200 ${outfit.className}`}
    >
      {/* FONDO RELAJANTE */}
      <div 
        className="absolute w-[600px] h-[600px] bg-indigo-200/50 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${-mousePos.x * 40}px, ${-mousePos.y * 40}px)`, top: '-10%', left: '10%' }}
      />
      <div 
        className="absolute w-[500px] h-[500px] bg-rose-200/40 rounded-full blur-[120px] pointer-events-none transition-transform duration-1000 ease-out"
        style={{ transform: `translate(${mousePos.x * 30}px, ${mousePos.y * 30}px)`, bottom: '-10%', right: '10%' }}
      />
      <div 
        className="absolute w-[400px] h-[400px] bg-teal-100/60 rounded-full blur-[90px] pointer-events-none transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * 80}px, ${mousePos.y * 80}px)`, top: '30%', left: '40%' }}
      />
      
      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white/30 backdrop-blur-3xl border border-white/60 rounded-[2.5rem] shadow-[0_8px_32px_rgba(31,38,135,0.06)] p-12 max-w-lg w-full relative z-10 overflow-hidden">
        
        {/* Textos con más presencia (font-semibold en lugar de font-light) */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-semibold text-indigo-950 mb-3 tracking-tight">
            Traductor Visual
          </h1>
          <p className="text-indigo-900/60 font-medium text-sm tracking-wide">OCR NEURONAL & CONSERVACIÓN DE FORMATO</p>
        </div>
        
        {/* Selector de Idioma */}
        <div className="mb-8 relative z-20">
          <label className="block text-[11px] font-bold text-indigo-900/50 mb-3 uppercase tracking-widest">
            Idioma de salida
          </label>
          <div className="relative">
            <select 
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              disabled={status === 'PROCESSING'}
              className="w-full bg-white/40 backdrop-blur-md border border-white/50 text-indigo-950 font-medium py-3.5 px-5 rounded-2xl appearance-none focus:outline-none focus:ring-4 focus:ring-white/60 transition-all disabled:opacity-50 cursor-pointer shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:bg-white/50"
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-indigo-900/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* DROPZONE */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => status !== 'PROCESSING' && fileInputRef.current?.click()}
          className={`relative border-[1.5px] border-dashed rounded-[2rem] p-12 transition-all duration-500 cursor-pointer overflow-hidden
            ${status === 'PROCESSING' 
              ? 'border-indigo-200/40 bg-white/10 cursor-not-allowed' 
              : isDragging 
                ? 'border-indigo-400 bg-white/60 scale-[1.02] shadow-[0_10px_30px_rgba(99,102,241,0.1)]' 
                : 'border-indigo-200/60 bg-white/20 hover:border-indigo-300 hover:bg-white/40 hover:shadow-sm'}`}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
          
          <div className="flex flex-col items-center justify-center relative z-10 pointer-events-none">
            <div className={`transition-all duration-500 mb-5 ${isDragging ? 'text-indigo-500 scale-110' : file ? 'text-emerald-500' : 'text-indigo-400'}`}>
              <svg className="w-10 h-10 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <p className={`font-semibold text-base text-center transition-colors ${isDragging ? 'text-indigo-600' : 'text-indigo-950'}`}>
              {isDragging ? "Suelta el documento aquí" : file ? file.name : "Arrastra tu documento aquí"}
            </p>
            {!file && !isDragging && <p className="text-indigo-900/50 text-xs mt-3 font-medium tracking-wide">o haz clic para explorar</p>}
          </div>
        </div>

        {/* BOTÓN PRINCIPAL */}
        {status !== 'COMPLETED' ? (
          <button 
            onClick={handleUpload}
            disabled={!file || status === 'PROCESSING'}
            className={`mt-10 w-full py-4 rounded-2xl font-semibold tracking-wide text-white transition-all duration-500 relative overflow-hidden
              ${!file || status === 'PROCESSING' 
                ? 'bg-indigo-900/20 text-indigo-900/40 cursor-not-allowed' 
                : 'bg-indigo-900/90 hover:bg-indigo-900 backdrop-blur-md shadow-[0_8px_20px_rgba(49,46,129,0.2)] hover:shadow-[0_12px_25px_rgba(49,46,129,0.3)] transform hover:-translate-y-0.5'}`}
          >
            {status === 'PROCESSING' ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5 text-indigo-900/50" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Procesando datos...
              </span>
            ) : 'Comenzar Traducción'}
          </button>
        ) : (
          <a 
            href={downloadUrl || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            download
            className="mt-10 flex items-center justify-center gap-3 w-full py-4 bg-emerald-600/90 hover:bg-emerald-600 backdrop-blur-md text-white font-semibold tracking-wide rounded-2xl shadow-[0_8px_20px_rgba(5,150,105,0.2)] transition-all duration-500 transform hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Descargar Documento
          </a>
        )}

        {/* BARRA DE PROGRESO */}
        {(status === 'PROCESSING' || status === 'COMPLETED') && (
          <div className="mt-8">
            <div className="flex justify-between mb-3">
              <span className="text-[11px] font-bold text-indigo-900/60 uppercase tracking-widest">{statusText}</span>
              <span className="text-[11px] font-bold text-indigo-900">{progress}%</span>
            </div>
            <div className="w-full bg-white/40 rounded-full h-1.5 overflow-hidden border border-white/50">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-indigo-400'}`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}