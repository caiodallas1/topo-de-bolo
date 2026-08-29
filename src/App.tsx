import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CakeSlice,
  Check,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';
import { themes, Theme, TopperModel } from './data/themes';

type Order = {
  code: string;
  themeId: string;
  themeName: string;
  modelId: string;
  modelName: string;
  childName: string;
  age: string;
  createdAt: string;
};

const steps = ['Tema', 'Dados', 'A4', 'Confirmar'];

function makeCode() {
  return `TB${Math.floor(1000 + Math.random() * 9000)}`;
}

function A4Preview({ theme, model, childName, age, compact = false }: {
  theme: Theme;
  model: TopperModel;
  childName: string;
  age: string;
  compact?: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-[210/297] w-full overflow-hidden bg-white shadow-[0_8px_30px_rgba(0,0,0,.12)] ring-1 ring-zinc-200">
      <div
        className="absolute inset-0 bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${model.preview}')` }}
      />

      {childName.trim() && model.namePosition && (
        <div
          className="absolute flex items-center justify-center text-center font-black leading-none"
          style={{
            left: `${model.namePosition.x}%`,
            top: `${model.namePosition.y}%`,
            width: `${model.namePosition.width}%`,
            fontSize: compact ? 'clamp(8px, 1.25vw, 16px)' : `${model.namePosition.fontSize}cqw`,
            color: model.namePosition.color || '#111',
          }}
        >
          {childName}
        </div>
      )}

      {age && model.agePosition && (
        <div
          className="absolute flex items-center justify-center text-center font-black leading-none"
          style={{
            left: `${model.agePosition.x}%`,
            top: `${model.agePosition.y}%`,
            width: `${model.agePosition.width}%`,
            fontSize: compact ? 'clamp(8px, 1.1vw, 14px)' : `${model.agePosition.fontSize}cqw`,
            color: model.agePosition.color || '#111',
          }}
        >
          {age} anos
        </div>
      )}

      <div className="absolute bottom-1.5 right-1.5 rounded bg-white/90 px-1.5 py-0.5 text-[9px] font-bold text-zinc-500 shadow-sm">
        A4 • 210×297 mm
      </div>
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [modelId, setModelId] = useState('');
  const [order, setOrder] = useState<Order | null>(null);

  const filteredThemes = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? themes.filter((theme) => theme.name.toLowerCase().includes(term)) : themes;
  }, [search]);

  const selectedModel = selectedTheme?.models.find((item) => item.id === modelId) || selectedTheme?.models[0] || null;

  const selectTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    setModelId(theme.models[0]?.id || '');
  };

  const canContinue = step === 0 ? !!selectedTheme : step === 2 ? !!selectedModel : true;

  const next = () => {
    if (canContinue) setStep((value) => Math.min(value + 1, 3));
  };

  const previous = () => setStep((value) => Math.max(value - 1, 0));

  const finishOrder = () => {
    if (!selectedTheme || !selectedModel) return;
    const newOrder: Order = {
      code: makeCode(),
      themeId: selectedTheme.id,
      themeName: selectedTheme.name,
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      childName: childName.trim(),
      age,
      createdAt: new Date().toISOString(),
    };
    const existing = JSON.parse(localStorage.getItem('topo-orders') || '[]');
    localStorage.setItem('topo-orders', JSON.stringify([newOrder, ...existing]));
    setOrder(newOrder);
  };

  const restart = () => {
    setStep(0);
    setSearch('');
    setSelectedTheme(null);
    setChildName('');
    setAge('');
    setModelId('');
    setOrder(null);
  };

  if (order) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] px-4 py-8">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[32px] border border-black/5 bg-white p-6 text-center shadow-xl shadow-black/5 md:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={46} />
            </div>
            <p className="text-lg font-bold text-emerald-700">PEDIDO CRIADO</p>
            <h1 className="mt-2 text-3xl font-black md:text-5xl">Topo aprovado!</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-600">Mostre este código no balcão.</p>
            <div className="mx-auto my-8 max-w-md rounded-3xl bg-zinc-950 px-6 py-8 text-white">
              <p className="text-sm font-bold uppercase tracking-[.2em] text-zinc-400">Código</p>
              <p className="mt-2 text-5xl font-black tracking-wider md:text-6xl">{order.code}</p>
            </div>
            <div className="mx-auto grid max-w-xl gap-2 rounded-2xl bg-zinc-50 p-5 text-left text-lg md:grid-cols-2">
              <p><strong>Tema:</strong> {order.themeName}</p>
              <p><strong>A4:</strong> {order.modelName}</p>
              <p><strong>Nome:</strong> {order.childName || 'Sem nome'}</p>
              <p><strong>Idade:</strong> {order.age ? `${order.age} anos` : 'Sem idade'}</p>
            </div>
            <button onClick={restart} className="mt-8 inline-flex min-h-14 items-center gap-2 rounded-2xl bg-zinc-900 px-8 text-lg font-extrabold text-white">
              <RotateCcw size={21} /> Novo topo
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white"><CakeSlice size={26} /></div>
            <div><p className="text-xl font-black">Topo Express</p><p className="text-sm font-medium text-zinc-500">Escolha, confira e aprove</p></div>
          </div>
          <button className="hidden min-h-12 items-center gap-2 rounded-xl border border-zinc-200 px-4 font-bold md:flex"><HelpCircle size={20} /> Ajuda</button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-7 rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <div key={label} className="min-w-0">
                <div className={`h-2 rounded-full ${index <= step ? 'bg-red-600' : 'bg-zinc-200'}`} />
                <div className="mt-2 flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black ${index <= step ? 'bg-zinc-900 text-white' : 'bg-zinc-200'}`}>{index < step ? <Check size={15} /> : index + 1}</span>
                  <span className="truncate text-xs font-bold md:text-sm">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          {step === 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-red-600"><Sparkles size={17} /> Passo 1</p>
              <h1 className="text-3xl font-black md:text-4xl">Escolha o tema</h1>
              <p className="mt-2 text-lg text-zinc-600">Toque no tema desejado.</p>
              <label className="my-6 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 focus-within:border-red-500">
                <Search size={24} className="text-zinc-500" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-transparent text-xl font-semibold outline-none" placeholder="Buscar tema..." />
              </label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {filteredThemes.map((theme) => {
                  const selected = selectedTheme?.id === theme.id;
                  return (
                    <button key={theme.id} onClick={() => selectTheme(theme)} className={`relative min-h-40 rounded-3xl border-2 p-5 text-left ${selected ? 'border-red-600 bg-red-50' : 'border-zinc-200'}`}>
                      <span className="text-5xl">{theme.emoji || '🎂'}</span>
                      <p className="mt-5 text-xl font-black">{theme.name}</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-600">{theme.models.length} {theme.models.length === 1 ? 'A4 disponível' : 'A4 disponíveis'}</p>
                      {selected && <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white"><Check size={20} /></span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-3xl">
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 2</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Nome e idade</h1>
              <p className="mt-2 text-lg text-zinc-600">Os dois são opcionais.</p>

              <div className="mt-8 space-y-8">
                <div>
                  <label className="mb-2 block text-xl font-extrabold">Nome <span className="font-semibold text-zinc-400">(opcional)</span></label>
                  <input value={childName} onChange={(e) => setChildName(e.target.value.slice(0, 24))} placeholder="Deixe vazio para não colocar nome" className="min-h-16 w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-5 text-2xl font-bold outline-none focus:border-red-500" />
                </div>

                <div>
                  <p className="mb-3 text-xl font-extrabold">Idade <span className="font-semibold text-zinc-400">(opcional)</span></p>
                  <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                    <input type="number" min="0" max="120" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Digite a idade" className="min-h-16 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-5 text-2xl font-bold outline-none focus:border-red-500" />
                    <button onClick={() => setAge('')} className={`min-h-16 rounded-2xl border-2 px-5 text-lg font-black ${age === '' ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white'}`}>Sem idade</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && selectedTheme && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 3</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Escolha a folha A4</h1>
              <p className="mt-2 text-lg text-zinc-600">A prévia representa a folha inteira no formato 210×297 mm.</p>
              <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {selectedTheme.models.map((model) => {
                  const selected = selectedModel?.id === model.id;
                  return (
                    <button key={model.id} onClick={() => setModelId(model.id)} className={`rounded-3xl border-2 p-3 text-left transition ${selected ? 'border-red-600 bg-red-50 shadow-lg shadow-red-100' : 'border-zinc-200 bg-zinc-50'}`}>
                      <A4Preview theme={selectedTheme} model={model} childName={childName} age={age} compact />
                      <div className="flex items-center justify-between px-2 pb-1 pt-4">
                        <span className="text-lg font-black">{model.name}</span>
                        {selected && <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white"><Check size={20} /></span>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 rounded-2xl bg-blue-50 p-4 font-semibold text-blue-900">Se a arte ainda não foi enviada para a pasta do tema, a folha aparecerá branca. Assim que o PNG A4 real for cadastrado, ele aparece automaticamente aqui.</div>
            </div>
          )}

          {step === 3 && selectedTheme && selectedModel && (
            <div>
              <p className="text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 4</p>
              <h1 className="mt-2 text-3xl font-black md:text-4xl">Confira o A4 final</h1>
              <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,520px)_1fr]">
                <A4Preview theme={selectedTheme} model={selectedModel} childName={childName} age={age} />
                <div className="rounded-3xl bg-zinc-50 p-6">
                  <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">Pedido</p>
                  <div className="mt-4 space-y-4 text-lg">
                    <p><strong>Tema:</strong> {selectedTheme.name}</p>
                    <p><strong>Folha:</strong> {selectedModel.name}</p>
                    <p><strong>Nome:</strong> {childName || 'Sem nome'}</p>
                    <p><strong>Idade:</strong> {age ? `${age} anos` : 'Sem idade'}</p>
                  </div>
                  <p className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 font-semibold text-emerald-900">Ao aprovar, este será o modelo enviado para produção.</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-between">
            <button onClick={previous} disabled={step === 0} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-200 px-6 text-lg font-extrabold disabled:opacity-0"><ArrowLeft size={21} /> Voltar</button>
            {step < 3 ? (
              <button onClick={next} disabled={!canContinue} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 text-lg font-extrabold text-white disabled:bg-zinc-300">Continuar <ArrowRight size={21} /></button>
            ) : (
              <button onClick={finishOrder} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-lg font-extrabold text-white"><CheckCircle2 size={22} /> Aprovar meu topo</button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
