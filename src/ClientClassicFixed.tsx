import { PointerEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CakeSlice, Check, CheckCircle2, RotateCcw, Search, Sparkles } from 'lucide-react';
import { Category, DEFAULT_CATEGORIES, DEFAULT_THEMES, FONT_OPTIONS, TextSlot, Theme, TopperElement, TopperOrder } from './data/catalog';

const CATEGORIES_KEY = 'topo-categories-v2';
const THEMES_KEY = 'topo-themes-v2';
const ORDERS_KEY = 'topo-orders-v2';
const FONTS_KEY = 'topo-fonts-v1';
const steps = ['Tema', 'Dados', 'Montagem', 'Confirmar'];

type FontAsset = { id: string; label: string; family: string; dataUrl: string };
type SelectedObject = { kind: 'element'; id: string } | { kind: 'text'; type: 'name' | 'age' } | null;

function readLocal<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function makeCode() { return `TB${Math.floor(1000 + Math.random() * 9000)}`; }
function textValue(slot: TextSlot, childName: string, age: string) { return slot.type === 'name' ? childName : (age ? `${age} anos` : ''); }
function fallbackSlots(theme: Theme): TextSlot[] {
  if (theme.textSlots?.length) return theme.textSlots.map((s) => ({ ...s }));
  return [
    { type: 'name', xMm: 55, yMm: 245, widthMm: 100, heightMm: 16, fontFamily: 'Arial', fontSizePt: 36, fill: '#111111' },
    { type: 'age', xMm: 75, yMm: 267, widthMm: 60, heightMm: 12, fontFamily: 'Arial', fontSizePt: 24, fill: '#111111' },
  ];
}

function useInstalledFonts() {
  const fonts = useMemo(() => readLocal<FontAsset[]>(FONTS_KEY, []), []);
  useEffect(() => {
    fonts.forEach((font) => {
      try {
        const face = new FontFace(font.family, `url(${font.dataUrl})`);
        void face.load().then((loaded) => document.fonts.add(loaded)).catch(console.warn);
      } catch (error) { console.warn('Fonte não carregada:', font.family, error); }
    });
  }, [fonts]);
  return fonts;
}

function A4Editor({ elements, setElements, slots, setSlots, childName, age, selected, setSelected, interactive = false }: {
  elements: TopperElement[]; setElements?: (v: TopperElement[]) => void;
  slots: TextSlot[]; setSlots?: (v: TextSlot[]) => void;
  childName: string; age: string; selected: SelectedObject; setSelected?: (v: SelectedObject) => void; interactive?: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ kind: 'element' | 'text'; id: string; dx: number; dy: number } | null>(null);
  const point = (event: PointerEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect(); if (!rect) return { x: 0, y: 0 };
    return { x: ((event.clientX - rect.left) / rect.width) * 210, y: ((event.clientY - rect.top) / rect.height) * 297 };
  };
  return <svg ref={svgRef} viewBox="0 0 210 297" className="aspect-[210/297] w-full touch-none bg-white shadow-[0_12px_35px_rgba(0,0,0,.15)] ring-1 ring-zinc-200"
    onPointerMove={(event) => {
      if (!interactive || !dragRef.current) return; const p = point(event);
      if (dragRef.current.kind === 'element' && setElements) setElements(elements.map((item) => item.id === dragRef.current?.id ? { ...item, xMm: Math.max(0, p.x - dragRef.current.dx), yMm: Math.max(0, p.y - dragRef.current.dy) } : item));
      if (dragRef.current.kind === 'text' && setSlots) setSlots(slots.map((slot) => slot.type === dragRef.current?.id ? { ...slot, xMm: Math.max(0, p.x - dragRef.current.dx), yMm: Math.max(0, p.y - dragRef.current.dy) } : slot));
    }}
    onPointerUp={() => { dragRef.current = null; }} onPointerLeave={() => { dragRef.current = null; }}>
    <rect width="210" height="297" fill="#fff" />
    {elements.map((element) => {
      const h = element.widthMm / Math.max(.01, element.aspect || 1); const active = selected?.kind === 'element' && selected.id === element.id;
      return <g key={element.id}><image href={element.src} x={element.xMm} y={element.yMm} width={element.widthMm} height={h} preserveAspectRatio="xMidYMid meet"
        className={interactive && element.movable !== false ? 'cursor-move' : ''}
        onPointerDown={(event) => { if (!interactive || element.movable === false) return; const p = point(event); dragRef.current = { kind: 'element', id: element.id, dx: p.x - element.xMm, dy: p.y - element.yMm }; setSelected?.({ kind: 'element', id: element.id }); }} />
        {active && interactive && <rect x={element.xMm} y={element.yMm} width={element.widthMm} height={h} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 2" pointerEvents="none" />}</g>;
    })}
    {slots.map((slot) => {
      const value = textValue(slot, childName, age); if (!value) return null;
      const sizeMm = ((slot.fontSizePt || 32) * 25.4) / 72; const active = selected?.kind === 'text' && selected.type === slot.type;
      return <g key={slot.type}><text x={slot.xMm} y={slot.yMm} dominantBaseline="hanging" fontFamily={slot.fontFamily || 'Arial'} fontSize={sizeMm} fill={slot.fill || '#111'} stroke={slot.stroke || 'none'} strokeWidth={slot.strokeWidthMm || 0} paintOrder="stroke fill"
        className={interactive ? 'cursor-move select-none' : ''}
        onPointerDown={(event) => { if (!interactive) return; const p = point(event); dragRef.current = { kind: 'text', id: slot.type, dx: p.x - slot.xMm, dy: p.y - slot.yMm }; setSelected?.({ kind: 'text', type: slot.type }); }}>{value}</text>
        {active && interactive && <rect x={slot.xMm - 2} y={slot.yMm - 2} width={Math.max(25, slot.widthMm)} height={Math.max(10, slot.heightMm)} fill="none" stroke="#2563eb" strokeWidth=".8" strokeDasharray="2 2" pointerEvents="none" />}</g>;
    })}
  </svg>;
}

export default function ClientClassicFixed() {
  useInstalledFonts();
  const [categories] = useState<Category[]>(() => readLocal(CATEGORIES_KEY, DEFAULT_CATEGORIES));
  const [themes] = useState<Theme[]>(() => readLocal(THEMES_KEY, DEFAULT_THEMES));
  const [step, setStep] = useState(0); const [search, setSearch] = useState(''); const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null); const [childName, setChildName] = useState(''); const [age, setAge] = useState('');
  const [elements, setElements] = useState<TopperElement[]>([]); const [slots, setSlots] = useState<TextSlot[]>([]); const [selected, setSelected] = useState<SelectedObject>(null); const [order, setOrder] = useState<TopperOrder | null>(null);

  const filteredThemes = useMemo(() => { const term = search.trim().toLowerCase(); return themes.filter((t) => (categoryFilter === 'all' || t.categoryId === categoryFilter) && (!term || t.name.toLowerCase().includes(term) || t.description?.toLowerCase().includes(term))); }, [themes, search, categoryFilter]);
  const selectedElement = selected?.kind === 'element' ? elements.find((e) => e.id === selected.id) : undefined;
  const selectedSlot = selected?.kind === 'text' ? slots.find((s) => s.type === selected.type) : undefined;

  const selectTheme = (theme: Theme) => { setSelectedTheme(theme); setElements(theme.elements.map((e) => ({ ...e }))); const nextSlots = fallbackSlots(theme); setSlots(nextSlots); setSelected(theme.elements[0] ? { kind: 'element', id: theme.elements[0].id } : (nextSlots[0] ? { kind: 'text', type: nextSlots[0].type } : null)); };
  const updateElement = (id: string, patch: Partial<TopperElement>) => setElements((cur) => cur.map((e) => e.id === id ? { ...e, ...patch } : e));
  const updateSlot = (type: 'name' | 'age', patch: Partial<TextSlot>) => setSlots((cur) => cur.map((s) => s.type === type ? { ...s, ...patch } : s));
  const finish = () => {
    if (!selectedTheme) return; const category = categories.find((c) => c.id === selectedTheme.categoryId);
    const created: TopperOrder = { code: makeCode(), createdAt: new Date().toISOString(), themeId: selectedTheme.id, themeName: selectedTheme.name, categoryName: category?.name || 'Sem categoria', childName: childName.trim(), age, fontFamily: slots.find((s) => s.type === 'name')?.fontFamily || 'Arial', elements, textSlots: slots };
    const old = readLocal<TopperOrder[]>(ORDERS_KEY, []); localStorage.setItem(ORDERS_KEY, JSON.stringify([created, ...old])); setOrder(created);
  };
  const restart = () => { setStep(0); setSearch(''); setCategoryFilter('all'); setSelectedTheme(null); setChildName(''); setAge(''); setElements([]); setSlots([]); setSelected(null); setOrder(null); };

  if (order) return <div className="min-h-screen bg-zinc-100 px-4 py-10"><div className="mx-auto max-w-3xl rounded-[32px] bg-white p-8 text-center shadow-xl"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 size={46}/></div><p className="mt-5 text-sm font-black uppercase tracking-wider text-emerald-700">Pedido criado</p><h1 className="mt-2 text-4xl font-black">Seu topo foi aprovado!</h1><p className="mt-3 text-lg text-zinc-600">Mostre este código no balcão.</p><div className="mx-auto my-8 max-w-md rounded-3xl bg-zinc-950 px-6 py-8 text-white"><p className="text-sm font-bold uppercase tracking-[.2em] text-zinc-400">Código</p><p className="mt-2 text-6xl font-black">{order.code}</p></div><button onClick={restart} className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-zinc-900 px-8 text-lg font-black text-white"><RotateCcw size={20}/> Fazer outro topo</button></div></div>;

  return <div className="min-h-screen bg-[#f7f7f8] text-zinc-900">
    <header className="border-b border-zinc-200 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8"><div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><CakeSlice size={26}/></div><div><p className="text-xl font-black">Topo Express</p><p className="text-sm font-medium text-zinc-500">Escolha, personalize e aprove</p></div></div><a href="#/admin" className="text-sm font-bold text-zinc-400 hover:text-zinc-900">Admin</a></div></header>
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <div className="mb-7 rounded-2xl border border-zinc-200 bg-white p-4 md:p-5"><div className="grid grid-cols-4 gap-2">{steps.map((label, index) => <div key={label}><div className={`h-2 rounded-full ${index <= step ? 'bg-red-600' : 'bg-zinc-200'}`}/><div className="mt-2 flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${index <= step ? 'bg-zinc-900 text-white' : 'bg-zinc-200'}`}>{index < step ? <Check size={15}/> : index + 1}</span><span className="truncate text-xs font-bold md:text-sm">{label}</span></div></div>)}</div></div>
      <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
        {step === 0 && <div><p className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-red-600"><Sparkles size={17}/> Passo 1 de 4</p><h1 className="text-3xl font-black md:text-4xl">Qual é o tema da festa?</h1><p className="mt-2 text-lg text-zinc-600">Escolha uma categoria ou pesquise diretamente pelo tema.</p><div className="mt-6 flex gap-3 overflow-x-auto pb-2"><button onClick={() => setCategoryFilter('all')} className={`min-w-fit rounded-2xl border-2 px-5 py-3 font-black ${categoryFilter === 'all' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>Todos</button>{categories.map((c) => <button key={c.id} onClick={() => setCategoryFilter(c.id)} className={`flex min-w-fit items-center gap-2 rounded-2xl border-2 px-4 py-3 font-black ${categoryFilter === c.id ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>{c.image && <img src={c.image} className="h-8 w-8 rounded-lg object-cover"/>}{c.name}</button>)}</div><label className="my-5 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4"><Search size={24} className="text-zinc-500"/><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-xl font-semibold outline-none" placeholder="Buscar tema..."/></label><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{filteredThemes.map((theme) => { const active = selectedTheme?.id === theme.id; return <button key={theme.id} onClick={() => selectTheme(theme)} className={`relative min-h-40 overflow-hidden rounded-3xl border-2 text-left ${active ? 'border-red-600 shadow-lg shadow-red-100' : 'border-zinc-200'}`}>{theme.coverImage ? <img src={theme.coverImage} className="absolute inset-0 h-full w-full object-cover opacity-35"/> : <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-amber-50"/>}<div className="relative flex h-full flex-col justify-between p-5"><span className="text-5xl">{theme.emoji || '🎂'}</span><div><p className="text-xl font-black">{theme.name}</p><p className="mt-1 text-sm font-semibold text-zinc-700">{theme.description || `${theme.elements.length} elementos`}</p></div></div>{active && <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white"><Check size={20}/></span>}</button>; })}</div></div>}
        {step === 1 && <div className="mx-auto max-w-4xl"><p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 2 de 4</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Agora, só duas informações</h1><p className="mt-2 text-lg text-zinc-600">Digite exatamente como deseja ver no topo.</p><div className="mt-8"><label className="mb-2 block text-xl font-extrabold">Nome do aniversariante</label><input value={childName} onChange={(e) => setChildName(e.target.value.slice(0,24))} placeholder="Ex.: Maria Clara" className="min-h-16 w-full rounded-2xl border-2 border-zinc-200 px-5 text-xl font-bold outline-none focus:border-red-500"/><p className="mt-2 text-sm font-semibold text-zinc-500">O nome usa automaticamente a posição, tamanho e fonte do @NOME criado no Corel.</p></div><div className="mt-7"><p className="mb-3 text-xl font-extrabold">Idade</p><div className="flex flex-wrap gap-2">{Array.from({length:10},(_,i)=>String(i+1)).map((v)=><button key={v} onClick={()=>setAge(v)} className={`h-16 w-16 rounded-2xl border-2 font-black ${age===v?'border-red-600 bg-red-600 text-white':'border-zinc-200 bg-white'}`}>{v}</button>)}<button onClick={()=>setAge('')} className={`min-h-16 rounded-2xl border-2 px-5 font-black ${age===''?'border-zinc-900 bg-zinc-900 text-white':'border-zinc-200 bg-white'}`}>Sem idade</button></div></div>{slots.find(s=>s.type==='name') && <div className="mt-8 rounded-2xl bg-zinc-50 p-5"><p className="font-black">Fonte trazida do Corel</p><p className="mt-1 text-2xl" style={{fontFamily: slots.find(s=>s.type==='name')?.fontFamily}}>{slots.find(s=>s.type==='name')?.fontFamily || 'Arial'} — {childName || 'Maria Clara'}</p></div>}</div>}
        {step === 2 && selectedTheme && <div><p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 3 de 4</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Ajuste seu topo no A4</h1><p className="mt-2 text-lg text-zinc-600">Arraste os elementos e o texto. As imagens já vêm prontas do Corel, sem contorno automático.</p><div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,520px)_1fr]"><A4Editor elements={elements} setElements={setElements} slots={slots} setSlots={setSlots} childName={childName} age={age} selected={selected} setSelected={setSelected} interactive/><div className="rounded-3xl bg-zinc-50 p-6"><h2 className="text-2xl font-black">Objeto selecionado</h2>{selectedElement && <div className="mt-5 space-y-5"><p className="text-xl font-black">{selectedElement.name}</p><div><div className="flex justify-between font-bold"><span>Largura</span><span>{(selectedElement.widthMm/10).toFixed(1)} cm</span></div><input type="range" min={selectedElement.minWidthMm||20} max={selectedElement.maxWidthMm||120} value={selectedElement.widthMm} onChange={(e)=>updateElement(selectedElement.id,{widthMm:Number(e.target.value)})} className="mt-2 w-full"/></div></div>}{selectedSlot && <div className="mt-5 space-y-5"><p className="text-xl font-black">{selectedSlot.type==='name'?'Nome':'Idade'}</p><div><div className="flex justify-between font-bold"><span>Tamanho</span><span>{Math.round(selectedSlot.fontSizePt||32)} pt</span></div><input type="range" min="10" max="120" value={selectedSlot.fontSizePt||32} onChange={(e)=>updateSlot(selectedSlot.type,{fontSizePt:Number(e.target.value)})} className="mt-2 w-full"/></div><label className="block font-bold">Cor<input type="color" value={selectedSlot.fill||'#111111'} onChange={(e)=>updateSlot(selectedSlot.type,{fill:e.target.value})} className="mt-2 h-12 w-full rounded-xl"/></label><label className="block font-bold">Fonte<input value={selectedSlot.fontFamily||''} onChange={(e)=>updateSlot(selectedSlot.type,{fontFamily:e.target.value})} className="mt-2 min-h-12 w-full rounded-xl border-2 border-zinc-200 px-3"/></label><div className="grid grid-cols-2 gap-3 text-sm font-bold"><div className="rounded-xl bg-white p-3">X: {(selectedSlot.xMm/10).toFixed(1)} cm</div><div className="rounded-xl bg-white p-3">Y: {(selectedSlot.yMm/10).toFixed(1)} cm</div></div></div>}{!selectedElement && !selectedSlot && <p className="mt-5 text-zinc-500">Clique em uma imagem ou no texto.</p>}<div className="mt-7 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-600"><strong>A4 real:</strong> 21 × 29,7 cm.</div></div></div></div>}
        {step === 3 && selectedTheme && <div><p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 4 de 4</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Confira o A4 final</h1><div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,520px)_1fr]"><A4Editor elements={elements} slots={slots} childName={childName} age={age} selected={null}/><div className="rounded-3xl bg-zinc-50 p-6"><h2 className="text-2xl font-black">Resumo</h2><div className="mt-5 space-y-3 text-lg"><p><strong>Tema:</strong> {selectedTheme.name}</p><p><strong>Nome:</strong> {childName||'Sem nome'}</p><p><strong>Idade:</strong> {age?`${age} anos`:'Sem idade'}</p><p><strong>Elementos:</strong> {elements.length}</p></div><p className="mt-6 rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-900">Ao aprovar, esse A4 fica salvo no pedido e aparece automaticamente no painel da produção.</p></div></div></div>}
        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-between"><button onClick={()=>setStep(v=>Math.max(0,v-1))} disabled={step===0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-200 px-6 text-lg font-extrabold disabled:opacity-0"><ArrowLeft size={21}/> Voltar</button>{step<3?<button onClick={()=>{if(step===0&&!selectedTheme)return;setStep(v=>Math.min(3,v+1));}} disabled={step===0&&!selectedTheme} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 text-lg font-extrabold text-white disabled:bg-zinc-300">Continuar <ArrowRight size={21}/></button>:<button onClick={finish} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-lg font-extrabold text-white"><CheckCircle2 size={22}/> Aprovar meu topo</button>}</div>
      </section>
    </main>
  </div>;
}
