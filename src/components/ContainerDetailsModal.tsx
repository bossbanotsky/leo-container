import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { cn } from '../lib/utils';
import { X, Clock, Terminal, ChevronUp, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ContainerDetailsModalProps {
  containerId: string;
  onClose: () => void;
}

interface StatusLogEntryProps {
  h: { status: string, timestamp: number };
}

const StatusLogEntry = ({ h }: StatusLogEntryProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-white/20 first:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full pt-3 pb-3"
      >
        <span className="text-[11px] font-black text-white uppercase tracking-wider">{h.status}</span>
        <div className="text-white hover:bg-white/10 p-1 rounded-full transition-all">
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="text-[9px] font-mono text-slate-200 font-bold leading-tight pb-3"
          >
            {new Date(h.timestamp).toLocaleString()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const ContainerDetailsModal: React.FC<ContainerDetailsModalProps> = ({ containerId, onClose }) => {
  const { state } = useStore();
  const c = state.containers.find(x => x.id === containerId);

  if (!c) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-carbon-950/80 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-carbon-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl"
      >
        <div className="px-8 py-6 border-b border-white/20 bg-white/10 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-laser-indigo" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Unit Telemetry</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-3xl font-display font-black text-white tracking-tight uppercase leading-none drop-shadow-md text-glow">
                {c.number}
              </h3>
              <p className="text-[10px] font-mono text-slate-100 font-black uppercase tracking-widest mt-2 px-1">
                Asset Ref // {c.id.slice(0, 12).toUpperCase()}
              </p>
            </div>
            <span className={cn(
              "text-[9px] font-black px-2.5 py-1 rounded-full border-2 uppercase tracking-widest shadow-lg",
              c.type === 'Local' ? "border-sky-500/50 text-sky-100 bg-sky-600/40" : "border-emerald-500/50 text-emerald-100 bg-emerald-600/40"
            )}>
              {c.type}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-carbon-800 p-4 rounded-xl border-2 border-white/10 shadow-2xl">
              <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest block mb-1">Status</span>
              <span className={cn(
                "text-[12px] font-black uppercase tracking-widest drop-shadow-sm",
                c.status === 'Active' ? "text-sky-300" : c.status === 'Repairing' ? "text-fuchsia-300" : "text-lime-300"
              )}>{c.status}</span>
            </div>
            <div className="bg-carbon-800 p-4 rounded-xl border-2 border-white/10 shadow-2xl">
              <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest block mb-1">Link Ref</span>
              <span className="text-[11px] font-mono text-white font-black uppercase truncate block">{c.localReference || 'UNLINKED'}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Operation Log</span>
            </div>
            <div className="bg-carbon-950 p-4 rounded-2xl border-2 border-white/10 max-h-48 overflow-y-auto no-scrollbar shadow-inner">
              {(c.history && c.history.length > 0 ? c.history : [{ status: 'Created', timestamp: c.createdAt }]).map((h, i) => (
                <React.Fragment key={i}>
                  <StatusLogEntry h={h} />
                </React.Fragment>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-6 bg-white text-black font-black rounded-xl shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:bg-slate-100 transition-all uppercase text-[12px] tracking-widest active:scale-95 border-2 border-white"
          >
            Acknowledge Record
          </button>
        </div>
      </motion.div>
    </div>
  );
};
