import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { 
  Plus, 
  X, 
  Trash2, 
  CheckCircle, 
  Package, 
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Search,
  CheckSquare,
  Square
} from 'lucide-react';
import { cn } from '../lib/utils';
import { ContainerDetailsModal } from '../components/ContainerDetailsModal';
import { motion, AnimatePresence } from 'motion/react';

export const BillingPage: React.FC = () => {
  const { state, createInvoice, deleteInvoice, addContainersToInvoice, removeContainerFromInvoice, approveInvoice, bulkDeleteInvoices, bulkApproveInvoices } = useStore();
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [error, setError] = useState('');
  const [viewingContainerDetails, setViewingContainerDetails] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const draftInvoices = state.invoices.filter(i => i.status === 'Draft');
  
  const displayedDrafts = useMemo(() => {
    return draftInvoices.filter(i => 
      i.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
      state.containers.filter(c => i.containerIds.includes(c.id)).some(c => c.number.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [draftInvoices, searchQuery, state.containers]);

  const [addingToInvoiceId, setAddingToInvoiceId] = useState<string | null>(null);
  const availableContainers = state.containers.filter(c => c.status === 'Repaired');

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === displayedDrafts.length && displayedDrafts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedDrafts.map(i => i.id));
    }
  };

  const handleBulkApprove = async () => {
    // Only allow approving invoices with containers
    const validIds = selectedIds.filter(id => {
      const inv = state.invoices.find(i => i.id === id);
      return inv && inv.containerIds.length > 0;
    });
    
    if (validIds.length === 0) {
      alert("Selected invoices must have linked units to be approved.");
      return;
    }
    
    await bulkApproveInvoices(validIds);
    setSelectedIds([]);
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} draft invoices? Linked units will be released.`)) {
      await bulkDeleteInvoices(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) return setError('Invoice Number Required');
    
    setError('');
    const res = await createInvoice(invoiceNumber.trim().toUpperCase());
    if (res.success) {
      setIsCreating(false);
      setInvoiceNumber('');
    } else {
      setError(res.error || 'Failed to initialize invoice');
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent pb-24 overflow-hidden pt-8">
      <div className="px-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-white tracking-tight uppercase text-glow">Pending</h1>
          <p className="text-[10px] font-mono text-slate-100 font-black uppercase tracking-widest mt-1">Ledger // Drafts</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="w-12 h-12 flex items-center justify-center bg-laser-indigo text-white rounded-2xl shadow-2xl shadow-laser-indigo/40 hover:scale-105 active:scale-95 transition-all outline-none"
        >
          <Plus size={24} />
        </button>
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
        {displayedDrafts.length > 0 && (
          <button 
            onClick={toggleSelectAll}
            className={cn(
              "p-4 rounded-2xl border-2 transition-all flex items-center justify-center min-w-[56px] shadow-2xl",
              selectedIds.length === displayedDrafts.length && selectedIds.length > 0
                ? "bg-laser-indigo border-laser-indigo text-white"
                : "bg-carbon-800 border-white/20 text-slate-300"
            )}
          >
            {selectedIds.length === displayedDrafts.length && selectedIds.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {displayedDrafts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 text-slate-400 grayscale opacity-60"
            >
              <Layers size={32} className="mb-2" />
              <p className="text-[10px] font-mono uppercase tracking-widest">No matching drafts</p>
            </motion.div>
          ) : (
            displayedDrafts.map((inv, idx) => {
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
                    selectedIds.includes(inv.id) ? "border-laser-indigo ring-2 ring-laser-indigo/20" : "border-white/10"
                  )}
                >
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id);
                    }}
                    className={cn(
                      "p-6 border-b border-white/20 flex justify-between items-start transition-colors cursor-pointer",
                      expandedInvoiceId === inv.id ? "bg-laser-indigo/30" : "bg-laser-indigo/10 hover:bg-laser-indigo/20"
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
                          <span className="text-[9px] font-black text-white uppercase tracking-widest bg-laser-indigo px-2 py-0.5 rounded-full border border-white/20 shadow-lg shadow-laser-indigo/30">
                            Invoice
                          </span>
                          <span className="text-[10px] font-mono font-black text-slate-200">#{inv.id.slice(0, 6).toUpperCase()}</span>
                        </div>
                        <h3 className="text-xl font-display font-black text-white tracking-tight uppercase text-glow">
                          {inv.invoiceNumber}
                        </h3>
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-100" />
                            <span className="text-[10px] font-mono font-black text-slate-100 uppercase tracking-widest">
                              {new Date(inv.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                            <Layers size={12} className="text-slate-300" />
                            <span className="text-[10px] font-mono font-black text-slate-300 uppercase tracking-widest">
                              {billContainers.length} Units
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button 
                        onClick={() => deleteInvoice(inv.id)}
                        className="p-2.5 bg-rose-600 text-white rounded-xl border border-rose-500/30 transition-all shadow-2xl hover:bg-rose-500 active:scale-95"
                      >
                        <Trash2 size={18} />
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
                          <div className="flex justify-between items-center bg-carbon-700/30 px-3 py-2 rounded-xl border border-white/10">
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] block">Allocated Fleet ({billContainers.length})</span>
                            <button 
                              onClick={() => setAddingToInvoiceId(inv.id)}
                              className="text-[10px] font-black text-laser-indigo hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1 bg-laser-indigo/10 px-3 py-1.5 rounded-lg border border-laser-indigo/30"
                            >
                              <Plus size={14} /> Link Units
                            </button>
                          </div>

                          <div className="space-y-2">
                            {billContainers.length === 0 ? (
                              <div className="py-10 text-center border-2 border-dashed border-white/20 rounded-2xl bg-carbon-900 shadow-inner">
                                <p className="text-[10px] font-mono font-black text-slate-200 uppercase tracking-widest">Awaiting unit assignment</p>
                              </div>
                            ) : (
                              billContainers.map(c => (
                                <div key={c.id} className="flex justify-between items-center p-4 bg-carbon-900 border border-white/10 rounded-xl shadow-inner group transition-all hover:border-white/30">
                                  <div className="flex flex-col">
                                    <h4 className="text-[14px] font-display font-black text-white tracking-tight transition-colors uppercase leading-tight">
                                      {c.number} - {c.localReference || 'NO-REF'}
                                    </h4>
                                  </div>
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => setViewingContainerDetails(c.id)}
                                      className="p-2.5 text-white hover:text-laser-indigo transition-colors"
                                    >
                                      <Info size={18} />
                                    </button>
                                    <button 
                                      onClick={() => removeContainerFromInvoice(inv.id, c.id)}
                                      className="p-2.5 text-rose-500 hover:text-rose-600 transition-colors"
                                    >
                                      <X size={20} />
                                    </button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          <button 
                            onClick={() => approveInvoice(inv.id)}
                            disabled={billContainers.length === 0}
                            className="w-full py-5 mt-2 bg-laser-indigo disabled:bg-slate-800 disabled:text-slate-600 text-white font-black rounded-2xl shadow-2xl shadow-laser-indigo/30 hover:bg-indigo-500 active:scale-95 transition-all uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 group"
                          >
                            Approve for Billing <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                          </button>
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
            <div className="bg-carbon-900 border-2 border-laser-indigo rounded-[2rem] p-4 flex items-center justify-between shadow-[0_20px_50px_rgba(99,102,241,0.3)] backdrop-blur-xl">
              <div className="flex flex-col ml-4">
                <span className="text-[10px] font-black text-laser-indigo uppercase tracking-[0.2em]">Queue Management</span>
                <span className="text-sm font-display font-black text-white uppercase tracking-tight">{selectedIds.length} Drafts Selected</span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={handleBulkDelete}
                  className="p-3 bg-rose-600/20 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl border border-rose-500/30 transition-all"
                  title="Remove Selected"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={handleBulkApprove}
                  className="px-6 py-3 bg-laser-indigo text-white text-[10px] font-black rounded-xl hover:bg-indigo-500 transition-all uppercase tracking-widest flex items-center gap-2"
                >
                  Approve <CheckCircle size={14} />
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

      {/* Modals */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-carbon-950/80 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-carbon-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl"
            >
              <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h2 className="text-xl font-display font-medium text-white tracking-tight uppercase">New Billing</h2>
                <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-8 space-y-6">
                {error && <div className="text-[10px] font-bold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 uppercase tracking-widest">{error}</div>}
                
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">Invoice Identifier</label>
                  <input 
                    autoFocus
                    type="text" 
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value.toUpperCase())}
                    placeholder="E.G. INV-4402"
                    className="w-full bg-carbon-800 border border-white/10 rounded-xl px-4 py-4 text-[13px] font-mono font-medium text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-laser-indigo/50 transition-all uppercase tracking-widest"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="flex-1 py-4 bg-white/5 text-slate-400 font-bold rounded-xl hover:bg-white/10 transition-all border border-white/5 uppercase text-[10px] tracking-widest"
                  >
                    Abort
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-4 bg-white text-black font-black rounded-xl hover:bg-slate-100 transition-all shadow-xl uppercase text-[10px] tracking-widest"
                  >
                    Initialize
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {addingToInvoiceId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-carbon-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-6"
          >
            <motion.div 
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-carbon-900 border-t sm:border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md h-[80vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="px-8 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-display font-medium text-white tracking-tight uppercase">Registry Link</h2>
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">Status: Repaired Only</p>
                </div>
                <button onClick={() => setAddingToInvoiceId(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                {availableContainers.length === 0 ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-600 grayscale opacity-40">
                    <Package size={48} className="mb-4" />
                    <p className="text-[10px] font-mono uppercase tracking-widest">No units available</p>
                  </div>
                ) : (
                  availableContainers.map(c => (
                    <div key={c.id} className="flex justify-between items-center p-5 bg-carbon-800/40 rounded-2xl border border-white/5 hover:border-white/20 transition-all group group relative">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={cn(
                            "text-[8px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-widest",
                            c.type === 'Local' ? "border-sky-500/30 text-sky-400" : "border-emerald-500/30 text-emerald-400"
                          )}>
                            {c.type}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500">ID: {c.id.slice(0, 6).toUpperCase()}</span>
                        </div>
                        <h4 className="text-lg font-display font-medium text-white tracking-tight group-hover:text-laser-indigo transition-colors uppercase">
                          {c.number}
                        </h4>
                        <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">
                          {c.localReference || 'No Local Ref'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          addContainersToInvoice(addingToInvoiceId, [c.id]);
                        }}
                        className="px-6 py-2.5 bg-white text-black font-black text-[10px] rounded-xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all uppercase tracking-widest"
                      >
                        Link
                      </button>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-8 border-t border-white/5 bg-white/5">
                <button
                  onClick={() => setAddingToInvoiceId(null)}
                  className="w-full py-4 bg-carbon-800 text-slate-300 font-bold rounded-xl border border-white/5 hover:bg-carbon-700 transition-all uppercase text-[10px] tracking-widest"
                >
                  Return to Dashboard
                </button>
              </div>
            </motion.div>
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
