import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Trash2, Type, Upload } from 'lucide-react';

const FONTS_KEY = 'topo-fonts-v1';
type FontAsset = { id: string; label: string; family: string; dataUrl: string };

function readFonts(): FontAsset[] {
  try { const raw = localStorage.getItem(FONTS_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = reject; r.readAsDataURL(file); });
}
function install(font: FontAsset) {
  try {
    const face = new FontFace(font.family, `url(${font.dataUrl})`);
    void face.load().then((loaded) => document.fonts.add(loaded)).catch(console.warn);
  } catch {}
}

function readTag(view: DataView, offset: number) {
  return String.fromCharCode(view.getUint8(offset), view.getUint8(offset + 1), view.getUint8(offset + 2), view.getUint8(offset + 3));
}

function decodeUtf16BE(bytes: Uint8Array) {
  let out = '';
  for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  return out.replace(/\u0000/g, '').trim();
}

function decodeSingleByte(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => String.fromCharCode(b)).join('').replace(/\u0000/g, '').trim();
}

async function detectFontFamily(file: File): Promise<string> {
  const fallback = file.name.replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/, '').replace(/[-_]+/g, ' ').trim();
  if (!/\.(ttf|otf)$/i.test(file.name)) return fallback;

  try {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    const numTables = view.getUint16(4, false);
    let nameOffset = -1;
    for (let i = 0; i < numTables; i++) {
      const off = 12 + i * 16;
      if (readTag(view, off) === 'name') {
        nameOffset = view.getUint32(off + 8, false);
        break;
      }
    }
    if (nameOffset < 0) return fallback;

    const count = view.getUint16(nameOffset + 2, false);
    const stringOffset = view.getUint16(nameOffset + 4, false);
    const records: { score: number; value: string }[] = [];

    for (let i = 0; i < count; i++) {
      const off = nameOffset + 6 + i * 12;
      const platformId = view.getUint16(off, false);
      const languageId = view.getUint16(off + 4, false);
      const nameId = view.getUint16(off + 6, false);
      const length = view.getUint16(off + 8, false);
      const offset = view.getUint16(off + 10, false);
      if (nameId !== 16 && nameId !== 1) continue;
      const start = nameOffset + stringOffset + offset;
      if (start < 0 || start + length > buffer.byteLength) continue;
      const bytes = new Uint8Array(buffer, start, length);
      const value = platformId === 0 || platformId === 3 ? decodeUtf16BE(bytes) : decodeSingleByte(bytes);
      if (!value) continue;
      let score = nameId === 16 ? 100 : 50;
      if (platformId === 3) score += 20;
      if (languageId === 0x0409 || languageId === 0x0416) score += 5;
      records.push({ score, value });
    }

    records.sort((a, b) => b.score - a.score);
    return records[0]?.value || fallback;
  } catch {
    return fallback;
  }
}

export default function FontsClassic() {
  const [fonts, setFonts] = useState<FontAsset[]>(readFonts);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { fonts.forEach(install); }, [fonts]);

  const save = (next: FontAsset[]) => {
    setFonts(next);
    localStorage.setItem(FONTS_KEY, JSON.stringify(next));
  };

  const addFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setStatus('Lendo a fonte automaticamente...');
    try {
      const family = await detectFontFamily(file);
      const dataUrl = await fileToDataUrl(file);
      const asset: FontAsset = { id: `${Date.now()}`, label: file.name, family, dataUrl };
      const next = [...fonts.filter((f) => f.family.toLowerCase() !== family.toLowerCase()), asset];
      save(next);
      install(asset);
      setStatus(`Fonte detectada e cadastrada automaticamente: ${family}`);
    } catch (error) {
      console.error(error);
      setStatus('Não consegui ler esse arquivo de fonte. Tente usar o .ttf ou .otf original.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="min-h-screen bg-zinc-100 text-zinc-900">
    <header className="border-b border-zinc-800 bg-zinc-950 text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3"><Type/><div><p className="text-xl font-black">Fontes do Topo Express</p><p className="text-xs text-zinc-400">Reconhecimento automático das fontes do Corel</p></div></div>
        <a href="#/admin" className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 font-bold text-zinc-900"><ArrowLeft size={18}/> Admin</a>
      </div>
    </header>
    <main className="mx-auto max-w-6xl p-5 md:p-8">
      <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-wider text-red-600">Nova fonte</p>
          <h1 className="mt-2 text-2xl font-black">Só envie o arquivo</h1>
          <p className="mt-2 text-sm text-zinc-500">Você não precisa mais escrever o nome da fonte. O sistema lê o nome interno do .ttf/.otf e faz a ligação com o texto importado do Corel automaticamente.</p>
          <label className={`mt-5 flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-zinc-300 px-4 text-center font-black ${busy ? 'pointer-events-none opacity-50' : 'hover:border-red-400'}`}>
            <Upload/>
            {busy ? 'Lendo fonte...' : 'Selecionar .ttf / .otf / .woff2'}
            <input type="file" accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2" className="hidden" onChange={(e)=>{ void addFile(e.target.files?.[0]); e.currentTarget.value=''; }}/>
          </label>
          {status && <div className="mt-4 flex items-start gap-2 rounded-xl bg-zinc-50 p-3 text-sm font-bold"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600"/>{status}</div>}
        </section>

        <section className="rounded-3xl bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-black">Fontes cadastradas</h2>
          <p className="mt-1 text-zinc-500">Quando um tema do Corel pedir essa família, o navegador usa a fonte automaticamente. O cliente não escolhe e não precisa saber o nome.</p>
          <div className="mt-5 space-y-3">
            {fonts.map((font)=><div key={font.id} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 p-4">
              <div className="min-w-0"><p className="font-black">{font.family}</p><p className="truncate text-sm text-zinc-500">{font.label}</p><p className="mt-2 text-3xl" style={{fontFamily:font.family}}>Maria Clara</p></div>
              <button onClick={()=>save(fonts.filter((f)=>f.id!==font.id))} className="text-zinc-400 hover:text-red-600"><Trash2/></button>
            </div>)}
            {fonts.length===0&&<p className="rounded-2xl bg-zinc-50 p-8 text-center font-bold text-zinc-500">Nenhuma fonte cadastrada ainda.</p>}
          </div>
        </section>
      </div>
    </main>
  </div>;
}
