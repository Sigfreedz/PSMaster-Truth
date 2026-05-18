import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { CheckCircle2, PlayCircle, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lesson } from '../types';

export default function MyProgress() {
  const { user, profile } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const displayName = profile?.username || profile?.email?.split('@')[0] || 'Learner';

  useEffect(() => {
    const fetchData = async (retryCount = 0) => {
      if (!user) return;
      setLoading(true);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 15000)
      );

      try {
        // Fetch lessons
        const lessonsQuery = supabase
          .from('lessons')
          .select('*')
          .order('order_index', { ascending: true });
        
        // Fetch progress
        const progressQuery = supabase
          .from('user_progress')
          .select('lesson_id')
          .eq('user_id', user.id);

        const [{ data: lessonsData, error: lessonsError }, { data: progressData, error: progressError }] = await Promise.all([
          Promise.race([lessonsQuery, timeoutPromise]) as any,
          Promise.race([progressQuery, timeoutPromise]) as any
        ]);

        if (lessonsError) throw lessonsError;
        if (progressError) throw progressError;

        if (lessonsData) setLessons(lessonsData);
        if (progressData) setCompletedIds(progressData.map((p: any) => p.lesson_id));
      } catch (err) {
        console.error(`Error fetching data:`, err);
        if (retryCount < 1) return fetchData(retryCount + 1);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#427AB5]" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12">
      <header className="space-y-3 md:space-y-4">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-[#2D3436]">Your Learning Journey</h1>
        <p className="text-sm md:text-base text-[#2D3436]/50">
          Track your progress and pick up where you left off, <span className="text-[#427AB5] font-bold">{displayName}</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {lessons.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#2D3436]/40 italic">
            No lessons available yet.
          </div>
        ) : (
          lessons.map((lesson, i) => {
            const isCompleted = completedIds.includes(lesson.id);
            
            return (
              <motion.div
                key={lesson.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white border border-[#D9C5A0]/20 rounded-3xl overflow-hidden shadow-ambient group hover:border-[#427AB5]/40 transition-all"
              >
                <div className="relative aspect-video overflow-hidden bg-slate-900">
                  {lesson.thumbnail_url ? (
                    <img 
                      src={lesson.thumbnail_url} 
                      alt={lesson.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
                      <BookOpen size={40} className="text-[#427AB5]/20" />
                    </div>
                  )}
                  {isCompleted && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white p-1.5 rounded-full shadow-lg z-10">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle size={48} className="text-white" />
                  </div>
                </div>
                
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className={lesson.tier === 'Beginner' ? 'text-green-500' : lesson.tier === 'Intermediate' ? 'text-yellow-600' : 'text-red-500'}>
                      {lesson.tier}
                    </span>
                    <span className="text-slate-400">
                      Module
                    </span>
                  </div>
                  
                  <h3 className="font-bold text-[#2D3436] line-clamp-1">{lesson.title}</h3>
                  
                  <Link 
                    to={`/lesson/${lesson.id}`}
                    className="block w-full py-3 text-center bg-[#FDFBF7] border border-[#D9C5A0]/30 rounded-xl text-xs font-bold text-[#406AAF] hover:bg-[#FFE8BE]/50 transition-colors"
                  >
                    {isCompleted ? 'Review Lesson' : 'Continue Learning'}
                  </Link>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
