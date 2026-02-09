
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
  Home as HomeIcon,
  Calculator,
  Clock,
  NotebookPen,
  CalendarDays,
  Heart,
  Sparkles,
  Loader2,
  Lightbulb,
  MessageSquareQuote,
  Save,
  CloudCheck,
  Scan as ScanIcon,
  Image as ImageIcon,
  FileSearch
} from 'lucide-react';

// Corrigido: Removidas extensões .ts e .tsx dos imports locais para compatibilidade com o bundler do Vercel
import { WorkoutSession, PersonalRecord, ActiveExercise, WorkoutSet, WorkoutTemplate, Exercise } from './types';
import { EXERCISES as DEFAULT_EXERCISES, WORKOUT_TEMPLATES as DEFAULT_TEMPLATES } from './constants';
import { getMotivationalQuote, getExerciseTip, scanWorkoutFromImage } from './services/geminiService';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';

// --- Feedback Helpers ---

const playTickSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    console.debug('Audio feedback not supported or blocked');
  }
};

const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
  if (!window.navigator.vibrate) return;
  
  if (type === 'light') {
    window.navigator.vibrate(15);
  } else if (type === 'medium') {
    window.navigator.vibrate(30);
  } else if (type === 'success') {
    window.navigator.vibrate([40, 30, 40]);
  }
};

// --- Utils ---

const getStartOfWeek = (d: Date) => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).setHours(0, 0, 0, 0);
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

// --- Components ---

const Toast = ({ message, visible }: { message: string, visible: boolean }) => (
  <div className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-[200] transition-all duration-300 transform ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
    <div className="bg-gray-800 text-white px-5 py-2 rounded-2xl shadow-2xl border border-gray-700 font-medium text-xs whitespace-nowrap">
      {message}
    </div>
  </div>
);

const ExitConfirmDialog = ({ onCancel, onConfirm }: { onCancel: () => void, onConfirm: () => void }) => (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-6">
    <div className="bg-gray-900 border border-gray-800 w-full max-sm rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
      <div className="bg-indigo-500/10 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5">
        <Dumbbell size={28} className="text-indigo-500" />
      </div>
      <h2 className="text-lg font-black text-white mb-2">Sair para o Início?</h2>
      <p className="text-gray-400 text-xs mb-6 leading-relaxed">
        Seu progresso atual fica salvo. O tempo total da academia continua contando.
      </p>
      <div className="flex flex-col gap-2.5">
        <button 
          onClick={onConfirm}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]"
        >
          Sair do Treino Atual
        </button>
        <button 
          onClick={onCancel}
          className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]"
        >
          Continuar Malhando
        </button>
      </div>
    </div>
  </div>
);

const PlateCalculator = ({ weight, onClose }: { weight: number, onClose: () => void }) => {
  const barWeight = 20;
  const targetSide = (weight - barWeight) / 2;
  const availablePlates = [25, 20, 15, 10, 5, 2, 1];
  
  const calculatePlates = (target: number) => {
    let remaining = target;
    const result: number[] = [];
    availablePlates.forEach(plate => {
      while (remaining >= plate) {
        result.push(plate);
        remaining -= plate;
      }
    });
    return result;
  };

  const plates = targetSide > 0 ? calculatePlates(targetSide) : [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
      <div className="bg-gray-900 border border-gray-800 w-full max-w-xs rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-5">
          <h3 className="font-black text-indigo-400 uppercase text-[10px] tracking-widest">Anilhas (por lado)</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18}/></button>
        </div>
        <div className="text-center mb-5">
          <p className="text-3xl font-black text-white">{weight} <span className="text-xs text-gray-500">kg</span></p>
          <p className="text-[9px] text-gray-500 uppercase mt-1">Total com Barra de 20kg</p>
        </div>
        <div className="space-y-1.5 flex flex-wrap gap-1.5 justify-center">
          {plates.length > 0 ? plates.map((p, i) => (
            <div key={i} className="bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 px-2.5 py-1 rounded-lg text-[10px] font-black">{p}kg</div>
          )) : <p className="text-[10px] text-center text-gray-600 italic">Peso apenas da barra.</p>}
        </div>
        <button onClick={onClose} className="w-full mt-6 bg-gray-800 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider">Fechar</button>
      </div>
    </div>
  );
};

const Navbar = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-between items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-screen md:border-r md:border-t-0">
    <Link to="/" className="p-2 text-indigo-500 hover:text-indigo-400"><LayoutDashboard size={22} /></Link>
    <Link to="/workouts" className="p-2 text-gray-400 hover:text-indigo-400"><Dumbbell size={22} /></Link>
    <Link to="/scan" className="p-2 text-gray-400 hover:text-indigo-400"><ScanIcon size={22} /></Link>
    <Link to="/progress" className="p-2 text-gray-400 hover:text-indigo-400"><TrendingUp size={22} /></Link>
    <Link to="/history" className="p-2 text-gray-400 hover:text-indigo-400"><HistoryIcon size={22} /></Link>
  </nav>
);

const RestTimer = ({ exerciseId }: { exerciseId: string }) => {
  const PREF_MIN_KEY = `titanlift_pref_rest_min_${exerciseId}`;
  const PREF_SEC_KEY = `titanlift_pref_rest_sec_${exerciseId}`;
  const END_TIME_KEY = `titanlift_rest_end_${exerciseId}`;

  const [minInput, setMinInput] = useState<number | ''>(() => parseInt(localStorage.getItem(PREF_MIN_KEY) || '1'));
  const [secInput, setSecInput] = useState<number | ''>(() => parseInt(localStorage.getItem(PREF_SEC_KEY) || '30'));
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => { localStorage.setItem(PREF_MIN_KEY, minInput.toString()); }, [minInput, PREF_MIN_KEY]);
  useEffect(() => { localStorage.setItem(PREF_SEC_KEY, secInput.toString()); }, [secInput, PREF_SEC_KEY]);

  useEffect(() => {
    const checkTimer = () => {
      const endTimeStr = localStorage.getItem(END_TIME_KEY);
      if (endTimeStr) {
        const remaining = parseInt(endTimeStr) - Date.now();
        if (remaining > 0) { setTimeLeft(Math.floor(remaining / 1000)); setIsActive(true); } 
        else { localStorage.removeItem(END_TIME_KEY); setIsActive(false); setTimeLeft(0); }
      }
    };
    checkTimer();
    const interval = setInterval(checkTimer, 1000);
    const handleStartTimer = (e: any) => { if (e.detail.exerciseId === exerciseId) startTimer(); };
    window.addEventListener('titanlift_start_rest', handleStartTimer);
    return () => { clearInterval(interval); window.removeEventListener('titanlift_start_rest', handleStartTimer); };
  }, [exerciseId]);

  const startTimer = () => {
    const m = typeof minInput === 'number' ? minInput : 0;
    const s = typeof secInput === 'number' ? secInput : 0;
    const totalSeconds = (m * 60) + s;
    if (totalSeconds > 0) {
      const endTime = Date.now() + (totalSeconds * 1000);
      localStorage.setItem(END_TIME_KEY, endTime.toString());
      setTimeLeft(totalSeconds); setIsActive(true);
    }
  };

  const togglePause = () => {
    if (isActive) { localStorage.removeItem(END_TIME_KEY); setIsActive(false); } 
    else { if (timeLeft > 0) { const endTime = Date.now() + (timeLeft * 1000); localStorage.setItem(END_TIME_KEY, endTime.toString()); setIsActive(true); } else startTimer(); }
  };

  const resetTimer = () => { localStorage.removeItem(END_TIME_KEY); setIsActive(false); setTimeLeft(0); };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-xl p-1 px-2.5 flex items-center justify-start gap-2.5">
      <div className="flex items-center gap-1.5"><Timer size={11} className="text-indigo-400" /><span className="text-[7px] font-black text-gray-500 uppercase tracking-widest">Descanso</span></div>
      <div className="flex items-center gap-2">
        {timeLeft > 0 ? (
          <div className="flex items-center gap-1.5">
            <span className={`text-[13px] font-black tabular-nums tracking-[0.1em] px-1.5 py-0.5 bg-gray-950/50 rounded-lg border border-gray-800/50 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-indigo-400'}`}>{formatTime(timeLeft)}</span>
            <div className="flex gap-0.5">
              <button onClick={togglePause} className="p-1 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20">{isActive ? <Pause size={10} /> : <Play size={10} fill="currentColor" />}</button>
              <button onClick={resetTimer} className="p-1 bg-gray-700 text-gray-300 rounded-lg border border-gray-600"><RotateCcw size={10} /></button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <input type="number" value={minInput === 0 ? '' : minInput} placeholder="0" onChange={(e) => setMinInput(e.target.value === '' ? 0 : Math.max(0, Number(e.target.value)))} className="bg-gray-900 border border-gray-700 w-8 text-center rounded-lg py-0.5 text-[14px] font-black text-white outline-none" />
              <span className="text-gray-700 font-black text-[10px]">:</span>
              <input type="number" value={secInput === 0 ? '' : secInput} placeholder="0" onChange={(e) => setSecInput(e.target.value === '' ? 0 : Math.min(59, Math.max(0, Number(e.target.value))))} className="bg-gray-900 border border-gray-700 w-8 text-center rounded-lg py-0.5 text-[14px] font-black text-white outline-none" />
            </div>
            <button onClick={startTimer} className="bg-indigo-600 text-white p-1 rounded-lg"><Play size={11} fill="currentColor" /></button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Home View ---

const Home = ({ sessions, templates }: any) => {
  const [quote, setQuote] = useState("A disciplina é o destino.");
  const [activeDuration, setActiveDuration] = useState("00:00:00");
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  useEffect(() => {
    getMotivationalQuote().then(setQuote);
    const interval = setInterval(() => {
      const isRunning = localStorage.getItem('titanlift_timer_is_running') === 'true';
      let totalMs = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
      if (isRunning) {
        const startTime = localStorage.getItem('titanlift_active_start_time');
        if (startTime) totalMs += Date.now() - parseInt(startTime);
      }
      setActiveDuration(formatDuration(totalMs));
      
      const lastActive = localStorage.getItem('titanlift_last_active_template');
      const activeDrafts = Object.keys(localStorage).filter(k => k.startsWith('titanlift_draft_'));
      if (activeDrafts.length > 0) {
        const found = activeDrafts.find(k => k.includes(lastActive || '')) || activeDrafts[0];
        setActiveTemplateId(found.replace('titanlift_draft_', ''));
      } else setActiveTemplateId(null);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const weekDays = useMemo(() => {
    const start = getStartOfWeek(new Date());
    const days = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
    const status = [false, false, false, false, false, false, false];
    sessions.forEach((s: any) => {
      const d = new Date(s.date);
      if (d.getTime() >= start) {
        let idx = d.getDay() - 1; if (idx === -1) idx = 6;
        status[idx] = true;
      }
    });
    return days.map((label, i) => ({ label, active: status[i] }));
  }, [sessions]);

  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto md:pl-28">
      <header className="mb-8 pt-4"><h1 className="text-4xl font-black text-white mb-2 tracking-tight">TitanLift</h1><p className="text-gray-400 italic text-sm">"{quote}"</p></header>
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 mb-6"><h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Sua Semana</h2>
        <div className="flex justify-between items-center px-1">
          {weekDays.map((day, i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${day.active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>{day.active ? <CheckCircle2 size={14} /> : day.label}</div>
          ))}
        </div>
      </div>
      <div className={`border rounded-[2rem] p-6 mb-10 transition-all ${activeTemplateId ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-gray-900 border-gray-800'}`}>
        <div className="flex items-center justify-between mb-5"><div className="flex items-center gap-2.5"><Clock size={18} className="text-gray-500" /><h2 className="text-[11px] font-black uppercase tracking-widest text-gray-300">Tempo de Treino</h2></div>{activeTemplateId && <Link to={`/active/${activeTemplateId}?resume=true`} className="text-[9px] font-black uppercase bg-indigo-600/20 px-2.5 py-0.5 rounded-full text-indigo-400">Retomar</Link>}</div>
        <div className="text-center py-2"><span className="text-5xl font-black tabular-nums text-white">{activeDuration}</span></div>
      </div>
      <section className="mb-8"><div className="flex justify-between items-end mb-4"><h2 className="text-lg font-bold">Planos</h2><Link to="/workouts" className="text-indigo-400 text-xs font-medium">Ver todos</Link></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.slice(0, 4).map((t: any) => (
            <Link key={t.id} to={`/active/${t.id}`} className="bg-gray-900 border border-gray-800 p-5 rounded-3xl hover:border-indigo-500/50 transition-all group">
              <h3 className="text-base font-bold text-gray-100 group-hover:text-indigo-400">{t.name}</h3><p className="text-gray-500 text-[10px] mb-4">{t.description}</p><div className="text-indigo-500 font-bold text-[10px] uppercase flex items-center gap-1">Começar <Play size={10} fill="currentColor" /></div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

const ActiveWorkout = ({ templates, exercises, onSaveSession }: any) => {
  const { id: templateId } = useParams();
  const navigate = useNavigate();
  const template = templates.find((t: any) => t.id === templateId);
  const [activeExercises, setActiveExercises] = useState<ActiveExercise[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeDuration, setActiveDuration] = useState("00:00:00");

  useEffect(() => {
    if (template) {
      const draft = localStorage.getItem(`titanlift_draft_${templateId}`);
      if (draft) { try { setActiveExercises(JSON.parse(draft)); } catch(e) {} } 
      else {
        const initial = template.exercises.map((exId: string) => ({
          exerciseId: exId,
          name: exercises.find((e: any) => e.id === exId)?.name || 'Exercício',
          sets: Array(3).fill(null).map(() => ({ reps: 10, weight: 0, completed: false })),
          notes: ''
        }));
        setActiveExercises(initial);
      }
      if (localStorage.getItem('titanlift_timer_is_running') !== 'true') {
        localStorage.setItem('titanlift_active_start_time', Date.now().toString());
        localStorage.setItem('titanlift_timer_is_running', 'true');
        localStorage.setItem('titanlift_last_active_template', templateId || '');
      }
    }
  }, [template, exercises, templateId]);

  useEffect(() => {
    setIsSyncing(true);
    const timeout = setTimeout(() => { localStorage.setItem(`titanlift_draft_${templateId}`, JSON.stringify(activeExercises)); setIsSyncing(false); }, 500);
    return () => clearTimeout(timeout);
  }, [activeExercises, templateId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const isRunning = localStorage.getItem('titanlift_timer_is_running') === 'true';
      let totalMs = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
      if (isRunning) { const startTime = localStorage.getItem('titanlift_active_start_time'); if (startTime) totalMs += Date.now() - parseInt(startTime); }
      setActiveDuration(formatDuration(totalMs));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateSet = (exIdx: number, setIdx: number, field: keyof WorkoutSet, value: any) => {
    const updated = [...activeExercises];
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
    if (field === 'completed' && value === true) { triggerHaptic('medium'); playTickSound(); }
    setActiveExercises(updated);
  };

  const handleFinish = () => {
    const startTime = localStorage.getItem('titanlift_active_start_time');
    const elapsedBase = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
    const duration = startTime ? (Date.now() - parseInt(startTime)) + elapsedBase : elapsedBase;
    const session: WorkoutSession = { id: Date.now().toString(), templateId: templateId || 'custom', templateName: template?.name || 'Personalizado', date: new Date().toISOString(), exercises: activeExercises, durationMs: duration };
    onSaveSession(session);
    localStorage.setItem('titanlift_timer_is_running', 'false'); localStorage.setItem('titanlift_active_elapsed_time', '0'); localStorage.removeItem(`titanlift_draft_${templateId}`); localStorage.removeItem('titanlift_active_start_time');
    triggerHaptic('success');
    navigate('/');
  };

  if (!template) return null;

  return (
    <div className="p-4 pb-32 max-w-4xl mx-auto md:pl-28">
      <div className="fixed top-12 left-0 right-0 z-[100] bg-gray-950/95 backdrop-blur-lg px-6 py-2 border-b border-gray-800 flex justify-between items-center md:left-20">
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{activeDuration}</span>
        <div className="text-[10px] text-gray-500 uppercase font-black">{isSyncing ? 'Sincronizando...' : 'Salvo'}</div>
      </div>
      <div className="flex justify-between items-center mb-6 pt-32"><button onClick={() => navigate('/')} className="text-gray-500"><ArrowLeft /></button><h1 className="text-xl font-black">{template.name}</h1><div className="w-6" /></div>
      <div className="space-y-4">{activeExercises.map((ex, exIdx) => (
        <div key={exIdx} className="bg-gray-900 border border-gray-800 rounded-3xl p-5"><h2 className="text-indigo-400 font-black mb-4">{ex.name}</h2>
          <div className="space-y-2"><div className="grid grid-cols-4 text-[8px] font-black text-gray-600 uppercase text-center"><span>Série</span><span>Peso (kg)</span><span>Reps</span><span>OK</span></div>
            {ex.sets.map((set, setIdx) => (
              <div key={setIdx} className={`grid grid-cols-4 items-center gap-2 p-1 rounded-xl transition-colors ${set.completed ? 'bg-indigo-500/10 opacity-60' : ''}`}><span className="text-center text-xs font-bold text-gray-500">{setIdx + 1}</span>
                <input type="number" className="bg-gray-800 rounded-lg h-9 text-center font-bold text-sm outline-none" value={set.weight || ''} onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))} />
                <input type="number" className="bg-gray-800 rounded-lg h-9 text-center font-bold text-sm outline-none" value={set.reps || ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))} />
                <button onClick={() => updateSet(exIdx, setIdx, 'completed', !set.completed)} className={`h-9 rounded-lg flex items-center justify-center transition-all ${set.completed ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-500'}`}><Check size={16} /></button>
              </div>
            ))}
          </div>
        </div>
      ))}</div>
      <button onClick={handleFinish} className="fixed bottom-24 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-all z-50"><CheckCircle2 size={28} /></button>
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => { try { return JSON.parse(localStorage.getItem('titanlift_sessions') || '[]'); } catch { return []; } });
  const [templates] = useState<WorkoutTemplate[]>(DEFAULT_TEMPLATES);
  const [exercises] = useState<Exercise[]>(DEFAULT_EXERCISES);
  useEffect(() => { localStorage.setItem('titanlift_sessions', JSON.stringify(sessions)); }, [sessions]);
  const saveSession = (s: WorkoutSession) => setSessions(prev => [s, ...prev]);

  return (
    <Router>
      <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-inter">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home sessions={sessions} templates={templates} />} />
            <Route path="/workouts" element={<div className="p-6 md:pl-28"><h1 className="text-2xl font-black mb-6">Planos</h1><div className="grid gap-4">{templates.map(t => <Link key={t.id} to={`/active/${t.id}`} className="bg-gray-900 p-5 rounded-3xl border border-gray-800">{t.name}</Link>)}</div></div>} />
            <Route path="/active/:id" element={<ActiveWorkout templates={templates} exercises={exercises} onSaveSession={saveSession} />} />
            <Route path="/history" element={<div className="p-6 md:pl-28"><h1 className="text-2xl font-black mb-6">Histórico</h1>{sessions.length === 0 ? <p className="text-gray-500 text-xs text-center py-10">Nenhum treino registrado.</p> : sessions.map(s => <div key={s.id} className="bg-gray-900 p-4 rounded-3xl border border-gray-800 mb-3"><p className="font-bold">{s.templateName}</p><p className="text-[10px] text-gray-500">{new Date(s.date).toLocaleDateString()}</p></div>)}</div>} />
            <Route path="/progress" element={<div className="p-6 md:pl-28 text-center pt-20"><TrendingUp size={48} className="mx-auto text-indigo-500 mb-4" /><p className="text-gray-400">Evolução de carga em breve!</p></div>} />
            <Route path="/scan" element={<div className="p-6 md:pl-28 text-center pt-20"><ScanIcon size={48} className="mx-auto text-indigo-500 mb-4" /><p className="text-gray-400">Scan de fotos em breve!</p></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
