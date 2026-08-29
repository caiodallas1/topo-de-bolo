import { PointerEvent, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, CakeSlice, Check, CheckCircle2, HelpCircle, RotateCcw, Search, Sparkles } from 'lucide-react';
import { fontOptions, Theme, themes, TopperElement } from './data/themes';

type PlacedElement = TopperElement & { x: number; y: number; widthCm: number };

type Order = {
  code: string;
  themeName: string;
  childName: string;
  age: string;
  font: string;
  elements: PlacedElement[];
  createdAt: string;
};

const steps = ['Tema', 'Dados', 'Montar A4', 'Confirmar'];
const A4_WIDTH_CM = 21;
const A4_HEIGHT_CM = 29.7;

function makeCode() {
  return `TB${Math.floor(1000 + Math.random() * 9000)}`;
}

function cmToPercentX(cm: number) {
  return (cm / A4_WIDTH_CM) * 100;
}

function App() {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<Theme | null>(null);
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [font, setFont] = useState(fontOptions[0].value);
  const [elements, setElements] = useState<PlacedElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const filteredThemes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? themes.filter((item) => item.name.toLowerCase().includes(q)) : themes;
  }, [search]);

  const selectedElement = elements.find((item) => item.id === selectedElementId) || null;

  const selectTheme = (selected: Theme) => {
    setTheme(selected);
    setElements(selected.elements.map((item) => ({ ...item })));
    setSelectedElementId(selected.elements[0]?.id || null);
  };

  const updateElement = (id: string, patch: Partial<PlacedElement>) => {
    setElements((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const handleDrag = (event: PointerEvent<HTMLDivElement>, item: PlacedElement) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const onMove = (moveEvent: globalThis.PointerEvent) => {
      const x = Math.min(95, Math.max(0, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(95, Math.max(0, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      updateElement(item.id, { x, y });
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const finish = () => {
    if (!theme) return;
    const newOrder: Order = {
      code: makeCode(),
      themeName: theme.name,
      childName: childName.trim(),
      age,
      font,
      elements,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('topo-orders') || '[]');
    localStorage.setItem('topo-orders', JSON.stringify([newOrder, ...existing]));
    setOrder(newOrder);
  };

  const restart = () => {
    setStep(0);
    setSearch('');
    setTheme(null);
    setChildName('');
    setAge('');
    setFont(fontOptions[0].value);
    setElements([]);
    setSelectedElementId(null);
    setOrder(null);
  };

  const A4 = ({ readonly = false }: { readonly?: boolean }) => (
    <div className="mx-auto w-full max-w-[520px]">
      <div className="mb-2 flex items-center justify-between text-sm font-bold text-zinc-500">
        <span>21 cm</span><span>A4 • 21 × 29,7 cm</span>
      </div>
      <div ref={canvasRef} className="relative aspect-[210/297] w-full overflow-hidden border border-zinc-300 bg-white shadow-xl" style={{ touchAction: 'none' }}>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-zinc-200" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-zinc-200" />

        {elements.map((item) => (
          <div
            key={item.id}
            onPointerDown={readonly ? undefined : (e) => { setSelectedElementId(item.id); handleDrag(e, item); }}
            onClick={() => !readonly && setSelectedElementId(item.id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 ${readonly ? '' : 'cursor-move'} ${selectedElementId === item.id && !readonly ? 'ring-2 ring-red-500 ring-offset-2' : ''}`}
            style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${cmToPercentX(item.widthCm)}%` }}
          >
            <img
              src={item.src}
              alt={item.name}
              draggable={false}
              className="block h-auto w-full select-none"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-100 p-2 text-center text-xs font-black text-zinc-500">{item.name}<br/>PNG</div>
          </div>
        ))}

        {childName.trim() && (
          <div className="absolute left-1/2 top-[76%] w-[70%] -translate-x-1/2 text-center font-black leading-none" style={{ fontFamily: font, fontSize: 'clamp(16px, 4vw, 36px)' }}>
            {childName}
          </div>
        )}

        {age && (
          <div className="absolute left-1/2 top-[84%] -translate-x-1/2 rounded-full border border-zinc-300 bg-white px-3 py-1 text-center text-sm font-black" style={{ fontFamily: font }}>
            {age} anos
          </div>
        )}

        <div className="pointer-events-none absolute bottom-2 left-2 text-[10px] font-bold text-zinc-400">29,7 cm</div>
      </div>
    </div>
  );

  if (order) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-[32px] bg-white p-8 text-center shadow-xl">
          <CheckCircle2 className="mx-auto text-emerald-600" size={58} />
          <h1 className="mt-4 text-4xl font-black">Topo aprovado!</h1>
          <p className="mt-2 text-lg text-zinc-600">Mostre este código no balcão.</p>
          <div className="mx-auto my-8 max-w-sm rounded-3xl bg-zinc-950 px-6 py-7 text-5xl font-black tracking-wider text-white">{order.code}</div>
          <div className="rounded-2xl bg-zinc-50 p-5 text-left text-lg">
            <p><strong>Tema:</strong> {order.themeName}</p>
            <p><strong>Nome:</strong> {order.childName || 'Sem nome'}</p>
            <p><strong>Idade:</strong> {order.age ? `${order.age} anos` : 'Sem idade'}</p>
          </div>
          <button onClick={restart} className="mt-7 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-zinc-900 px-7 font-black text-white"><RotateCcw size={20}/> Novo topo</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><CakeSlice size={26}/></div>
            <div><p className="text-xl font-black">Topo Express</p><p className="text-sm font-medium text-zinc-500">Monte seu A4 sem depender do designer</p></div>
          </div>
          <button className="hidden min-h-12 items-center gap-2 rounded-xl border border-zinc-200 px-4 font-bold md:flex"><HelpCircle size={20}/> Ajuda</button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <div key={label}><div className={`h-2 rounded-full ${index <= step ? 'bg-red-600' : 'bg-zinc-200'}`}/><div className="mt-2 flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${index <= step ? 'bg-zinc-900 text-white' : 'bg-zinc-200'}`}>{index < step ? <Check size={15}/> : index + 1}</span><span className="truncate text-xs font-bold md:text-sm">{label}</span></div></div>
            ))}
          </div>
        </div>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          {step === 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-red-600"><Sparkles size={17}/> Passo 1</p>
              <h1 className="text-3xl font-black md:text-4xl">Escolha o tema</h1>
              <label className="my-6 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 focus-within:border-red-500"><Search size={24}/><input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-xl font-semibold outline-none" placeholder="Buscar tema..."/></label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {filteredThemes.map((item) => <button key={item.id} onClick={() => selectTheme(item)} className={`relative min-h-40 rounded-3xl border-2 p-5 text-left ${theme?.id === item.id ? 'border-red-600 bg-red-50' : 'border-zinc-200'}`}><span className="text-5xl">{item.emoji || '🎂'}</span><p className="mt-5 text-xl font-black">{item.name}</p><p className="mt-1 text-sm font-semibold text-zinc-600">{item.elements.length} elementos</p></button>)}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 2</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Nome, idade e fonte</h1>
              <p className="mt-2 text-lg text-zinc-600">Nome e idade são opcionais.</p>
              <div className="mt-8 space-y-7">
                <div><label className="mb-2 block text-xl font-extrabold">Nome <span className="text-zinc-400">(opcional)</span></label><input value={childName} onChange={(e) => setChildName(e.target.value.slice(0, 24))} placeholder="Deixe vazio para não usar nome" className="min-h-16 w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-5 text-2xl font-bold outline-none focus:border-red-500"/></div>
                <div><p className="mb-3 text-xl font-extrabold">Idade <span className="text-zinc-400">(opcional)</span></p><div className="grid gap-3 md:grid-cols-[1fr_220px]"><input type="number" min="0" max="120" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Digite a idade" className="min-h-16 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-5 text-2xl font-bold outline-none focus:border-red-500"/><button onClick={() => setAge('')} className={`min-h-16 rounded-2xl border-2 px-5 text-lg font-black ${age === '' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200'}`}>Sem idade</button></div></div>
                <div><label className="mb-2 block text-xl font-extrabold">Fonte</label><select value={font} onChange={(e) => setFont(e.target.value)} className="min-h-16 w-full rounded-2xl border-2 border-zinc-200 bg-white px-5 text-xl font-bold outline-none focus:border-red-500">{fontOptions.map((item) => <option key={item.label} value={item.value}>{item.label}</option>)}</select><div className="mt-3 rounded-2xl bg-zinc-50 p-4 text-center text-3xl" style={{ fontFamily: font }}>{childName || 'Exemplo da fonte'}</div></div>
              </div>
            </div>
          )}

          {step === 2 && theme && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 3</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Monte a folha A4</h1>
              <p className="mt-2 text-lg text-zinc-600">Clique e arraste os elementos. Selecione um para ajustar o tamanho em centímetros.</p>
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,560px)_1fr]">
                <A4 />
                <aside className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5">
                  <h2 className="text-xl font-black">Elementos do tema</h2>
                  <div className="mt-4 grid gap-2">
                    {elements.map((item) => <button key={item.id} onClick={() => setSelectedElementId(item.id)} className={`rounded-xl border p-3 text-left font-bold ${selectedElementId === item.id ? 'border-red-500 bg-red-50' : 'border-zinc-200 bg-white'}`}>{item.name} <span className="float-right text-zinc-500">{item.widthCm.toFixed(1)} cm</span></button>)}
                  </div>
                  {selectedElement && <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-bold uppercase tracking-wider text-zinc-500">Selecionado</p><p className="mt-1 text-xl font-black">{selectedElement.name}</p><div className="mt-5 flex items-center justify-between"><label className="font-bold">Largura</label><strong className="text-red-600">{selectedElement.widthCm.toFixed(1)} cm</strong></div><input type="range" min="2" max="15" step="0.1" value={selectedElement.widthCm} onChange={(e) => updateElement(selectedElement.id, { widthCm: Number(e.target.value) })} className="mt-3 w-full accent-red-600"/><div className="mt-4 grid grid-cols-2 gap-2 text-sm font-bold text-zinc-600"><div className="rounded-xl bg-zinc-100 p-3">X: {(selectedElement.x * A4_WIDTH_CM / 100).toFixed(1)} cm</div><div className="rounded-xl bg-zinc-100 p-3">Y: {(selectedElement.y * A4_HEIGHT_CM / 100).toFixed(1)} cm</div></div></div>}
                  <div className="mt-6 rounded-2xl bg-blue-50 p-4 text-sm font-semibold leading-relaxed text-blue-900">Para o cliente idoso: ele não precisa mexer aqui se não quiser. Os elementos já entram em posições prontas; esta área serve apenas para pequenos ajustes.</div>
                </aside>
              </div>
            </div>
          )}

          {step === 3 && theme && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 4</p><h1 className="mt-2 text-3xl font-black md:text-4xl">Confira a folha final</h1><div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,560px)_1fr]"><A4 readonly/><div className="rounded-3xl bg-zinc-50 p-6 text-lg"><p><strong>Tema:</strong> {theme.name}</p><p className="mt-3"><strong>Nome:</strong> {childName || 'Sem nome'}</p><p className="mt-3"><strong>Idade:</strong> {age ? `${age} anos` : 'Sem idade'}</p><p className="mt-3"><strong>Elementos:</strong> {elements.length}</p><button onClick={finish} className="mt-8 min-h-16 w-full rounded-2xl bg-emerald-600 px-6 text-xl font-black text-white">Aprovar meu topo</button></div></div>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-between"><button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-200 px-6 text-lg font-extrabold disabled:opacity-0"><ArrowLeft size={21}/> Voltar</button>{step < 3 && <button onClick={() => setStep((s) => Math.min(3, s + 1))} disabled={step === 0 && !theme} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 text-lg font-extrabold text-white disabled:bg-zinc-300">Continuar <ArrowRight size={21}/></button>}</div>
        </section>
      </main>
    </div>
  );
}

export default App;
