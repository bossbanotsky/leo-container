import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { ContainerDetailsModal } from '../components/ContainerDetailsModal';
import { RotateCcw, Info, Archive as ArchiveIcon, Layers, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const ArchivePage: React.FC = () => {
  const { state, undoInvoiceArchived } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingContainerDetails, setViewingContainerDetails] = useState<string | null>(null);

  const archivedInvoices = state.invoices.filter(i => i.status === 'Archived');

  return (
    <div className="flex flex-col h-full bg-transparent pb-24 overflow-hidden pt-8">
      <div className="px-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-white tracking-tight uppercase text-glow">Vault</h1>
          <p className="text-[10px] font-mono text-slate-100 font-black uppercase tracking-widest mt-1">Registry // Historical</p>
        </div>
        <div className="w-12 h-12 flex items-center justify-center bg-carbon-800 text-slate-300 rounded-2xl border border-white/10 shadow-xl">
          <ArchiveIcon size={24} />
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
          {archivedInvoices.filter(i => 
            i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
            state.containers.filter(c => i.containerIds.includes(c.id)).some(c => c.number.toLowerCase().includes(searchQuery.toLowerCase()))
          ).length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-slate-400 grayscale opacity-60"
            >
              <Layers size={32} className="mb-2" />
              <p className="text-[10px] font-mono uppercase tracking-widest">No matching historical data</p>
            </motion.div>
          ) : (
            archivedInvoices.filter(i => 
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
                  className="bg-carbon-800 border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative opacity-80 hover:opacity-100 transition-all group"
                >
                  <div className="p-6 border-b border-white/20 bg-white/10 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-slate-100 uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                          Archived
                        </span>
                        <span className="text-[10px] font-mono font-black text-slate-200">#{inv.id.slice(0, 6).toUpperCase()}</span>
                      </div>
                      <h3 className="text-xl font-display font-black text-white tracking-tight uppercase">
                        {inv.invoiceNumber}
                      </h3>
                      <p className="text-[10px] font-mono font-black text-slate-100 uppercase tracking-widest mt-2 px-1">
                        Archived: {inv.archivedAt ? new Date(inv.archivedAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <button 
                      onClick={() => undoInvoiceArchived(inv.id)}
                      className="p-3 bg-white/10 hover:bg-white text-slate-100 hover:text-black rounded-2xl border border-white/20 transition-all active:scale-95 group shadow-xl"
                    >
                      <RotateCcw size={22} className="group-hover:rotate-[-90deg] transition-transform" />
                    </button>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                       {billContainers.map(c => (
                        <div key={c.id} className="flex justify-between items-center p-4 bg-carbon-900 border border-white/10 rounded-xl shadow-inner group-hover:border-white/40 transition-all">
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
