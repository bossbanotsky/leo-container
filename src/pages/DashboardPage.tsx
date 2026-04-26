import React from 'react';
import { useStore } from '../store/StoreContext';
import { TopBar } from '../components/TopBar';
import { Package, Wrench, CheckCircle, FileText, LogOut, User as UserIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface DashboardPageProps {
  onNavigate: (tab: 'Active' | 'Repairing' | 'Repaired') => void;
  onNavigateTab: (tab: 'billing' | 'billed') => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onNavigateTab }) => {
  const { state, user, logout } = useStore();

  const activeCount = state.containers.filter(c => c.status === 'Active').length;
  const repairingCount = state.containers.filter(c => c.status === 'Repairing').length;
  const repairedCount = state.containers.filter(c => c.status === 'Repaired').length;
  const draftInvoicesCount = state.invoices.filter(i => i.status === 'Draft').length;
  const billedInvoicesCount = state.invoices.filter(i => i.status === 'Billed').length;

  return (
    <div className="flex flex-col h-full bg-transparent pb-24 overflow-y-auto pt-4">
      <div className="w-full max-w-md p-4 space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-display font-black text-white tracking-tight leading-none text-glow">
              Control <span className="text-laser-indigo">Center</span>
            </h1>
            <p className="text-[9px] font-mono text-slate-100 font-black uppercase tracking-[0.2em] mt-1 group-hover:text-white transition-colors">
              System v4.2 // Active Session
            </p>
          </div>
          <button 
            onClick={logout}
            className="p-2.5 bg-carbon-800 hover:bg-rose-600 text-white rounded-xl border border-white/20 transition-all shadow-lg active:scale-95 group"
          >
            <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>

        {/* User Badge */}
        {user && (
          <div className="flex items-center gap-3 p-3 bg-carbon-800 border border-white/25 rounded-xl shadow-lg shadow-black/20">
            <div className="w-8 h-8 rounded-lg bg-laser-indigo flex items-center justify-center border border-white/20 shadow-lg">
              <UserIcon size={16} className="text-white drop-shadow-md" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white uppercase tracking-wider">{user.displayName || 'Authorized Admin'}</span>
              <span className="text-[8px] font-mono text-slate-100 font-black truncate max-w-[150px]">{user.email}</span>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => onNavigate('Active')}
            className="flex flex-col items-start p-4 bg-carbon-800 border-2 border-white/20 rounded-2xl shadow-xl hover:border-sky-400 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className="p-2 bg-sky-600 rounded-lg mb-3 group-hover:bg-sky-500 transition-colors border-2 border-white/30 shadow-md">
              <Package size={18} className="text-white" />
            </div>
            <span className="text-3xl font-display font-black text-white mb-0.5 drop-shadow-md text-glow">{activeCount}</span>
            <span className="text-[9px] font-black text-white uppercase tracking-widest text-left">Active</span>
          </button>
          
          <button 
            onClick={() => onNavigate('Repairing')}
            className="flex flex-col items-start p-4 bg-carbon-800 border-2 border-white/20 rounded-2xl shadow-xl hover:border-fuchsia-400 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className="p-2 bg-fuchsia-600 rounded-lg mb-3 group-hover:bg-fuchsia-500 transition-colors border-2 border-white/30 shadow-md">
              <Wrench size={18} className="text-white" />
            </div>
            <span className="text-3xl font-display font-black text-white mb-0.5 drop-shadow-md text-glow">{repairingCount}</span>
            <span className="text-[9px] font-black text-white uppercase tracking-widest text-left">Repairing</span>
          </button>
          
          <button 
            onClick={() => onNavigate('Repaired')}
            className="flex flex-col items-start p-4 bg-carbon-800 border-2 border-white/20 rounded-2xl shadow-xl hover:border-lime-400 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className="p-2 bg-lime-600 rounded-lg mb-3 group-hover:bg-lime-500 transition-colors border-2 border-white/30 shadow-md">
              <CheckCircle size={18} className="text-black" />
            </div>
            <span className="text-3xl font-display font-black text-white mb-0.5 drop-shadow-md text-glow">{repairedCount}</span>
            <span className="text-[9px] font-black text-white uppercase tracking-widest text-left">Repaired</span>
          </button>
          
          <button 
            onClick={() => onNavigateTab('billing')}
            className="flex flex-col items-start p-4 bg-carbon-800 border-2 border-white/20 rounded-2xl shadow-xl hover:border-orange-400 transition-all active:scale-95 group relative overflow-hidden"
          >
            <div className="p-2 bg-orange-600 rounded-lg mb-3 group-hover:bg-orange-500 transition-colors border-2 border-white/30 shadow-md">
              <FileText size={18} className="text-white" />
            </div>
            <span className="text-3xl font-display font-black text-white mb-0.5 drop-shadow-md text-glow">{draftInvoicesCount}</span>
            <span className="text-[9px] font-black text-white uppercase tracking-widest text-left">Drafts</span>
          </button>
 
           <button 
            onClick={() => onNavigateTab('billed')}
            className="flex items-center justify-between p-5 bg-white border-4 border-laser-indigo rounded-2xl shadow-lg hover:scale-[1.01] transition-all active:scale-[0.99] group relative overflow-hidden col-span-2"
          >
            <div className="relative z-10">
              <span className="text-[10px] font-black text-black uppercase tracking-[0.2em] block mb-0.5">Settled Accounts</span>
              <span className="text-4xl font-display font-black text-laser-indigo tracking-tighter drop-shadow-sm">{billedInvoicesCount}</span>
            </div>
            <div className="w-14 h-14 bg-laser-indigo rounded-xl flex items-center justify-center border-2 border-white/20 relative z-10 group-hover:rotate-6 transition-transform shadow-lg">
              <CheckCircle size={28} className="text-white drop-shadow-sm" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
