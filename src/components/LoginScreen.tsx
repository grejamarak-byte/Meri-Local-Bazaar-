import React, { useState } from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  MessageCircle,
  Truck,
  Zap,
  Store,
  Mail,
  AlertCircle,
} from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { BrandIcon, BrandLogo } from './BrandLogo';

interface LoginScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // 1. Google OAuth with Supabase Auth
  const handleGoogleOAuthSignIn = async () => {
    if (!supabase) {
      setError('Supabase client is not available. Please check environment configuration.');
      return;
    }

    setLoading(true);
    setError(null);

    const currentOrigin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : window.location.href.split('#')[0].split('?')[0];

    try {
      const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: currentOrigin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        throw oauthError;
      }

      if (oauthData?.url) {
        window.location.href = oauthData.url;
        return;
      }
    } catch (err: any) {
      console.error('Supabase Google OAuth error:', err);
      setError(err?.message || 'Google OAuth failed to redirect. You can also sign in directly with Email.');
      setLoading(false);
    }
  };

  // 2. Direct Email Signup / Signin with Supabase Auth
  const handleEmailAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!supabase) {
      setError('Supabase is not initialized.');
      return;
    }

    const cleanEmail = customEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please provide a valid email address (e.g. name@gmail.com).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanName = customName.trim() || cleanEmail.split('@')[0];
    const passwordToUse = customPassword.trim() || `MLB@${cleanEmail.replace(/[^a-zA-Z0-9]/g, '')}#2026`;

    try {
      let authUser: any = null;

      // Try signing in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordToUse,
      });

      if (!signInError && signInData?.user) {
        authUser = signInData.user;
      } else {
        const msg = signInError?.message?.toLowerCase() || '';
        if (
          msg.includes('invalid login credentials') ||
          msg.includes('user not found') ||
          msg.includes('invalid credentials') ||
          msg.includes('not confirmed')
        ) {
          // Register new user in Supabase Authentication (auth.users)
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: passwordToUse,
            options: {
              data: {
                full_name: cleanName,
                name: cleanName,
                avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=ea580c,f59e0b,059669`,
              },
              emailRedirectTo: window.location.origin,
            },
          });

          if (signUpError) {
            throw signUpError;
          }

          if (signUpData?.user) {
            authUser = signUpData.user;
          }
        } else if (signInError) {
          throw signInError;
        }
      }

      if (!authUser) {
        setSuccessMsg('Confirmation email sent! Please check your email inbox to verify your account.');
        setLoading(false);
        return;
      }

      // Sync user profile to the Supabase 'profiles' table with real auth user UUID
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const isUserAdmin =
        cleanEmail === 'silgrakmarak1309@gmail.com' ||
        cleanEmail === 'merilocalbazaar@gmail.com' ||
        cleanEmail === 'chiamesangma588@gmail.com' ||
        existingProfile?.role === 'admin';

      const userProfile: UserProfile = {
        id: authUser.id, // REAL SUPABASE AUTH USER UUID
        email: authUser.email || cleanEmail,
        full_name: existingProfile?.full_name || cleanName,
        avatar_url:
          existingProfile?.avatar_url ||
          authUser.user_metadata?.avatar_url ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=ea580c,f59e0b,059669`,
        phone: existingProfile?.phone || authUser.phone || '9876543210',
        city: existingProfile?.city || 'Tura, Meghalaya',
        state: existingProfile?.state || 'Meghalaya',
        role: (existingProfile?.role || (isUserAdmin ? 'admin' : 'user')) as any,
        is_pro: existingProfile?.is_pro ?? isUserAdmin,
        pro_status: existingProfile?.pro_status || (isUserAdmin ? 'active' : 'inactive'),
        is_delivery_partner: existingProfile?.is_delivery_partner || false,
        partner_status: existingProfile?.partner_status || 'none',
        created_at: existingProfile?.created_at || new Date().toISOString(),
      };

      await supabase.from('profiles').upsert([userProfile]);

      try {
        localStorage.setItem('mlb_active_user', JSON.stringify(userProfile));
      } catch (_) {}

      setTimeout(() => {
        setLoading(false);
        onLoginSuccess(userProfile);
      }, 300);
    } catch (err: any) {
      setLoading(false);
      console.error('Login error:', err);
      setError(err?.message || 'Supabase authentication failed. Please verify credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 flex flex-col justify-between items-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Subtle Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-orange-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Simple Brand Marker */}
      <div className="w-full max-w-5xl flex items-center justify-between pt-2">
        <BrandLogo variant="dark" size="sm" showTagline={false} />

        <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[11px] font-semibold text-slate-300 backdrop-blur-md">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Verified Supabase Auth</span>
        </div>
      </div>

      {/* Centered Main Login Box */}
      <div className="w-full max-w-md my-auto py-8 z-10 animate-in fade-in zoom-in-95 duration-300">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
          {/* Header Card Banner */}
          <div className="bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 p-7 text-white text-center relative">
            {/* Main Application Logo Asset Container */}
            <div className="mx-auto mb-3.5 flex justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white p-1.5 shadow-2xl ring-4 ring-white/40 flex items-center justify-center overflow-hidden transition transform hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Meri Local Bazaar"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.src.includes('file_0000000026d481f590b090e6f011359e.png')) {
                      target.src = '/file_0000000026d481f590b090e6f011359e.png';
                    }
                  }}
                  className="w-full h-full object-cover rounded-2xl"
                />
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-black/20 text-white text-[11px] font-extrabold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Meri Local Bazaar</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Meri Local <span className="text-amber-200">Bazaar</span>
            </h1>

            {/* User-specified Catchphrase */}
            <p className="text-sm font-medium text-orange-100 mt-2 max-w-xs mx-auto leading-snug">
              Apni local market se judne ke liye login karein
            </p>
          </div>

          {/* Form / Actions Body */}
          <div className="p-6 sm:p-8 space-y-4">
            {error && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Primary Google Login Button */}
            <button
              onClick={handleGoogleOAuthSignIn}
              disabled={loading}
              className="w-full py-4 px-5 bg-white hover:bg-slate-50 active:scale-[0.99] border-2 border-slate-200 hover:border-orange-300 rounded-2xl text-slate-800 text-sm font-bold flex items-center justify-center gap-3.5 transition shadow-sm hover:shadow-md disabled:opacity-50 group cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span className="text-base font-extrabold text-slate-800">
                {loading ? 'Connecting Supabase Auth...' : 'Continue with Google'}
              </span>
            </button>

            {/* Custom Google / Email Option */}
            <div className="pt-2 border-t border-slate-100">
              {!showCustomInput ? (
                <button
                  type="button"
                  onClick={() => setShowCustomInput(true)}
                  className="w-full text-center text-xs text-slate-500 hover:text-orange-600 font-bold transition py-1 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Or sign in / register with Email ID</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <form onSubmit={handleEmailAuthSubmit} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in duration-200">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                    <Mail className="w-4 h-4 text-orange-600" />
                    <span>Supabase Email Authentication</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="yourname@gmail.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                      Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="w-1/2 py-2 text-xs font-bold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-xl cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-1/2 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {loading ? 'Authenticating...' : 'Sign In / Register'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Security Guarantee Pills */}
            <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-[9px] font-bold text-slate-600 leading-tight">100% Supabase Auth</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <MessageCircle className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-[9px] font-bold text-slate-600 leading-tight">Direct WhatsApp</div>
              </div>
              <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                <Lock className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                <div className="text-[9px] font-bold text-slate-600 leading-tight">256-bit Secure</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Bottom Footer */}
      <footer className="w-full max-w-5xl text-center py-2 text-xs text-slate-500 z-10">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-800/60 pt-3">
          <div>© {new Date().getFullYear()} Meri Local Bazaar. All rights reserved.</div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px] font-semibold">
            <span>Direct WhatsApp Community</span>
            <span>•</span>
            <span>Tura & North East Verified Marketplace</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

