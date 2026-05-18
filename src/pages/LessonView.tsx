import { useParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, ChevronRight, Loader2, ArrowLeft, ArrowRight, Check, BookOpen, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Lesson } from '../types';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../context/AuthContext';

export default function LessonView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [relatedLessons, setRelatedLessons] = useState<Lesson[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchLessonData = async (retryCount = 0) => {
      if (!id || !user) return;
      setLoading(true);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );

      try {
        // 1. Fetch current lesson
        const lessonQuery = supabase.from('lessons').select('*').eq('id', id).single();
        const { data: currentLesson, error: lessonError }: any = await Promise.race([lessonQuery, timeoutPromise]);
        if (lessonError) throw lessonError;
        setLesson(currentLesson);

        // 2. Check completion
        const progressQuery = supabase.from('user_progress').select('*').eq('user_id', user.id).eq('lesson_id', id).maybeSingle();
        const { data: progressData } = await Promise.race([progressQuery, timeoutPromise]) as any;
        setIsCompleted(!!progressData);

        // 3. Fetch related
        if (currentLesson) {
          const relatedQuery = supabase
            .from('lessons')
            .select('*')
            .eq('tier', currentLesson.tier)
            .order('order_index', { ascending: true })
            .limit(10);
          
          const { data: related } = await Promise.race([relatedQuery, timeoutPromise]) as any;
          setRelatedLessons(related || []);
        }
      } catch (err) {
        console.error(`Error fetching lesson:`, err);
        if (retryCount < 1) return fetchLessonData(retryCount + 1);
      } finally {
        setLoading(false);
      }
    };

    fetchLessonData();
  }, [id, user]);

  const handleComplete = async () => {
    if (!id || !user || isCompleted || actionLoading) return;
    
    setActionLoading(true);
    console.log('Attempting to mark lesson as complete...', { userId: user.id, lessonId: id });

    try {
      const { error, status } = await supabase
        .from('user_progress')
        .insert([{ user_id: user.id, lesson_id: id }]);
      
      if (error) {
        // If the table doesn't exist yet, it will throw a 404 or specific Postgres error
        if (error.code === '42P01') {
          throw new Error('Database table "user_progress" not found. Please ensure you have run the migration.sql script in your Supabase SQL Editor.');
        }
        if (error.code !== '23505') throw error; // Ignore if already completed
      }
      
      console.log('Progress marked successfully');
      setIsCompleted(true);
      setShowSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Find next lesson for auto-navigation
      const currentIndex = relatedLessons.findIndex(l => l.id === id);
      const nextLesson = relatedLessons[currentIndex + 1];
      
      if (nextLesson) {
        setTimeout(() => {
          navigate(`/lesson/${nextLesson.id}`);
        }, 1500); // Small delay to show "Finished" state
      }
    } catch (err: any) {
      console.error('Error marking as complete:', err);
      alert(err.message || 'Failed to save progress. Please make sure the SQL migration was applied.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#427AB5]" size={48} />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center py-24">
        <h2 className="font-display text-4xl font-bold">Lesson Not Found</h2>
        <Link to="/" className="text-[#427AB5] hover:underline mt-4 inline-block">Return to Curriculum</Link>
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto">
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-12 left-4 right-4 md:left-1/2 md:-translate-x-1/2 z-50 pointer-events-none flex justify-center"
          >
            <div className="bg-[#1A1E21] text-white px-6 md:px-8 py-4 md:py-6 rounded-3xl md:rounded-[32px] shadow-2xl flex items-center gap-4 md:gap-6 border border-white/10 overflow-hidden relative max-w-lg w-full">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-500/20">
                <Trophy size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-widest text-green-400">Mastery Achievement</p>
                <p className="font-display font-bold text-lg">Module "{lesson.title}" Completed!</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-4 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 text-[#2D3436]/50 hover:text-[#427AB5] font-bold transition-all text-sm group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Back to Curriculum
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Main Content */}
        <div className="lg:col-span-8 space-y-8 md:space-y-12">
          <header className="bg-[#1A1E21] rounded-[32px] md:rounded-[40px] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#427AB5]/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            
            <div className="relative z-10 space-y-6">
              {lesson.thumbnail_url && (
                <div className="absolute top-0 right-0 w-1/3 h-full opacity-20 pointer-events-none hidden md:block">
                  <img 
                    src={lesson.thumbnail_url} 
                    alt="" 
                    className="w-full h-full object-cover rounded-l-[100px]"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-[#1A1E21] via-transparent to-transparent" />
                </div>
              )}
              
              <div className="flex flex-wrap items-center gap-3 md:gap-4">
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/90">Theory Module</span>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-sm",
                  lesson.tier === 'Beginner' ? 'bg-green-500 text-white' : 
                  lesson.tier === 'Intermediate' ? 'bg-yellow-500 text-white' : 'bg-red-500 text-white'
                )}>
                  {lesson.tier} Tier
                </span>
                {isCompleted && (
                  <div className="flex items-center gap-1 text-green-400 font-bold text-[10px] uppercase tracking-widest bg-green-400/10 px-3 py-1.5 rounded-lg border border-green-400/20">
                    <Check size={14} />
                    Achieved
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <h1 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                  {lesson.title}
                </h1>
                <p className="text-lg md:text-xl text-white/60 leading-relaxed font-medium italic border-l-4 border-[#FFE8BE] pl-4 md:pl-6">
                  {lesson.description}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 md:gap-6 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-widest">
                  <Clock size={16} />
                  <span>~8 min module</span>
                </div>
                <div className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-widest">
                  <BookOpen size={16} />
                  <span>{relatedLessons.length} Modules in path</span>
                </div>
              </div>
            </div>
          </header>

          <article className="prose prose-slate max-w-none bg-white border border-[#D9C5A0]/30 rounded-[32px] md:rounded-[40px] p-6 md:p-12 shadow-ambient">
            {lesson.steps && lesson.steps.length > 0 && (
              <div className="mb-12 not-prose">
                <h2 className="text-xs font-black uppercase text-[#427AB5] tracking-[0.2em] mb-6 flex items-center gap-2">
                  <span className="w-8 h-px bg-[#427AB5]/30"></span>
                  Quick Start Guide
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lesson.steps.map((step, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-start gap-4 p-6 bg-[#FDFBF7] rounded-3xl border border-[#D9C5A0]/20"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#427AB5] text-white flex items-center justify-center text-xs font-black shadow-lg shadow-blue-500/20">
                        {idx + 1}
                      </div>
                      <p className="text-sm font-medium text-[#2D3436]/80 leading-relaxed pt-1">
                        {step}
                      </p>
                    </motion.div>
                  ))}
                </div>
                <hr className="mt-12 border-[#D9C5A0]/20" />
              </div>
            )}

            <div className="markdown-body">
              <ReactMarkdown>{lesson.content}</ReactMarkdown>
            </div>
            
            {!lesson.content && (
              <div className="py-24 text-center text-[#2D3436]/20 italic italic">
                No module content available yet.
              </div>
            )}

            <div className="mt-12 md:mt-16 pt-8 md:pt-12 border-t border-[#D9C5A0]/20 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
              <div className="space-y-1 text-center md:text-left">
                <p className="text-xs font-black uppercase text-[#427AB5] tracking-widest">Mastery progress</p>
                <p className="text-xs md:text-sm text-[#2D3436]/50">Found this lesson helpful? Mark it as finished.</p>
              </div>
              
              <button 
                onClick={handleComplete}
                disabled={actionLoading || isCompleted}
                className={cn(
                  "w-full md:w-auto px-8 md:px-10 py-4 md:py-5 rounded-2xl font-black text-xs md:text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                  isCompleted 
                    ? "bg-[#FDFBF7] text-green-600 border border-green-200 cursor-default"
                    : "bg-primary-blue text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]"
                )}
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : isCompleted ? <CheckCircle size={20} /> : <Check size={20} />}
                {isCompleted ? 'Module Finished' : 'Complete Module'}
              </button>
            </div>
          </article>
        </div>

        {/* Sidebar - Up Next */}
        <aside className="lg:col-span-4 space-y-6 md:space-y-8">
          <div className="lg:sticky lg:top-24 space-y-6 md:space-y-8">
            <div className="bg-white border border-[#D9C5A0]/30 rounded-[32px] overflow-hidden shadow-ambient">
              <div className="p-6 md:p-8 border-b border-[#D9C5A0]/20 bg-[#FDFBF7]/50">
                <div className="flex items-center gap-2 text-[#427AB5] font-bold text-[10px] uppercase tracking-widest mb-2">
                  <BookOpen size={14} />
                  Curriculum Track
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#2D3436]">Path Progress</h3>
                <div className="mt-6 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-[#FDFBF7] rounded-full border border-[#D9C5A0]/10 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(relatedLessons.filter(l => l.id === id).length / relatedLessons.length) * 100}%` }}
                      className="h-full bg-[#427AB5]"
                    />
                  </div>
                  <span className="text-[10px] font-bold text-[#2D3436]/40 uppercase">Tier {lesson.tier[0]}</span>
                </div>
              </div>
              
              <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto">
                {relatedLessons.map((l, i) => {
                  const isCurrent = l.id === id;
                  return (
                    <Link 
                      key={l.id} 
                      to={`/lesson/${l.id}`}
                      className={cn(
                        "flex gap-4 p-6 transition-all border-b border-[#D9C5A0]/10 last:border-0 group",
                        isCurrent ? "bg-[#FFE8BE]/10" : "hover:bg-[#FFE8BE]/5"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 border transition-all",
                        isCurrent ? "bg-primary-blue text-white shadow-lg shadow-blue-500/20" : "bg-white text-[#2D3436]/30 border-[#D9C5A0]/30 group-hover:border-[#427AB5]/40"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex flex-col justify-center min-w-0">
                        <p className={cn(
                          "text-[10px] font-bold uppercase tracking-widest mb-0.5",
                          isCurrent ? "text-[#427AB5]" : "text-[#2D3436]/40"
                        )}>Module {i + 1}</p>
                        <h4 className={cn(
                          "text-sm font-bold line-clamp-1 transition-colors",
                          isCurrent ? "text-[#2D3436]" : "text-[#2D3436]/60 group-hover:text-[#427AB5]"
                        )}>{l.title}</h4>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="bg-[#427AB5] rounded-[32px] p-8 text-white shadow-xl shadow-blue-500/10 space-y-4">
              <h4 className="font-display font-bold text-lg">Mastery Checkpoint</h4>
              <p className="text-white/70 text-xs leading-relaxed">
                Take small breaks between modules to improve information retention. Your progress is automatically saved to your cloud profile.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
