import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CakeSlice,
  Check,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  Search,
  Sparkles,
} from 'lucide-react';

type Theme = {
  id: string;
  name: string;
  emoji: string;
  colors: [string, string];
  description: string;
};

type Order = {
  code: string;
  theme: Theme;
  childName: string;
  age: string;
  model: number;
  createdAt: string;
};

const themes: Theme[] = [
  { id: 'princesa', name: 'Princesa', emoji: '👑', colors: ['#ffb7cf', '#fff0f5'], description: 'Rosa, coroas e brilho' },
  { id: 'futebol', name: 'Futebol', emoji: '⚽', colors: ['#75c76b', '#e8f7e5'], description: 'Campo, bola e comemoração' },
  { id: 'safari', name: 'Safari', emoji: '🦁', colors: ['#f0b85b', '#fff0c9'], description: 'Bichinhos e natureza' },
  { id: 'dinossauro', name: 'Dinossauro', emoji: '🦖', colors: ['#87c79b', '#e8f8ee'], description: 'Dinos e aventura' },
  { id: 'astronauta', name: 'Astronauta', emoji: '🚀', colors: ['#8ba4df', '#eef2ff'], description: 'Espaço, estrelas e foguetes' },
  { id: 'borboletas', name: 'Borboletas', emoji: '🦋', colors: ['#c2a6e8', '#f5edff'], description: 'Leve, delicado e colorido' },
  { id: 'fazendinha', name: 'Fazendinha', emoji: '🐮', colors: ['#e1a66a', '#fff0df'], description: 'Animais e clima de fazenda' },
  { id: 'festacolorida', name: 'Festa Colorida', emoji: '🎈', colors: ['#ff9b8f', '#fff2b3'], description: 'Balões, confetes e alegria' },
];

const steps = ['Tema', 'Dados', 'Modelo', 'Confirmar'];

function makeCode() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `TB${random}`;
}

export default function App() {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [childName, setChildName] = useState('');
  const [age, setAge] = useState('');
  const [model, setModel] = useState(1);
  const [order, setOrder] = useState<Order | null>(null);

  const filteredThemes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return themes;
    return themes.filter((theme) => theme.name.toLowerCase().includes(term));
  }, [search]);

  const canContinue =
    (step === 0 && !!selectedTheme) ||
    (step === 1 && childName.trim().length >= 2 && !!age) ||
    step >= 2;

  const next = () => {
    if (!canContinue) return;
    setStep((value) => Math.min(value + 1, 3));
  };

  const previous = () => setStep((value) => Math.max(value - 1, 0));

  const finishOrder = () => {
    if (!selectedTheme) return;
    const newOrder: Order = {
      code: makeCode(),
      theme: selectedTheme,
      childName: childName.trim(),
      age,
      model,
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
    setModel(1);
    setOrder(null);
  };

  if (order) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] px-4 py-8 md:py-12">
        <div className="mx-auto flex min-h-[80vh] max-w-3xl items-center justify-center">
          <section className="w-full rounded-[32px] border border-black/5 bg-white p-6 text-center shadow-xl shadow-black/5 md:p-12">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle2 size={46} strokeWidth={2.2} />
            </div>
            <p className="mb-2 text-lg font-bold text-emerald-700">PEDIDO CRIADO</p>
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 md:text-5xl">Seu topo foi aprovado!</h1>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-zinc-600">
              Mostre o código abaixo para o atendente. Você não precisa explicar tudo novamente.
            </p>

            <div className="mx-auto my-8 max-w-md rounded-3xl bg-zinc-950 px-6 py-8 text-white">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-400">Código do pedido</p>
              <p className="mt-2 text-5xl font-black tracking-wider md:text-6xl">{order.code}</p>
            </div>

            <div className="mx-auto max-w-xl rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-left">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-500">Resumo</p>
              <div className="mt-4 grid gap-3 text-lg md:grid-cols-2">
                <p><strong>Tema:</strong> {order.theme.name}</p>
                <p><strong>Modelo:</strong> {String(order.model).padStart(2, '0')}</p>
                <p><strong>Nome:</strong> {order.childName}</p>
                <p><strong>Idade:</strong> {order.age} anos</p>
              </div>
            </div>

            <button
              onClick={restart}
              className="mt-8 inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-8 text-lg font-extrabold text-white transition hover:bg-black focus:outline-none focus:ring-4 focus:ring-zinc-300"
            >
              <RotateCcw size={21} /> Fazer outro topo
            </button>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8] text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-sm">
              <CakeSlice size={26} />
            </div>
            <div>
              <p className="text-xl font-black leading-none">Topo Express</p>
              <p className="mt-1 text-sm font-medium text-zinc-500">Monte seu topo de forma simples</p>
            </div>
          </div>
          <button className="hidden min-h-12 items-center gap-2 rounded-xl border border-zinc-200 px-4 font-bold text-zinc-700 md:flex">
            <HelpCircle size={20} /> Precisa de ajuda?
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <div className="mb-7 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 md:p-5">
          <div className="grid grid-cols-4 gap-2">
            {steps.map((label, index) => {
              const active = index === step;
              const complete = index < step;
              return (
                <div key={label} className="min-w-0">
                  <div className={`h-2 rounded-full ${index <= step ? 'bg-red-600' : 'bg-zinc-200'}`} />
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-black ${active || complete ? 'bg-zinc-900 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                      {complete ? <Check size={15} strokeWidth={3} /> : index + 1}
                    </span>
                    <span className={`truncate text-xs font-bold md:text-sm ${active ? 'text-zinc-900' : 'text-zinc-500'}`}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
          {step === 0 && (
            <div>
              <div className="mb-6">
                <p className="mb-2 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-red-600"><Sparkles size={17} /> Passo 1 de 4</p>
                <h1 className="text-3xl font-black tracking-tight md:text-4xl">Qual é o tema da festa?</h1>
                <p className="mt-2 text-lg text-zinc-600">Toque em uma opção. Você poderá conferir tudo antes de finalizar.</p>
              </div>

              <label className="mb-6 flex min-h-16 items-center gap-3 rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-4 focus-within:border-red-500">
                <Search className="text-zinc-500" size={24} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-xl font-semibold outline-none placeholder:text-zinc-400"
                  placeholder="Buscar tema..."
                  aria-label="Buscar tema"
                />
              </label>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                {filteredThemes.map((theme) => {
                  const selected = selectedTheme?.id === theme.id;
                  return (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme)}
                      className={`relative min-h-44 overflow-hidden rounded-3xl border-2 p-4 text-left transition focus:outline-none focus:ring-4 focus:ring-red-100 ${selected ? 'border-red-600 shadow-lg shadow-red-100' : 'border-zinc-200 hover:border-zinc-400'}`}
                    >
                      <div
                        className="absolute inset-0 opacity-80"
                        style={{ background: `linear-gradient(145deg, ${theme.colors[1]}, ${theme.colors[0]})` }}
                      />
                      <div className="relative flex h-full flex-col justify-between">
                        <span className="text-5xl" aria-hidden="true">{theme.emoji}</span>
                        <div>
                          <p className="text-xl font-black">{theme.name}</p>
                          <p className="mt-1 text-sm font-semibold text-zinc-700">{theme.description}</p>
                        </div>
                      </div>
                      {selected && (
                        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-red-600 text-white">
                          <Check size={20} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {filteredThemes.length === 0 && (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
                  <p className="text-xl font-black">Esse tema ainda não está disponível.</p>
                  <p className="mt-2 text-zinc-600">Peça ajuda a um atendente para registrar a sugestão.</p>
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="mx-auto max-w-3xl">
              <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 2 de 4</p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Agora, só duas informações</h1>
              <p className="mt-2 text-lg text-zinc-600">Digite exatamente como deseja ver no topo.</p>

              <div className="mt-8 space-y-7">
                <div>
                  <label htmlFor="childName" className="mb-2 block text-xl font-extrabold">Nome do aniversariante</label>
                  <input
                    id="childName"
                    autoFocus
                    value={childName}
                    onChange={(e) => setChildName(e.target.value.slice(0, 24))}
                    placeholder="Ex.: Maria Clara"
                    className="min-h-16 w-full rounded-2xl border-2 border-zinc-200 bg-zinc-50 px-5 text-2xl font-bold outline-none transition focus:border-red-500 focus:bg-white focus:ring-4 focus:ring-red-100"
                  />
                  <p className="mt-2 text-sm font-semibold text-zinc-500">Máximo de 24 caracteres.</p>
                </div>

                <div>
                  <p className="mb-3 text-xl font-extrabold">Idade</p>
                  <div className="grid grid-cols-5 gap-2 md:grid-cols-10">
                    {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                      <button
                        key={value}
                        onClick={() => setAge(value)}
                        className={`min-h-16 rounded-2xl border-2 text-2xl font-black transition focus:outline-none focus:ring-4 focus:ring-red-100 ${age === value ? 'border-red-600 bg-red-600 text-white' : 'border-zinc-200 bg-white hover:border-zinc-400'}`}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && selectedTheme && (
            <div>
              <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 3 de 4</p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Escolha o estilo que mais gostou</h1>
              <p className="mt-2 text-lg text-zinc-600">São variações do mesmo tema. Toque em uma para selecionar.</p>

              <div className="mt-8 grid gap-5 md:grid-cols-3">
                {[1, 2, 3].map((option) => (
                  <button
                    key={option}
                    onClick={() => setModel(option)}
                    className={`overflow-hidden rounded-3xl border-2 text-left transition focus:outline-none focus:ring-4 focus:ring-red-100 ${model === option ? 'border-red-600 shadow-xl shadow-red-100' : 'border-zinc-200 hover:border-zinc-400'}`}
                  >
                    <div
                      className="relative aspect-[4/5] p-5"
                      style={{ background: `linear-gradient(${option * 35}deg, ${selectedTheme.colors[1]}, ${selectedTheme.colors[0]})` }}
                    >
                      <div className={`flex h-full flex-col items-center justify-center rounded-[28px] border-4 border-white/80 bg-white/40 text-center ${option === 2 ? 'rotate-1' : option === 3 ? '-rotate-1' : ''}`}>
                        <span className="text-7xl">{selectedTheme.emoji}</span>
                        <p className="mt-5 max-w-[90%] break-words text-3xl font-black uppercase tracking-tight">{childName || 'Nome'}</p>
                        <div className="mt-4 rounded-full bg-white/85 px-5 py-2 text-xl font-black">{age || '0'} anos</div>
                        <p className="mt-6 text-sm font-extrabold uppercase tracking-[0.18em] text-zinc-700">{selectedTheme.name}</p>
                      </div>
                      {model === option && <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow"><Check size={22} strokeWidth={3} /></span>}
                    </div>
                    <div className="flex items-center justify-between bg-white p-4">
                      <span className="text-lg font-black">Modelo {String(option).padStart(2, '0')}</span>
                      <ChevronRight size={22} />
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-center font-bold text-amber-900">Nesta primeira versão, as artes são prévias demonstrativas. Na próxima etapa vamos conectar os PNGs reais da gráfica.</p>
            </div>
          )}

          {step === 3 && selectedTheme && (
            <div className="mx-auto max-w-4xl">
              <p className="mb-2 text-sm font-extrabold uppercase tracking-wider text-red-600">Passo 4 de 4</p>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">Confira antes de aprovar</h1>
              <p className="mt-2 text-lg text-zinc-600">Veja se o nome, a idade e o tema estão corretos.</p>

              <div className="mt-8 grid gap-6 md:grid-cols-[1fr_1.1fr]">
                <div
                  className="flex min-h-[380px] items-center justify-center rounded-3xl p-6"
                  style={{ background: `linear-gradient(145deg, ${selectedTheme.colors[1]}, ${selectedTheme.colors[0]})` }}
                >
                  <div className="flex h-full min-h-[330px] w-full flex-col items-center justify-center rounded-[28px] border-4 border-white/80 bg-white/40 text-center">
                    <span className="text-8xl">{selectedTheme.emoji}</span>
                    <p className="mt-5 max-w-[90%] break-words text-4xl font-black uppercase tracking-tight">{childName}</p>
                    <div className="mt-4 rounded-full bg-white/90 px-6 py-3 text-2xl font-black">{age} anos</div>
                  </div>
                </div>

                <div className="flex flex-col justify-between rounded-3xl border border-zinc-200 bg-zinc-50 p-6">
                  <div>
                    <p className="text-sm font-extrabold uppercase tracking-wider text-zinc-500">Resumo do topo</p>
                    <dl className="mt-5 divide-y divide-zinc-200 text-lg">
                      <div className="flex justify-between gap-4 py-4"><dt className="font-semibold text-zinc-600">Tema</dt><dd className="text-right font-black">{selectedTheme.name}</dd></div>
                      <div className="flex justify-between gap-4 py-4"><dt className="font-semibold text-zinc-600">Nome</dt><dd className="text-right font-black">{childName}</dd></div>
                      <div className="flex justify-between gap-4 py-4"><dt className="font-semibold text-zinc-600">Idade</dt><dd className="text-right font-black">{age} anos</dd></div>
                      <div className="flex justify-between gap-4 py-4"><dt className="font-semibold text-zinc-600">Modelo</dt><dd className="text-right font-black">{String(model).padStart(2, '0')}</dd></div>
                    </dl>
                  </div>
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-relaxed text-emerald-900">
                    Ao aprovar, o pedido recebe um código para o balcão. Alterações depois da aprovação precisarão ser solicitadas ao atendimento.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-zinc-200 pt-6 sm:flex-row sm:justify-between">
            <button
              onClick={previous}
              disabled={step === 0}
              className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border-2 border-zinc-200 px-6 text-lg font-extrabold text-zinc-700 transition hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-0"
            >
              <ArrowLeft size={21} /> Voltar
            </button>

            {step < 3 ? (
              <button
                onClick={next}
                disabled={!canContinue}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600 px-8 text-lg font-extrabold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:shadow-none"
              >
                Continuar <ArrowRight size={21} />
              </button>
            ) : (
              <button
                onClick={finishOrder}
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 text-lg font-extrabold text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-200"
              >
                <CheckCircle2 size={22} /> Aprovar meu topo
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
