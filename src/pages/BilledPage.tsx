import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { ContainerDetailsModal } from '../components/ContainerDetailsModal';
import { RotateCcw, Archive as ArchiveIcon, Info, CreditCard, Layers, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const BilledPage: React.FC = () => {
  const { state, archiveInvoice, undoInvoiceBilled } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingContainerDetails, setViewingContainerDetails] = useState<string | null>(null);

  const billedInvoices = state.invoices.filter(i => i.status === 'Billed');

  return (
    <div className="flex flex-col h-full bg-transparent pb-24 overflow-hidden pt-8">
      <div className="px-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-white tracking-tight uppercase text-glow">Settled</h1>
          <p className="text-[10px] font-mono text-slate-100 font-black uppercase tracking-widest mt-1">Ledger // Completed</p>
        </div>
        <div className="w-12 h-12 flex items-center justify-center bg-violet-500/20 text-violet-400 rounded-2xl border border-violet-500/30 shadow-xl shadow-violet-500/20">
          <CreditCard size={24} />
        </div>
      </div>

      {/* Search */}
      <div className="px-6 mb-4 group">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-laser-indigo transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="SEARCH INVOICES..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-carbon-800 border-2 border-white/20 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-mono font-black text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-laser-indigo transition-all shadow-2xl tracking-widest uppercase"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {billedInvoices.filter(i => 
            i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
            state.containers.filter(c => i.containerIds.includes(c.id)).some(c => c.number.toLowerCase().includes(searchQuery.toLowerCase()))
          ).length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-slate-400 grayscale opacity-60"
            >
              <Layers size={32} className="mb-2" />
              <p className="text-[10px] font-mono uppercase tracking-widest">No matching billing cycles</p>
            </motion.div>
          ) : (
            billedInvoices.filter(i => 
              i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
              state.containers.filter(c => i.containerIds.includes(c.id)).some(c => c.number.toLowerCase().includes(searchQuery.toLowerCase()))
            ).map((inv, idx) => {
              const billContainers = state.containers.filter(c => inv.containerIds.includes(c.id));
              
              return (
                <motion.div 
                  key={inv.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-carbon-800 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
                >
                  <div className="p-6 border-b border-white/20 bg-violet-600/20 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-violet-300 uppercase tracking-widest bg-violet-500/30 px-2 py-0.5 rounded-full border border-white/30">
                          Settled
                        </span>
                        <span className="text-[10px] font-mono font-black text-slate-200">#{inv.id.slice(0, 6).toUpperCase()}</span>
                      </div>
                      <h3 className="text-xl font-display font-black text-white tracking-tight uppercase">
                        {inv.invoiceNumber}
                      </h3>
                      <p className="text-[10px] font-mono font-black text-slate-100 uppercase tracking-widest mt-2 px-1">
                        Processed: {inv.billedAt ? new Date(inv.billedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-2xl font-display font-black text-white tracking-tight drop-shadow-md">{billContainers.length}</span>
                      <span className="text-[8px] font-black text-slate-200 uppercase tracking-[0.2em]">Units</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                       {billContainers.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-4 bg-carbon-900 border border-white/10 rounded-xl shadow-inner group transition-all hover:border-white/30">
                          <div className="flex flex-col">
                            <h4 className="text-[14px] font-display font-black text-white tracking-tight transition-colors uppercase leading-tight">
                              {c.number} - {c.localReference || 'NO-REF'}
                            </h4>
                          </div>
                          <button 
                            onClick={() => setViewingContainerDetails(c.id)}
                            className="p-2 text-white hover:text-laser-indigo transition-colors"
                          >
                            <Info size={18} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button 
                        onClick={() => undoInvoiceBilled(inv.id)}
                        className="flex-1 py-4 bg-white/5 text-slate-300 text-[10px] font-black rounded-xl border border-white/10 hover:bg-white/10 transition-all uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
                      >
                        <RotateCcw size={14} /> REOPEN
                      </button>
                      <button 
                        onClick={() => archiveInvoice(inv.id)}
                        className="flex-1 py-4 bg-violet-600 text-white text-[10px] font-black rounded-xl shadow-2xl shadow-violet-500/30 hover:bg-violet-500 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                      >
                        <ArchiveIcon size={14} /> STORE
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {viewingContainerDetails && (
        <ContainerDetailsModal 
          containerId={viewingContainerDetails} 
          onClose={() => setViewingContainerDetails(null)} 
        />
      )}
    </div>
  );
};
