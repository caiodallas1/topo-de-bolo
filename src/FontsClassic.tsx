import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, Type, Upload } from 'lucide-react';

const FONTS_KEY = 'topo-fonts-v1';
type FontAsset = { id: string; label: string; family: string; dataUrl: string };

function readFonts(): FontAsset[] {
  try { const raw = localStorage.getItem(FONTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
}
function install(font: FontAsset) {
  try { const face = new FontFace(font.family, `url(${font.dataUrl})`); void face.load().then((loaded) => document.fonts.add(loaded)).catch(console.warn); } catch {}
}

export default function FontsClassic() {
  const [fonts, setFonts] = useState<FontAsset[]>(readFonts);
  const [family, setFamily] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  useEffect(() => { fonts.forEach(install); }, [fonts]);
  const save = (next: FontAsset[]) => { setFonts(next); localStorage.setItem(FONTS_KEY, JSON.stringify(next)); };
  const add = async () => {
    if (!file || !family.trim()) { setStatus('Escolha o arquivo e informe exatamente o nome da fonte usado no Corel.'); return; }
    const asset: FontAsset = { id: `${Date.now()}`, label: file.name, family: family.trim(), dataUrl: await fileToDataUrl(file) };
    save([...fonts.filter((f) => f.family.toLowerCase() !== asset.family.toLowerCase()), asset]); install(asset); setFile(null); setFamily(''); setStatus('Fonte cadastrada.');
  };
  return <div className="min-h-screen bg-zinc-100 text-zinc-900"><header className="border-b border-zinc-800 bg-zinc-950 text-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><div className="flex items-center gap-3"><Type/><div><p className="text-xl font-black">Fontes do Topo Express</p><p className="text-xs text-zinc-400">Biblioteca usada nos textos do Corel</p></div></div><a href="#/admin" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-zinc-900"><ArrowLeft size={18}/> Admin</a></div></header><main className="mx-auto max-w-6xl p-5 md:p-8"><div className="grid gap-6 lg:grid-cols-[390px_1fr]"><section className="rounded-3xl bg-white p-6 shadow-sm"><p className="text-xs font-black uppercase tracking-wider text-red-600">Nova fonte</p><h1 className="mt-2 text-2xl font-black">Cadastrar fonte do Corel</h1><p className="mt-2 text-sm text-zinc-500">Digite o nome da família exatamente como aparece no Corel. Ex.: Lobster, Bangers, Cocogoose.</p><input value={family} onChange={(e)=>setFamily(e.target.value)} placeholder="Nome exato da fonte" className="mt-5 min-h-14 w-full rounded-2xl border-2 border-zinc-200 px-4 font-bold outline-none focus:border-red-500"/><label className="mt-4 flex min-h-16 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 font-black"><Upload/> {file ? file.name : 'Selecionar .ttf / .otf / .woff2'}<input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" className="hidden" onChange={(e)=>setFile(e.target.files?.[0]||null)}/></label><button onClick={add} className="mt-4 min-h-14 w-full rounded-2xl bg-red-600 font-black text-white">Cadastrar fonte</button>{status && <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm font-bold">{status}</p>}</section><section className="rounded-3xl bg-white p-6 shadow-sm"><h2 className="text-2xl font-black">Fontes cadastradas</h2><p className="mt-1 text-zinc-500">O cliente recebe essas fontes pelo navegador, mesmo sem ter instalado no Windows.</p><div className="mt-5 space-y-3">{fonts.map((font)=><div key={font.id} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 p-4"><div className="min-w-0"><p className="font-black">{font.family}</p><p className="truncate text-sm text-zinc-500">{font.label}</p><p className="mt-2 text-3xl" style={{fontFamily:font.family}}>Maria Clara</p></div><button onClick={()=>save(fonts.filter((f)=>f.id!==font.id))} className="text-zinc-400 hover:text-red-600"><Trash2/></button></div>)}{fonts.length===0&&<p className="rounded-2xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">Nenhuma fonte cadastrada ainda.</p>}</div></section></div></main></div>;
}
