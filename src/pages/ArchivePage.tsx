import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { ContainerDetailsModal } from '../components/ContainerDetailsModal';
import { RotateCcw, Info, Archive as ArchiveIcon, Layers, Search, CheckSquare, Square, X, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const ArchivePage: React.FC = () => {
  const { state, undoInvoiceArchived, bulkUndoInvoiceArchived, bulkDeleteInvoices } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingContainerDetails, setViewingContainerDetails] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const archivedInvoices = state.invoices.filter(i => i.status === 'Archived');

  const displayedInvoices = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const searchNormalized = normalize(searchQuery);

    return archivedInvoices.filter(i => {
      if (!searchQuery) return true;
      const invNormalized = normalize(i.invoiceNumber);
      const hasMatchingContainer = state.containers
        .filter(c => i.containerIds.includes(c.id))
        .some(c => 
          normalize(c.number).includes(searchNormalized) || 
          (c.localReference && normalize(c.localReference).includes(searchNormalized))
        );
      
      return invNormalized.includes(searchNormalized) || hasMatchingContainer;
    });
  }, [archivedInvoices, searchQuery, state.containers]);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedInvoices.length && displayedInvoices.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedInvoices.map(i => i.id));
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`PERMANENTLY DELETE ${selectedIds.length} archived records? This cannot be undone.`)) {
      await bulkDeleteInvoices(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkUnarchive = async () => {
    if (window.confirm(`Restore ${selectedIds.length} records to Settled state?`)) {
      await bulkUndoInvoiceArchived(selectedIds);
      setSelectedIds([]);
    }
  };

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
      <div className="px-6 mb-4 flex gap-2">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-laser-indigo transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="SEARCH INVOICES..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-carbon-800 border-2 border-white/20 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-mono font-black text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-laser-indigo transition-all shadow-2xl tracking-widest uppercase"
          />
        </div>
        {displayedInvoices.length > 0 && (
          <button 
            onClick={toggleSelectAll}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all flex items-center justify-center min-w-[56px] shadow-2xl",
              selectedIds.length === displayedInvoices.length && selectedIds.length > 0
                ? "bg-laser-indigo border-laser-indigo text-white"
                : "bg-carbon-800 border-white/20 text-slate-300"
            )}
          >
            {selectedIds.length === displayedInvoices.length && selectedIds.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {displayedInvoices.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-slate-400 grayscale opacity-60"
            >
              <Layers size={32} className="mb-2" />
              <p className="text-[10px] font-mono uppercase tracking-widest">No matching historical data</p>
            </motion.div>
          ) : (
            displayedInvoices.map((inv, idx) => {
              const billContainers = state.containers.filter(c => inv.containerIds.includes(c.id));
              
              return (
                <motion.div 
                  key={inv.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => toggleSelect(inv.id)}
                  className={cn(
                    "bg-carbon-800 border rounded-[2.5rem] overflow-hidden shadow-2xl relative transition-all cursor-pointer",
                    selectedIds.includes(inv.id) ? "border-laser-indigo ring-2 ring-laser-indigo/20 opacity-100" : "border-white/10 opacity-80 hover:opacity-100"
                  )}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id);
                    }}
                    className={cn(
                      "p-6 border-b border-white/20 flex justify-between items-start transition-colors cursor-pointer",
                      expandedInvoiceId === inv.id ? "bg-white/20" : "bg-white/10 hover:bg-white/15"
                    )}
                  >
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-5 h-5 mt-1 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedIds.includes(inv.id) ? "bg-laser-indigo border-laser-indigo text-white" : "border-white/20 text-transparent"
                      )} onClick={(e) => toggleSelect(inv.id, e)}>
                        <CheckSquare size={12} />
                      </div>
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
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <Layers size={12} className="text-slate-300" />
                            <span className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest">
                              {billContainers.length} Units
                            </span>
                          </div>
                          <p className="text-[10px] font-mono font-black text-slate-100 uppercase tracking-widest border-l border-white/10 pl-3 px-1">
                            Archived: {inv.archivedAt ? new Date(inv.archivedAt).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => undoInvoiceArchived(inv.id)}
                        className="p-3 bg-white/10 hover:bg-white text-slate-100 hover:text-black rounded-2xl border border-white/20 transition-all active:scale-95 group shadow-xl"
                      >
                        <RotateCcw size={22} className="group-hover:rotate-[-90deg] transition-transform" />
                      </button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {expandedInvoiceId === inv.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="p-6 space-y-4">
                          <div className="bg-carbon-900/40 border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 shadow-inner">
                            {billContainers.map(c => (
                              <div key={c.id} className="flex justify-between items-center py-1.5 px-3 hover:bg-white/5 transition-all group">
                                <span className="text-[10px] font-mono font-black text-white uppercase tracking-tight">
                                  {c.localReference ? `${c.localReference} - ` : ''}{c.number}
                                </span>
                                <button 
                                  onClick={() => setViewingContainerDetails(c.id)}
                                  className="p-1.5 text-slate-500 hover:text-white transition-colors"
                                >
                                  <Info size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bulk Actions Toolbar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-6 right-6 z-[60]"
          >
            <div className="bg-carbon-900 border-2 border-slate-500 rounded-[2rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
              <div className="flex flex-col ml-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Decommissioned Log</span>
                <span className="text-sm font-display font-black text-white uppercase tracking-tight">{selectedIds.length} Records Selected</span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleBulkDelete}
                  className="p-3 bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl border border-rose-500/30 transition-all"
                  title="Wipe Selected"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={handleBulkUnarchive}
                  className="px-6 py-3 bg-white text-black text-[10px] font-black rounded-xl hover:bg-slate-200 transition-all uppercase tracking-widest flex items-center gap-2"
                >
                  Unarchive <RotateCcw size={14} />
                </button>
                <button 
                  onClick={() => setSelectedIds([])}
                  className="p-3 bg-white/5 text-slate-400 hover:text-white rounded-xl border border-white/10 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {viewingContainerDetails && (
        <ContainerDetailsModal 
          containerId={viewingContainerDetails} 
          onClose={() => setViewingContainerDetails(null)} 
        />
      )}
    </div>
  );
};
