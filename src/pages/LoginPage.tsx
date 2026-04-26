import React from 'react';
import { useStore } from '../store/StoreContext';
import { LogIn, ShieldAlert, Cpu } from 'lucide-react';
import { motion } from 'motion/react';

export const LoginPage: React.FC = () => {
  const { login, loading } = useStore();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-carbon-950 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 left-1/4 w-[50%] h-[50%] bg-laser-indigo/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-carbon-900 border border-white/10 rounded-[3rem] p-10 shadow-2xl text-center relative z-10"
      >
        <div className="w-24 h-24 bg-carbon-800 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl relative group">
          <div className="absolute inset-2 border border-laser-indigo/40 rounded-[1.5rem] animate-pulse"></div>
          <Cpu size={48} className="text-laser-indigo drop-shadow-[0_0_20px_rgba(129,140,248,0.8)]" />
        </div>
        
        <h1 className="text-4xl font-display font-black text-white tracking-tighter mb-1 drop-shadow-2xl text-glow">
          CONTAINER <span className="text-laser-indigo">TRACKER</span>
        </h1>
        <p className="text-[10px] font-mono text-slate-100 font-black uppercase tracking-[0.4em] mb-10 drop-shadow-sm">
          LOGISTICS SECURITY NODE // v4.2
        </p>
        
        <button
          onClick={login}
          disabled={loading}
          className="w-full py-6 bg-white text-black font-black rounded-2xl shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:bg-slate-200 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase text-[12px] tracking-[0.2em] disabled:opacity-50 group border-2 border-white"
        >
          {loading ? (
            <span className="flex items-center gap-2">Connecting... <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Cpu size={14} /></motion.div></span>
          ) : (
            <>
              Initialize Session
              <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
        
        <div className="mt-10 flex items-center justify-center gap-2 text-white">
          <ShieldAlert size={14} className="text-laser-indigo" />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed">
            Authorized Personnel Only
          </p>
        </div>
        
        <div className="mt-2 text-[8px] font-mono text-slate-200 font-black uppercase tracking-widest leading-relaxed px-4">
          System monitoring is active. unauthorized access attempts are logged and reported.
        </div>
      </motion.div>
    </div>
  );
};
