import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Dumbbell, 
  History as HistoryIcon, 
  TrendingUp, 
  LayoutDashboard, 
  Plus,
  ChevronRight,
  CheckCircle2,
  Trash2,
  Timer,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Trophy,
  ArrowLeft,
  Edit2,
  Check,
  X,
  PlusCircle,
  PlusSquare,
  Settings2,
  Calculator,
  Clock,
  NotebookPen,
  CalendarDays,
  Sparkles,
  Loader2,
  Lightbulb,
  MessageSquareQuote,
  Save,
  CloudCheck,
  Scan as ScanIcon,
  Image as ImageIcon,
  FileSearch,
  StickyNote,
  Zap,
  Weight,
  Home as HomeIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis, Cell } from 'recharts';

// Imports de tipos e constantes
import { WorkoutSession, ActiveExercise, WorkoutSet, WorkoutTemplate, Exercise, PersonalRecord } from './types';
import { EXERCISES as DEFAULT_EXERCISES, WORKOUT_TEMPLATES as DEFAULT_TEMPLATES } from './constants';
import { getMotivationalQuote, getExerciseTip, scanWorkoutFromImage, AiTipResponse } from './services/geminiService';

// --- Helpers de UI ---

const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
  if (!window.navigator.vibrate) return;
  if (type === 'light') window.navigator.vibrate(15);
  else if (type === 'medium') window.navigator.vibrate(30);
  else if (type === 'success') window.navigator.vibrate([40, 30, 40]);
};

const formatDuration = (ms: number) => {
  if (ms <= 0 || isNaN(ms)) return "00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const formatDurationFull = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
};

// --- Componentes Compartilhados ---

const RestTimer = ({ exerciseId }: { exerciseId: string }) => {
  const END_TIME_KEY = `titanlift_rest_end_${exerciseId}`;
  const [min, setMin] = useState(1);
  const [sec, setSec] = useState(30);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const check = () => {
      const end = localStorage.getItem(END_TIME_KEY);
      if (end) {
        const rem = Math.floor((parseInt(end) - Date.now()) / 1000);
        if (rem > 0) setTimeLeft(rem);
        else { setTimeLeft(0); localStorage.removeItem(END_TIME_KEY); }
      }
    };
    check();
    const interval = setInterval(check, 1000);
    const handleStart = (e: any) => { if (e.detail.exerciseId === exerciseId) start(); };
    window.addEventListener('titanlift_start_rest', handleStart);
    return () => { clearInterval(interval); window.removeEventListener('titanlift_start_rest', handleStart); };
  }, [exerciseId]);

  const start = () => {
    const total = (min * 60) + sec;
    if (total > 0) {
      localStorage.setItem(END_TIME_KEY, (Date.now() + total * 1000).toString());
      setTimeLeft(total);
    }
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-2xl p-1.5 px-3 flex items-center justify-between shadow-inner">
      <div className="flex items-center gap-2"><Timer size={13} className="text-indigo-400" /><span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Descanso</span></div>
      {timeLeft > 0 ? (
        <div className="flex items-center gap-2">
          <span className={`text-sm font-black tabular-nums ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
          <button onClick={() => { localStorage.removeItem(END_TIME_KEY); setTimeLeft(0); }} className="text-gray-500 p-1"><RotateCcw size={12}/></button>
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <input type="number" value={min} onChange={e => setMin(Number(e.target.value))} className="w-7 bg-gray-950 border border-gray-800 text-center rounded text-xs font-bold" />
          <span className="text-gray-600">:</span>
          <input type="number" value={sec} onChange={e => setSec(Number(e.target.value))} className="w-7 bg-gray-950 border border-gray-800 text-center rounded text-xs font-bold" />
          <button onClick={start} className="bg-indigo-600 text-white p-1 rounded-lg ml-1"><Play size={10} fill="currentColor"/></button>
        </div>
      )}
    </div>
  );
};

const PlateCalculator = ({ weight, onClose }: { weight: number, onClose: () => void }) => {
  const targetSide = (weight - 20) / 2;
  const plates = [25, 20, 15, 10, 5, 2, 1];
  const result: number[] = [];
  let rem = targetSide;
  plates.forEach(p => { while (rem >= p) { result.push(p); rem -= p; } });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-xs rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6"><h3 className="font-black text-indigo-400 uppercase text-[10px] tracking-widest">Anilhas por lado</h3><button onClick={onClose} className="text-gray-500"><X size={20}/></button></div>
        <div className="text-center mb-8"><p className="text-4xl font-black">{weight}kg</p><p className="text-[10px] text-gray-500 uppercase mt-2">Barra de 20kg</p></div>
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {result.length > 0 ? result.map((p, i) => <div key={i} className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 px-3 py-1.5 rounded-2xl text-xs font-black">{p}kg</div>) : <p className="text-xs text-gray-600 italic">Apenas barra.</p>}
        </div>
        <button onClick={onClose} className="w-full bg-gray-800 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-300">Fechar</button>
      </div>
    </div>
  );
};

// --- Telas ---

const Home = ({ sessions, templates }: any) => {
  const [quote, setQuote] = useState("Titan Mode On.");
  const [activeDuration, setActiveDuration] = useState("00:00:00");
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    getMotivationalQuote().then(setQuote);
    const interval = setInterval(() => {
      let total = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
      if (localStorage.getItem('titanlift_timer_is_running') === 'true') {
        const start = localStorage.getItem('titanlift_active_start_time');
        if (start) total += Date.now() - parseInt(start);
      }
      setActiveDuration(formatDuration(total));
      const drafts = Object.keys(localStorage).filter(k => k.startsWith('titanlift_draft_'));
      if (drafts.length > 0) setActiveId(drafts[0].replace('titanlift_draft_', ''));
      else setActiveId(null);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleTimer = (action: 'start' | 'pause' | 'reset') => {
    if (action === 'start') {
      localStorage.setItem('titanlift_active_start_time', Date.now().toString());
      localStorage.setItem('titanlift_timer_is_running', 'true');
    } else if (action === 'pause') {
      const elapsed = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
      const start = localStorage.getItem('titanlift_active_start_time');
      if (start) localStorage.setItem('titanlift_active_elapsed_time', (elapsed + (Date.now() - parseInt(start))).toString());
      localStorage.removeItem('titanlift_active_start_time');
      localStorage.setItem('titanlift_timer_is_running', 'false');
    } else {
      if (confirm("Resetar cronômetro?")) {
        localStorage.setItem('titanlift_active_elapsed_time', '0');
        localStorage.removeItem('titanlift_active_start_time');
        localStorage.setItem('titanlift_timer_is_running', 'false');
      }
    }
    triggerHaptic('light');
  };

  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto md:pl-28">
      <header className="mb-10 pt-4 flex justify-between items-start">
        <div><h1 className="text-4xl font-black text-white tracking-tighter">TitanLift</h1><p className="text-gray-500 italic text-xs">"{quote}"</p></div>
        <Link to="/scan" className="bg-indigo-600/10 p-3 rounded-2xl border border-indigo-500/20 text-indigo-500 active:scale-90 transition-transform"><ScanIcon size={24}/></Link>
      </header>

      <div className={`border rounded-[2.5rem] p-8 mb-10 transition-all ${activeId ? 'bg-indigo-900/10 border-indigo-500/30 shadow-[0_0_30px_rgba(79,70,229,0.1)]' : 'bg-gray-900 border-gray-800'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2"><Clock size={18} className="text-gray-500"/><h2 className="text-[11px] font-black uppercase tracking-widest text-gray-300">Tempo de Academia</h2></div>
          {activeId && <Link to={`/active/${activeId}`} className="text-[9px] font-black uppercase bg-indigo-600/20 px-3 py-1 rounded-full text-indigo-400">Retomar</Link>}
        </div>
        <div className="text-center"><span className="text-6xl font-black tabular-nums">{activeDuration}</span>
          <div className="flex justify-center gap-4 mt-8">
            <button onClick={() => handleTimer('reset')} className="p-3 bg-gray-800 text-gray-500 rounded-2xl border border-gray-700 active:scale-90"><RotateCcw size={18}/></button>
            <button onClick={() => handleTimer(localStorage.getItem('titanlift_timer_is_running') === 'true' ? 'pause' : 'start')} className={`px-12 py-3 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all ${localStorage.getItem('titanlift_timer_is_running') === 'true' ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'}`}>{localStorage.getItem('titanlift_timer_is_running') === 'true' ? 'Pausar' : 'Play'}</button>
          </div>
        </div>
      </div>

      <section><h2 className="text-xl font-black mb-6 tracking-tight">Meus Planos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.slice(0, 4).map((t: any) => (
            <Link key={t.id} to={`/active/${t.id}`} className="bg-gray-900 border border-gray-800 p-6 rounded-[2rem] group hover:border-indigo-500/50 transition-all relative overflow-hidden">
              <h3 className="font-black text-white mb-1">{t.name}</h3><p className="text-gray-500 text-[10px] mb-4">{t.description}</p>
              <div className="text-indigo-500 font-black text-[9px] uppercase tracking-widest flex items-center gap-1">Treinar Agora <ArrowRight size={12}/></div>
              <Dumbbell className="absolute -right-4 -bottom-4 text-gray-800/10 group-hover:text-indigo-500/5 transition-colors" size={80} />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

const WorkoutList = ({ 
  templates, 
  onUpdateTemplates,
  exercises,
  onUpdateExercises
}: { 
  templates: WorkoutTemplate[], 
  onUpdateTemplates: (t: WorkoutTemplate[]) => void,
  exercises: Exercise[],
  onUpdateExercises: (e: Exercise[]) => void
}) => {
  const [isManage, setIsManage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempName, setTempName] = useState("");
  const navigate = useNavigate();

  const handleEditTemplate = (t: WorkoutTemplate) => { setEditingId(t.id); setTempName(t.name); };
  const saveEditTemplate = () => {
    if (editingId && tempName.trim()) {
      onUpdateTemplates(templates.map(t => t.id === editingId ? { ...t, name: tempName } : t));
      setEditingId(null);
    }
  };

  const deleteT = (id: string) => { if (confirm("Excluir este plano permanentemente?")) onUpdateTemplates(templates.filter(t => t.id !== id)); };

  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto md:pl-28 pt-10">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-black tracking-tighter">Seus Planos</h1>
        <button onClick={() => setIsManage(!isManage)} className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border transition-all ${isManage ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
          {isManage ? 'Pronto' : 'Ajustar'}
        </button>
      </div>

      <div className="grid gap-6">
        {templates.map((t: any) => (
          <div key={t.id} className="relative group">
            <div className={`bg-gray-900 border border-gray-800 p-6 rounded-[2.5rem] shadow-xl transition-all ${isManage ? 'ring-2 ring-indigo-500/20' : 'hover:border-indigo-500/50 hover:bg-gray-900/50'}`}>
              <div className="flex justify-between items-start mb-6">
                {editingId === t.id ? (
                  <div className="flex gap-2 flex-1 animate-in slide-in-from-left-2">
                    <input className="flex-1 bg-gray-800 border border-indigo-500 rounded-xl px-4 py-2 text-white font-bold text-sm outline-none" value={tempName} onChange={e => setTempName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveEditTemplate()} autoFocus />
                    <button onClick={saveEditTemplate} className="text-white bg-emerald-600 p-2 rounded-xl shadow-lg"><Check size={20}/></button>
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-white tracking-tight">{t.name}</h3>
                      {isManage && <button onClick={() => handleEditTemplate(t)} className="text-gray-600 hover:text-indigo-400"><Edit2 size={16}/></button>}
                    </div>
                    <p className="text-gray-500 text-xs font-medium">{t.description}</p>
                  </div>
                )}
                {!isManage && !editingId && (
                  <Link to={`/active/${t.id}`} className="bg-indigo-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-indigo-600/20 active:scale-90 transition-transform"><Play size={24} fill="currentColor" /></Link>
                )}
                {isManage && (
                  <button onClick={() => deleteT(t.id)} className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded-[1.5rem] hover:bg-red-600 hover:text-white transition-all active:scale-90"><Trash2 size={24}/></button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-800/50">
                <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/10 shadow-sm">
                  <Zap size={10} strokeWidth={3} />
                  <span className="text-[9px] font-black uppercase tracking-widest">{t.exercises.length} Exercícios</span>
                </div>
                {t.exercises.slice(0, 2).map((exId: any, i: number) => (
                  <span key={i} className="text-[9px] font-black uppercase tracking-widest text-gray-500 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                    {exercises.find(e => e.id === exId)?.name || 'Exercício'}
                  </span>
                ))}
                {t.exercises.length > 2 && <span className="text-[9px] font-black uppercase tracking-widest text-gray-600 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">+{t.exercises.length - 2}</span>}
              </div>
            </div>
          </div>
        ))}

        <button onClick={() => { const newT = { id: `custom-${Date.now()}`, name: 'Novo Plano', description: 'Personalizado', exercises: [] }; onUpdateTemplates([newT, ...templates]); setIsManage(true); }} className="w-full border-2 border-dashed border-gray-800 rounded-[2.5rem] py-10 flex flex-col items-center justify-center gap-3 hover:border-indigo-500/50 hover:bg-indigo-900/5 transition-all text-gray-500 hover:text-indigo-400 group">
          <PlusCircle size={36} className="group-hover:scale-110 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Criar Novo Plano de Treino</span>
        </button>
      </div>
    </div>
  );
};

const ActiveWorkoutWrapper = (props: any) => {
  const { id } = useParams();
  return <ActiveWorkout key={id} {...props} />;
};

const ActiveWorkout = ({ 
  templates, 
  exercises,
  onSaveSession 
}: { 
  templates: WorkoutTemplate[], 
  exercises: Exercise[],
  onSaveSession: (session: WorkoutSession) => void 
}) => {
  const { id: templateId } = useParams();
  const navigate = useNavigate();
  const template = templates.find(t => t.id === templateId);
  
  const DRAFT_KEY = `titanlift_draft_${templateId}`;
  const START_TIME_KEY = 'titanlift_active_start_time';
  const TIMER_RUNNING_KEY = 'titanlift_timer_is_running';
  
  const isMounted = useRef(false);

  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      try { return JSON.parse(draft); } catch(e) { console.error("Falha ao restaurar rascunho", e); }
    }
    
    return template?.exercises.map(exId => {
      const memoryKey = `titanlift_config_v2_${exId}`;
      const memory = localStorage.getItem(memoryKey);
      if (memory) {
        try {
          const config = JSON.parse(memory);
          return {
            exerciseId: exId,
            name: exercises.find(e => e.id === exId)?.name || 'Exercício',
            sets: config.sets.map((s: any) => ({ ...s, completed: false })),
            notes: config.notes || ''
          };
        } catch {}
      }
      return {
        exerciseId: exId,
        name: exercises.find(e => e.id === exId)?.name || 'Exercício',
        sets: Array(3).fill(null).map(() => ({ reps: 10, weight: 0, completed: false })),
        notes: ''
      };
    }) || [];
  });

  const [activeDuration, setActiveDuration] = useState("00:00:00");
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [editingExIndex, setEditingExIndex] = useState<number | null>(null);
  const [aiTips, setAiTips] = useState<Record<number, { text?: string; loading: boolean }>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [plateWeight, setPlateWeight] = useState<number | null>(null);
  const [isManageMode, setIsManageMode] = useState(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    setIsSyncing(true);
    const timeout = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(activeExercises));
      setIsSyncing(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [activeExercises, DRAFT_KEY]);

  useEffect(() => {
    localStorage.setItem('titanlift_last_active_template', templateId || '');
    const interval = setInterval(() => {
      let total = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
      if (localStorage.getItem(TIMER_RUNNING_KEY) === 'true') {
        const start = localStorage.getItem(START_TIME_KEY);
        if (start) total += Date.now() - parseInt(start);
      }
      setActiveDuration(formatDuration(total));
    }, 1000);
    return () => clearInterval(interval);
  }, [templateId]);

  const updateSet = (exIdx: number, setIdx: number, field: keyof WorkoutSet, value: any) => {
    if (localStorage.getItem(TIMER_RUNNING_KEY) !== 'true') {
      localStorage.setItem(START_TIME_KEY, Date.now().toString());
      localStorage.setItem(TIMER_RUNNING_KEY, 'true');
    }
    const updated = [...activeExercises];
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
    if (field === 'completed' && value === true) {
      triggerHaptic('medium');
      window.dispatchEvent(new CustomEvent('titanlift_start_rest', { detail: { exerciseId: updated[exIdx].exerciseId } }));
    }
    setActiveExercises(updated);
  };

  const handleAiTip = async (exIdx: number, name: string) => {
    setAiTips(prev => ({ ...prev, [exIdx]: { loading: true } }));
    const tip = await getExerciseTip(name);
    setAiTips(prev => ({ ...prev, [exIdx]: { text: tip.text, loading: false } }));
  };

  const handleFinish = () => {
    const durationMs = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
    const session = { id: Date.now().toString(), templateId: templateId || 'custom', templateName: template?.name || 'Personalizado', date: new Date().toISOString(), exercises: activeExercises, durationMs };
    onSaveSession(session);
    localStorage.removeItem(DRAFT_KEY);
    localStorage.setItem(TIMER_RUNNING_KEY, 'false'); 
    localStorage.setItem('titanlift_active_elapsed_time', '0');
    triggerHaptic('success'); navigate('/');
  };

  if (!template) return null;

  return (
    <div className="p-4 pb-32 max-w-4xl mx-auto md:pl-28">
      <div className="fixed top-12 left-0 right-0 z-[100] bg-gray-950/95 backdrop-blur-xl px-6 py-3 border-b border-gray-800 flex justify-between items-center md:left-20">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{activeDuration}</span>
          {isSyncing ? <Loader2 size={10} className="animate-spin text-gray-600" /> : <CloudCheck size={10} className="text-emerald-500/40" />}
        </div>
        <button onClick={() => setIsManageMode(!isManageMode)} className={`px-3 py-1 rounded-full border text-[8px] font-black uppercase transition-all ${isManageMode ? 'bg-indigo-600 text-white' : 'text-gray-500 border-gray-800'}`}>Ajustar</button>
      </div>

      <div className="flex items-center gap-4 pt-36 mb-8"><button onClick={() => navigate('/')} className="text-gray-500"><ArrowLeft size={20}/></button><h1 className="text-2xl font-black">{template.name}</h1></div>

      <div className="space-y-6">{activeExercises.map((ex, exIdx) => (
        <div key={exIdx} className={`bg-gray-900 border border-gray-800 rounded-[2.2rem] p-5 shadow-2xl transition-all ${editingExIndex === exIdx ? 'ring-2 ring-indigo-500/30' : ''}`}>
          <div className="flex justify-between items-center mb-4">
            {editingExIndex === exIdx ? (
              <div className="flex gap-2 flex-1 items-center animate-in slide-in-from-left-2">
                <input 
                  className="flex-1 bg-gray-950 border border-indigo-500 rounded-xl px-3 py-1.5 text-white font-bold text-sm outline-none" 
                  value={ex.name} 
                  onChange={e => {
                    const updated = [...activeExercises];
                    updated[exIdx].name = e.target.value;
                    setActiveExercises(updated);
                  }}
                  onKeyDown={e => e.key === 'Enter' && setEditingExIndex(null)}
                  onBlur={() => setEditingExIndex(null)}
                  autoFocus
                />
                <button onClick={() => setEditingExIndex(null)} className="bg-emerald-600 text-white p-2 rounded-xl"><Check size={16}/></button>
              </div>
            ) : (
              <h2 className="text-white font-black text-base">{ex.name}</h2>
            )}
            
            {!editingExIndex && (
              <div className="flex gap-2 ml-2">
                {isManageMode && <button onClick={() => setEditingExIndex(exIdx)} className="text-indigo-400 hover:text-indigo-300 p-2 rounded-xl bg-indigo-500/10"><Edit2 size={14}/></button>}
                <button onClick={() => setEditingNoteIndex(editingNoteIndex === exIdx ? null : exIdx)} className={`p-2 rounded-xl border ${ex.notes ? 'bg-indigo-600/20 border-indigo-500/30 text-indigo-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}><StickyNote size={14}/></button>
                <button onClick={() => handleAiTip(exIdx, ex.name)} className={`p-2 rounded-xl border ${aiTips[exIdx]?.text ? 'bg-amber-500/10 border-amber-500/30 text-amber-500' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>{aiTips[exIdx]?.loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14}/>}</button>
                {isManageMode && <button onClick={() => { if(confirm("Remover exercício?")) setActiveExercises(activeExercises.filter((_, i) => i !== exIdx)) }} className="bg-red-500/10 text-red-500 p-2 rounded-xl border border-red-500/20"><Trash2 size={14}/></button>}
              </div>
            )}
          </div>

          {editingNoteIndex === exIdx && (
            <textarea placeholder="Sua anotação técnica..." className="w-full bg-gray-950 border border-gray-800 rounded-2xl p-4 text-xs text-gray-300 h-24 mb-4 outline-none focus:ring-1 focus:ring-indigo-500 animate-in slide-in-from-top-2" value={ex.notes} onChange={e => {
              const updated = [...activeExercises];
              updated[exIdx].notes = e.target.value;
              setActiveExercises(updated);
            }} />
          )}

          {aiTips[exIdx]?.text && <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-3xl mb-5 flex gap-3 animate-in fade-in"><Lightbulb className="text-amber-500 shrink-0" size={16}/><p className="text-[10px] italic text-gray-300">"{aiTips[exIdx].text}"</p></div>}
          
          <div className="mb-5"><RestTimer exerciseId={ex.exerciseId} /></div>

          <div className="space-y-2">
            <div className="grid grid-cols-4 text-[9px] font-black text-gray-600 uppercase text-center mb-1"><span>Série</span><span>Peso (kg)</span><span>Reps</span><span>OK</span></div>
            {ex.sets.map((set, setIdx) => (
              <div key={setIdx} className={`grid grid-cols-4 items-center gap-2.5 p-1 rounded-2xl transition-all ${set.completed ? 'bg-emerald-500/5 opacity-60' : 'bg-gray-950/50'}`}>
                <span className="text-center text-xs font-black text-gray-600">{setIdx + 1}</span>
                <div className="relative">
                  <input type="number" className="w-full bg-gray-800 rounded-xl h-10 text-center font-black text-sm outline-none" value={set.weight === 0 ? '' : set.weight} placeholder="0" onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value === '' ? 0 : Number(e.target.value))} />
                  <button onClick={() => setPlateWeight(Number(set.weight))} className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-600"><Calculator size={11}/></button>
                </div>
                <input type="number" className="bg-gray-800 rounded-xl h-10 text-center font-black text-sm outline-none" value={set.reps === 0 ? '' : set.reps} placeholder="0" onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value === '' ? 0 : Number(e.target.value))} />
                <button onClick={() => updateSet(exIdx, setIdx, 'completed', !set.completed)} className={`h-10 rounded-xl flex items-center justify-center transition-all ${set.completed ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-gray-800 text-gray-500'}`}><Check size={18} strokeWidth={3}/></button>
              </div>
            ))}
            <button onClick={() => { const updated = [...activeExercises]; const last = updated[exIdx].sets[updated[exIdx].sets.length - 1]; updated[exIdx].sets.push({ ...last, completed: false }); setActiveExercises(updated); triggerHaptic('light'); }} className="w-full border border-dashed border-gray-800 text-gray-500 py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-widest mt-2 hover:border-indigo-500/30 transition-all">+ Adicionar Série</button>
          </div>
        </div>
      ))}</div>
      
      <button onClick={() => { const updated = [...activeExercises, { exerciseId: `custom-${Date.now()}`, name: 'Novo Exercício', sets: [{ reps: 10, weight: 0, completed: false }], notes: '' }]; setActiveExercises(updated); triggerHaptic('light'); }} className="w-full bg-gray-900 border border-indigo-500/20 text-indigo-400 py-4 rounded-[2rem] font-black text-[10px] uppercase tracking-widest mt-8 flex items-center justify-center gap-2 shadow-xl">+ Novo Exercício</button>
      
      {/* BOTÕES FLUTUANTES COMPACTOS E UNIFORMES */}
      <div className="fixed bottom-24 right-5 flex flex-col gap-3 z-[200]">
        <Link 
          to="/" 
          className="bg-gray-800 text-gray-400 p-3.5 rounded-full shadow-xl active:scale-90 transition-all border-2 border-gray-950 flex items-center justify-center ring-1 ring-gray-700/30"
        >
          <HomeIcon size={20} />
        </Link>
        <button 
          onClick={handleFinish} 
          className="bg-emerald-600 text-white p-3.5 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-90 transition-all border-2 border-gray-950 ring-2 ring-emerald-500/20 flex items-center justify-center"
        >
          <CheckCircle2 size={20} strokeWidth={3} />
        </button>
      </div>

      {plateWeight !== null && <PlateCalculator weight={plateWeight} onClose={() => setPlateWeight(null)} />}
    </div>
  );
};

const ScanWorkout = ({ onAddTemplate }: any) => {
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState<any>(null);
  const navigate = useNavigate();

  const handleFile = (e: any) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      setLoading(true); triggerHaptic('light');
      try {
        const data = await scanWorkoutFromImage(reader.result as string);
        setScanned(data); triggerHaptic('success');
      } catch { alert("Erro ao ler imagem."); } finally { setLoading(false); }
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    const newT = { id: `sc-${Date.now()}`, name: scanned.workoutName || "Treino IA", description: "Via Scan", exercises: scanned.exercises.map((ex: any) => ex.name) };
    onAddTemplate(newT); navigate('/workouts');
  };

  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto md:pl-28 pt-10 text-center">
      <h1 className="text-3xl font-black mb-10 tracking-tighter">Scan de Treino</h1>
      {!scanned && !loading && (
        <label className="block w-full border-2 border-dashed border-gray-800 rounded-[3rem] py-24 bg-gray-900/20 cursor-pointer hover:border-indigo-500 transition-all">
          <ImageIcon size={48} className="mx-auto text-indigo-500 mb-4"/><p className="font-bold text-gray-300">Escolher Foto ou Print</p><input type="file" className="hidden" onChange={handleFile} />
        </label>
      )}
      {loading && <div className="py-20 flex flex-col items-center gap-4"><Loader2 size={48} className="animate-spin text-indigo-500"/><p className="text-white font-black">Analisando imagem via IA...</p></div>}
      {scanned && (
        <div className="bg-gray-900 border border-gray-800 p-8 rounded-[3rem] text-left">
          <h2 className="text-2xl font-black mb-6">{scanned.workoutName || "Detectado"}</h2>
          <div className="space-y-3 mb-8">{scanned.exercises.map((ex: any, i: number) => <div key={i} className="flex justify-between items-center bg-gray-950/50 p-4 rounded-2xl border border-gray-800"><span className="text-sm font-bold">{ex.name}</span><span className="text-[10px] font-black uppercase text-indigo-500">{ex.setsCount}x{ex.repsSuggested}</span></div>)}</div>
          <button onClick={save} className="w-full bg-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-600/20">Salvar nos Planos</button>
        </div>
      )}
    </div>
  );
};

const History = ({ sessions, onDeleteSession }: { sessions: WorkoutSession[], onDeleteSession: (id: string) => void }) => {
  const stats = useMemo(() => {
    return [...sessions].reverse().slice(-7).map((s: any) => ({
      date: new Date(s.date).toLocaleDateString([], { day: '2-digit', month: '2-digit' }),
      time: Math.round((s.durationMs || 0) / 1000)
    }));
  }, [sessions]);

  const totalVolume = useMemo(() => sessions.reduce((acc, s) => acc + s.exercises.reduce((exAcc, ex) => exAcc + ex.sets.reduce((setAcc, set) => setAcc + (set.weight || 0), 0), 0), 0), [sessions]);
  const totalSets = useMemo(() => sessions.reduce((acc, s) => acc + s.exercises.reduce((exAcc, ex) => exAcc + ex.sets.filter(st => st.completed).length, 0), 0), [sessions]);

  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto md:pl-28 pt-10">
      <h1 className="text-3xl font-black tracking-tighter mb-8">Histórico</h1>
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-[2rem] shadow-xl">
          <div className="flex items-center gap-2 mb-2"><Weight size={14} className="text-indigo-400"/><span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Volume Total</span></div>
          <p className="text-xl font-black text-white">{totalVolume}<span className="text-[10px] text-gray-500 ml-1">kg</span></p>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-5 rounded-[2rem] shadow-xl">
          <div className="flex items-center gap-2 mb-2"><CheckCircle2 size={14} className="text-emerald-400"/><span className="text-[8px] font-black uppercase tracking-widest text-gray-500">Séries OK</span></div>
          <p className="text-xl font-black text-white">{totalSets}</p>
        </div>
      </div>
      {sessions.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-[2.5rem] p-6 mb-10 shadow-2xl">
          <h2 className="text-[10px] font-black uppercase text-gray-500 mb-6 tracking-widest flex items-center gap-2">Constância Recente</h2>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats}>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#6b7280', fontWeight: 'bold'}} />
                <Tooltip cursor={{fill: 'rgba(99,102,241,0.05)'}} content={({ payload }) => payload?.[0] ? <div className="bg-gray-950 p-2 border border-gray-800 rounded-xl text-[10px] font-black text-indigo-400">{formatDuration(payload[0].value as number * 1000)}</div> : null} />
                <Bar dataKey="time" fill="#6366f1" radius={[6, 6, 0, 0]}>
                  {stats.map((_, i) => <Cell key={i} fill={i === stats.length - 1 ? '#818cf8' : '#6366f1'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      <div className="space-y-6">
        {sessions.length === 0 ? (
          <div className="text-center py-24 bg-gray-900/30 border-2 border-dashed border-gray-800 rounded-[3rem] flex flex-col items-center gap-4">
            <HistoryIcon size={48} className="text-gray-800" />
            <p className="text-gray-500 text-xs font-black uppercase tracking-widest">Nada por aqui ainda.</p>
          </div>
        ) : (
          sessions.map((s: any) => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 p-6 rounded-[2.5rem] relative group shadow-2xl transition-all hover:border-gray-700">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="font-black text-indigo-400 text-xl tracking-tight mb-1">{s.templateName}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays size={12}/> {new Date(s.date).toLocaleDateString()} • {formatDurationFull(s.durationMs || 0)}
                  </p>
                </div>
                <button onClick={() => { if (confirm("Apagar este registro permanentemente?")) onDeleteSession(s.id); }} className="text-gray-700 hover:text-red-500 p-2 active:scale-90 transition-transform"><Trash2 size={20}/></button>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-950/50 p-4 rounded-3xl border border-gray-800/50 flex flex-col items-center">
                  <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Exercícios</p>
                  <p className="text-lg font-black text-white">{s.exercises.length}</p>
                </div>
                <div className="bg-gray-950/50 p-4 rounded-3xl border border-gray-800/50 flex flex-col items-center">
                  <p className="text-[8px] font-black text-gray-600 uppercase mb-1">Total Séries</p>
                  <p className="text-lg font-black text-white">{s.exercises.reduce((a: any, b: any) => a + b.sets.filter((st: any) => st.completed).length, 0)}</p>
                </div>
              </div>
              {s.exercises.some((e: any) => e.notes) && (
                <div className="mt-2 p-4 bg-gray-950/30 rounded-3xl border border-gray-800/50 italic text-[11px] text-gray-400 flex gap-3 leading-relaxed">
                  <MessageSquareQuote size={16} className="text-indigo-400 shrink-0"/> 
                  <span>{s.exercises.find((e: any) => e.notes).notes}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- Navbar ---

const Navbar = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-gray-950/90 backdrop-blur-xl border-t border-gray-800 px-8 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-between items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-screen md:border-r md:border-t-0">
    <Link to="/" className="p-3 text-indigo-500"><LayoutDashboard size={24} /></Link>
    <Link to="/workouts" className="p-3 text-gray-400 hover:text-indigo-400"><Dumbbell size={24} /></Link>
    <Link to="/scan" className="p-3 text-gray-400 hover:text-indigo-400"><ScanIcon size={24} /></Link>
    <Link to="/progress" className="p-3 text-gray-400 hover:text-indigo-400"><TrendingUp size={24} /></Link>
    <Link to="/history" className="p-3 text-gray-400 hover:text-indigo-400"><HistoryIcon size={24} /></Link>
  </nav>
);

// --- App Root ---

export default function App() {
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => JSON.parse(localStorage.getItem('titanlift_sessions') || '[]'));
  const [templates, setTemplates] = useState<WorkoutTemplate[]>(() => JSON.parse(localStorage.getItem('titanlift_templates') || JSON.stringify(DEFAULT_TEMPLATES)));
  const [exercises, setExercises] = useState<Exercise[]>(() => JSON.parse(localStorage.getItem('titanlift_exercises') || JSON.stringify(DEFAULT_EXERCISES)));

  useEffect(() => { localStorage.setItem('titanlift_sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('titanlift_templates', JSON.stringify(templates)); }, [templates]);
  useEffect(() => { localStorage.setItem('titanlift_exercises', JSON.stringify(exercises)); }, [exercises]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-inter">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home sessions={sessions} templates={templates} />} />
            <Route path="/workouts" element={<WorkoutList templates={templates} onUpdateTemplates={setTemplates} exercises={exercises} onUpdateExercises={setExercises} />} />
            <Route path="/active/:id" element={<ActiveWorkoutWrapper templates={templates} exercises={exercises} onSaveSession={(s: any) => setSessions([s, ...sessions])} />} />
            <Route path="/scan" element={<ScanWorkout onAddTemplate={(t: any) => setTemplates([t, ...templates])} />} />
            <Route path="/history" element={<History sessions={sessions} onDeleteSession={(id: string) => setSessions(sessions.filter(s => s.id !== id))} />} />
            <Route path="/progress" element={<div className="p-6 md:pl-28 pt-10"><h1 className="text-3xl font-black mb-10 tracking-tighter">Evolução</h1><div className="bg-indigo-900/10 border border-indigo-500/20 p-8 rounded-[2.5rem] text-center mb-8"><p className="text-[10px] font-black uppercase text-gray-500 mb-2">Treinado até hoje</p><p className="text-4xl font-black">{formatDurationFull(sessions.reduce((a, b) => a + (b.durationMs || 0), 0))}</p></div><div className="text-center py-20 opacity-30"><TrendingUp size={48} className="mx-auto text-indigo-500 mb-4"/><p className="text-xs font-black uppercase tracking-widest">Gráficos de Carga em breve</p></div></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
