import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, UserPlus, LogIn, ShieldAlert, AlertCircle, Loader2, User } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [authMode, setAuthMode] = useState<'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const targetEmail = authMode === 'student' 
        ? `${username.trim().toLowerCase()}@student.app` 
        : email.trim().toLowerCase();

      if (isLogin) {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password,
        });
        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            throw new Error('Email not confirmed. IMPORTANT: Go to Supabase > Auth > Providers > Email and disable "Confirm email" to allow instant student login.');
          }
          throw signInError;
        }
        navigate('/');
      } else {
        // Validation for registration
        if (authMode === 'admin') {
          throw new Error('Admin accounts must be created by the super admin.');
        }

        if (!username || username.length < 3) {
          throw new Error('Username must be at least 3 characters long.');
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: targetEmail,
          password,
          options: {
            data: {
              username: username.trim(),
              auth_type: 'student'
            }
          }
        });
        
        if (signUpError) {
          if (signUpError.message.includes('email limit exceeded')) {
            throw new Error('Registration limit reached. Please try again in a few minutes.');
          }
          throw signUpError;
        }

        setSuccess('Account created! You can now log in with your username.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <div className="flex bg-[#FDFBF7] border border-[#D9C5A0]/30 p-1 rounded-2xl mb-8">
        <button
          onClick={() => { setAuthMode('student'); setError(null); }}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'student' ? 'bg-[#427AB5] text-white shadow-md' : 'text-[#2D3436]/50 hover:bg-[#D9C5A0]/10'}`}
        >
          Student
        </button>
        <button
          onClick={() => { setAuthMode('admin'); setIsLogin(true); setError(null); }}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${authMode === 'admin' ? 'bg-[#427AB5] text-white shadow-md' : 'text-[#2D3436]/50 hover:bg-[#D9C5A0]/10'}`}
        >
          Admin
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-[#D9C5A0]/40 rounded-[28px] md:rounded-[32px] p-6 sm:p-10 shadow-ambient relative overflow-hidden"
      >
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFE8BE]/50 blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-50 blur-3xl -z-10" />

        <div className="text-center mb-10 space-y-2">
          <div className="w-16 h-16 bg-[#427AB5] rounded-24 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-200">
            {isLogin ? <LogIn size={28} /> : <UserPlus size={28} />}
          </div>
          <h1 className="font-display text-3xl font-bold text-[#2D3436]">
            {authMode === 'admin' ? 'Admin Login' : (isLogin ? 'Student Login' : 'Student Join')}
          </h1>
          <p className="text-[#2D3436]/50 text-sm">
            {authMode === 'admin' 
              ? 'Authorized access only.' 
              : (isLogin ? 'Enter your username to continue.' : 'Create your username for the curriculum.')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm"
              >
                <AlertCircle size={18} />
                <span className="flex-1">{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600 text-sm"
              >
                <AlertCircle size={18} />
                <span className="flex-1">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {authMode === 'student' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#2D3436] uppercase tracking-widest pl-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/30" size={18} />
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="photowizard"
                  className="w-full pl-12 pr-4 py-4 bg-[#FDFBF7] border border-[#D9C5A0]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#427AB5]/20 focus:border-[#427AB5] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#2D3436] uppercase tracking-widest pl-1">Admin Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/30" size={18} />
                <input
                  type="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full pl-12 pr-4 py-4 bg-[#FDFBF7] border border-[#D9C5A0]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#427AB5]/20 focus:border-[#427AB5] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              {email === 'hanselluis0809@gmail.com' && (
                <motion.p 
                  initial={{ opacity: 0, y: -5 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] text-amber-600 font-bold flex items-center gap-1 pl-1"
                >
                  <ShieldAlert size={12} /> Super Admin recognized
                </motion.p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-[#2D3436] uppercase tracking-widest pl-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2D3436]/30" size={18} />
              <input
                type="password"
                required
                disabled={loading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-4 py-4 bg-[#FDFBF7] border border-[#D9C5A0]/30 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#427AB5]/20 focus:border-[#427AB5] transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-[#427AB5] text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-[#406AAF] transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                {isLogin ? 'Sign In' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {authMode === 'student' && (
          <div className="mt-8 pt-8 border-t border-[#D9C5A0]/20 text-center">
            <p className="text-sm text-[#2D3436]/50">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => setIsLogin(!isLogin)}
                disabled={loading}
                className="ml-2 font-bold text-[#427AB5] hover:underline"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
