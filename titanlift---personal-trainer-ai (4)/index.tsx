import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { 
  Dumbbell, History as HistoryIcon, TrendingUp, LayoutDashboard, Plus,
  ChevronRight, CheckCircle2, Trash2, Timer, Play, Pause, RotateCcw,
  ArrowRight, Trophy, ArrowLeft, Edit2, Check, X, PlusCircle,
  PlusSquare, Settings2, Home as HomeIcon, Calculator, Clock,
  NotebookPen, CalendarDays, Heart, Sparkles, Loader2, Lightbulb,
  MessageSquareQuote, Save, CloudCheck, Scan as ScanIcon, Image as ImageIcon,
  FileSearch
} from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, YAxis } from 'recharts';

// Importando tipos e constantes sem as extensões para compatibilidade com Vercel
import { WorkoutSession, PersonalRecord, ActiveExercise, WorkoutSet, WorkoutTemplate, Exercise } from './types';
import { EXERCISES as DEFAULT_EXERCISES, WORKOUT_TEMPLATES as DEFAULT_TEMPLATES } from './constants';
import { getMotivationalQuote, getExerciseTip, scanWorkoutFromImage } from './services/geminiService';

// --- Feedback Helpers ---
const triggerHaptic = (type: 'light' | 'medium' | 'success' = 'light') => {
  if (window.navigator.vibrate) {
    if (type === 'light') window.navigator.vibrate(15);
    else if (type === 'medium') window.navigator.vibrate(30);
    else if (type === 'success') window.navigator.vibrate([40, 30, 40]);
  }
};

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
    console.debug('Audio feedback não disponível');
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

// --- Componentes ---

const Navbar = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 px-6 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-between items-center z-50 md:top-0 md:bottom-auto md:flex-col md:w-20 md:h-screen md:border-r md:border-t-0">
    <Link to="/" className="p-2 text-indigo-500 hover:text-indigo-400"><LayoutDashboard size={22} /></Link>
    <Link to="/workouts" className="p-2 text-gray-400 hover:text-indigo-400"><Dumbbell size={22} /></Link>
    <Link to="/scan" className="p-2 text-gray-400 hover:text-indigo-400"><ScanIcon size={22} /></Link>
    <Link to="/progress" className="p-2 text-gray-400 hover:text-indigo-400"><TrendingUp size={22} /></Link>
    <Link to="/history" className="p-2 text-gray-400 hover:text-indigo-400"><HistoryIcon size={22} /></Link>
  </nav>
);

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
        let idx = d.getDay() - 1;
        if (idx === -1) idx = 6;
        status[idx] = true;
      }
    });
    return days.map((label, i) => ({ label, active: status[i] }));
  }, [sessions]);

  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto md:pl-28">
      <header className="mb-8 pt-4">
        <h1 className="text-4xl font-black text-white mb-2 tracking-tight">TitanLift</h1>
        <p className="text-gray-400 italic text-sm">"{quote}"</p>
      </header>

      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 mb-6">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Frequência Semanal</h2>
        <div className="flex justify-between items-center px-1">
          {weekDays.map((day, i) => (
            <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black ${day.active ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
              {day.active ? <CheckCircle2 size={14} /> : day.label}
            </div>
          ))}
        </div>
      </div>

      <div className={`border rounded-[2rem] p-6 mb-10 transition-all ${activeTemplateId ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-gray-900 border-gray-800'}`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <Clock size={18} className="text-gray-500" />
            <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-300">Tempo de Treino</h2>
          </div>
          {activeTemplateId && (
            <Link to={`/active/${activeTemplateId}`} className="text-[9px] font-black uppercase bg-indigo-600/20 px-2.5 py-0.5 rounded-full text-indigo-400">Retomar</Link>
          )}
        </div>
        <div className="text-center py-2">
          <span className="text-5xl font-black tabular-nums text-white">{activeDuration}</span>
        </div>
      </div>

      <section className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-lg font-bold">Planos Disponíveis</h2>
          <Link to="/workouts" className="text-indigo-400 text-xs font-medium">Ver todos</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {templates.slice(0, 4).map((t: any) => (
            <Link key={t.id} to={`/active/${t.id}`} className="bg-gray-900 border border-gray-800 p-5 rounded-3xl hover:border-indigo-500/50 transition-all group">
              <h3 className="text-base font-bold text-gray-100 group-hover:text-indigo-400">{t.name}</h3>
              <p className="text-gray-500 text-[10px] mb-4">{t.description}</p>
              <div className="text-indigo-500 font-bold text-[10px] uppercase flex items-center gap-1">Iniciar Treino <Play size={10} fill="currentColor" /></div>
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
      const draftKey = `titanlift_draft_${templateId}`;
      const draft = localStorage.getItem(draftKey);
      if (draft) {
        try { setActiveExercises(JSON.parse(draft)); } catch(e) {}
      } else {
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
    const timeout = setTimeout(() => {
      localStorage.setItem(`titanlift_draft_${templateId}`, JSON.stringify(activeExercises));
      setIsSyncing(false);
    }, 500);
    return () => clearTimeout(timeout);
  }, [activeExercises, templateId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const isRunning = localStorage.getItem('titanlift_timer_is_running') === 'true';
      let totalMs = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
      if (isRunning) {
        const startTime = localStorage.getItem('titanlift_active_start_time');
        if (startTime) totalMs += Date.now() - parseInt(startTime);
      }
      setActiveDuration(formatDuration(totalMs));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const updateSet = (exIdx: number, setIdx: number, field: keyof WorkoutSet, value: any) => {
    const updated = [...activeExercises];
    updated[exIdx].sets[setIdx] = { ...updated[exIdx].sets[setIdx], [field]: value };
    if (field === 'completed' && value === true) {
      triggerHaptic('medium');
      playTickSound();
    }
    setActiveExercises(updated);
  };

  const handleFinish = () => {
    const startTime = localStorage.getItem('titanlift_active_start_time');
    const elapsedBase = parseInt(localStorage.getItem('titanlift_active_elapsed_time') || '0');
    const duration = startTime ? (Date.now() - parseInt(startTime)) + elapsedBase : elapsedBase;
    
    const session: WorkoutSession = {
      id: Date.now().toString(),
      templateId: templateId || 'custom',
      templateName: template?.name || 'Personalizado',
      date: new Date().toISOString(),
      exercises: activeExercises,
      durationMs: duration
    };
    
    onSaveSession(session);
    localStorage.setItem('titanlift_timer_is_running', 'false');
    localStorage.setItem('titanlift_active_elapsed_time', '0');
    localStorage.removeItem(`titanlift_draft_${templateId}`);
    localStorage.removeItem('titanlift_active_start_time');
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

      <div className="flex justify-between items-center mb-6 pt-32">
        <button onClick={() => navigate('/')} className="text-gray-500"><ArrowLeft /></button>
        <h1 className="text-xl font-black">{template.name}</h1>
        <div className="w-6" />
      </div>

      <div className="space-y-4">
        {activeExercises.map((ex, exIdx) => (
          <div key={exIdx} className="bg-gray-900 border border-gray-800 rounded-3xl p-5">
            <h2 className="text-indigo-400 font-black mb-4">{ex.name}</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-4 text-[8px] font-black text-gray-600 uppercase text-center">
                <span>Série</span><span>Peso (kg)</span><span>Reps</span><span>OK</span>
              </div>
              {ex.sets.map((set, setIdx) => (
                <div key={setIdx} className={`grid grid-cols-4 items-center gap-2 p-1 rounded-xl transition-colors ${set.completed ? 'bg-indigo-500/10 opacity-60' : ''}`}>
                  <span className="text-center text-xs font-bold text-gray-500">{setIdx + 1}</span>
                  <input type="number" className="bg-gray-800 rounded-lg h-9 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={set.weight || ''} onChange={(e) => updateSet(exIdx, setIdx, 'weight', Number(e.target.value))} />
                  <input type="number" className="bg-gray-800 rounded-lg h-9 text-center font-bold text-sm outline-none focus:ring-1 focus:ring-indigo-500" value={set.reps || ''} onChange={(e) => updateSet(exIdx, setIdx, 'reps', Number(e.target.value))} />
                  <button onClick={() => updateSet(exIdx, setIdx, 'completed', !set.completed)} className={`h-9 rounded-lg flex items-center justify-center transition-all ${set.completed ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-500'}`}><Check size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button onClick={handleFinish} className="fixed bottom-24 right-6 bg-emerald-600 text-white p-4 rounded-full shadow-2xl active:scale-90 transition-all z-50"><CheckCircle2 size={28} /></button>
    </div>
  );
};

// --- Raiz do App ---

export default function App() {
  const [sessions, setSessions] = useState<WorkoutSession[]>(() => {
    try { return JSON.parse(localStorage.getItem('titanlift_sessions') || '[]'); } catch { return []; }
  });
  const [templates] = useState<WorkoutTemplate[]>(DEFAULT_TEMPLATES);
  const [exercises] = useState<Exercise[]>(DEFAULT_EXERCISES);

  useEffect(() => {
    localStorage.setItem('titanlift_sessions', JSON.stringify(sessions));
  }, [sessions]);

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
            <Route path="/history" element={<div className="p-6 md:pl-28"><h1 className="text-2xl font-black mb-6">Histórico</h1>{sessions.length === 0 ? <p className="text-gray-500 text-xs">Nenhum treino registrado.</p> : sessions.map(s => <div key={s.id} className="bg-gray-900 p-4 rounded-3xl border border-gray-800 mb-3"><p className="font-bold">{s.templateName}</p><p className="text-[10px] text-gray-500">{new Date(s.date).toLocaleDateString()}</p></div>)}</div>} />
            <Route path="/progress" element={<div className="p-6 md:pl-28 text-center pt-20"><TrendingUp size={48} className="mx-auto text-indigo-500 mb-4" /><p className="text-gray-400">Evolução de carga em breve!</p></div>} />
            <Route path="/scan" element={<div className="p-6 md:pl-28 text-center pt-20"><ScanIcon size={48} className="mx-auto text-indigo-500 mb-4" /><p className="text-gray-400">Scan de fotos em breve!</p></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);