/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Info, 
  Wrench, 
  CheckCircle, 
  X,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { ContainerDetailsModal } from '../components/ContainerDetailsModal';
import { Container } from '../types';

export const ContainersPage: React.FC<{ initialTab?: 'Active' | 'Repairing' | 'Repaired', onTabChange?: (tab: 'Active' | 'Repairing' | 'Repaired') => void }> = ({ 
  initialTab = 'Active',
  onTabChange: parentOnTabChange
}) => {
  const { state, addContainer, updateContainerStatus, deleteContainer, updateLocalReference } = useStore();
  const [tab, setTab] = useState<'Active' | 'Repairing' | 'Repaired'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [viewingContainerDetails, setViewingContainerDetails] = useState<string | null>(null);
  
  const [formType, setFormType] = useState<'Local' | 'Foreign'>('Local');
  const [formNumber, setFormNumber] = useState('');
  const [formLocalRef, setFormLocalRef] = useState('');
  const [error, setError] = useState('');

  const [addingLocalCode, setAddingLocalCode] = useState<string | null>(null);
  const [promptLocalRef, setPromptLocalRef] = useState('');
  const [localRefError, setLocalRefError] = useState('');

  const handleTabChange = (t: 'Active' | 'Repairing' | 'Repaired') => {
    setTab(t);
    parentOnTabChange?.(t);
  };

  const filteredContainers = useStore().state.containers.filter(c => c.status === tab);
  
  const displayedContainers = useMemo(() => {
    return filteredContainers.filter(c => 
      c.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.localReference?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [filteredContainers, searchQuery]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNumber.trim()) {
      setError('Container number is required');
      return;
    }

    try {
      // For Local containers, automatically use the number as the local reference.
      // For Foreign containers, use the provided ref if available.
      let localReference = undefined;
      if (formType === 'Local') {
        localReference = formNumber.trim().toUpperCase();
      } else if (formType === 'Foreign' && formLocalRef.trim()) {
        localReference = formLocalRef.trim().toUpperCase();
      }

      const result = await addContainer(
        formNumber.trim().toUpperCase(),
        formType,
        localReference
      );
      
      if (!result.success) {
        setError(result.error || 'Failed to add container');
        return;
      }

      setFormNumber('');
      setFormLocalRef('');
      setIsAdding(false);
      setError('');
    } catch (err) {
      setError('Failed to add container');
    }
  };

  const handleUpdateLocalRef = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingLocalCode) return;
    if (!promptLocalRef.trim()) {
      setLocalRefError('Reference is required');
      return;
    }
    try {
      await updateLocalReference(addingLocalCode, promptLocalRef.trim().toUpperCase());
      setAddingLocalCode(null);
      setPromptLocalRef('');
      setLocalRefError('');
    } catch (err) {
      setLocalRefError('Failed to update reference');
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent pb-24 overflow-hidden pt-8">
      <div className="px-6 flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-display font-black text-white tracking-tight uppercase text-glow">Fleet</h1>
          <p className="text-[10px] font-mono text-slate-100 font-black uppercase tracking-widest mt-1">Registry // Monitoring</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-12 h-12 flex items-center justify-center bg-laser-indigo text-white rounded-2xl shadow-xl shadow-laser-indigo/30 hover:scale-105 active:scale-95 transition-all group"
        >
          <Plus size={24} className="group-hover:rotate-90 transition-transform" />
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 mb-4">
        <div className="flex bg-carbon-800 p-1 rounded-2xl border border-white/20 shadow-2xl">
          {(['Active', 'Repairing', 'Repaired'] as const).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className={cn(
                "flex-1 py-3 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 border-transparent border",
                tab === t 
                  ? "bg-laser-indigo text-white shadow-lg shadow-laser-indigo/30 border-white/40" 
                  : "text-slate-100 hover:text-white"
              )}
            >
              {t} ({state.containers.filter(c => c.status === t).length})
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-6 mb-4 group">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-laser-indigo transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="SEARCH CONTAINERS..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-carbon-800 border-2 border-white/20 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-mono font-black text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-laser-indigo transition-all shadow-2xl tracking-widest uppercase"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 no-scrollbar">
        <AnimatePresence mode="popLayout">
          {displayedContainers.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-40 text-slate-600 grayscale opacity-40"
            >
              <History size={32} className="mb-2" />
              <p className="text-[10px] font-mono uppercase tracking-widest">No matching records</p>
            </motion.div>
          ) : (
            displayedContainers.map((c, idx) => (
              <motion.div 
                key={c.id} 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-carbon-800 border-2 border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative group hover:border-laser-indigo/40 transition-all"
              >
                <div className="p-5 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full border-2 uppercase tracking-widest",
                        c.type === 'Local' ? "border-sky-500/50 text-sky-200 bg-sky-500/20" : "border-emerald-500/50 text-emerald-200 bg-emerald-500/20"
                      )}>
                        {c.type}
                      </span>
                      <span className="text-[9px] font-mono text-slate-100 font-black uppercase tracking-widest">ID: {c.id.slice(0, 8).toUpperCase()}</span>
                    </div>
                    
                    <h3 className="text-xl font-display font-black text-white tracking-tight group-hover:text-laser-indigo transition-colors leading-tight drop-shadow-md">
                      {c.number}
                    </h3>
                    
                    <div className="mt-3 space-y-1">
                        <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest block">Reference Allocation</span>
                        {c.localReference ? (
                          <p className="text-xl font-display font-black text-white uppercase tracking-tight">
                            {c.number} - {c.localReference}
                          </p>
                        ) : (
                          <p className="text-xl font-display font-black text-white uppercase tracking-tight">
                            {c.number} - NO-REF
                          </p>
                        )}
                        {!c.localReference && (
                          <button 
                            onClick={() => {
                              setAddingLocalCode(c.id);
                              setPromptLocalRef('');
                            }}
                            className="text-[10px] text-laser-indigo font-black hover:text-white uppercase tracking-widest bg-laser-indigo/20 px-3 py-1 rounded-lg border border-laser-indigo/30 mt-2"
                          >
                            ASSIGN REFERENCE +
                          </button>
                        )}
                      </div>
                  </div>

                  <div className="flex flex-col items-end gap-3">
                    <div className="flex space-x-1">
                      <button 
                        onClick={() => setViewingContainerDetails(c.id)}
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 transition-all shadow-lg"
                      >
                        <Info size={18} />
                      </button>
                      <button 
                        onClick={() => deleteContainer(c.id)}
                        className="p-2.5 bg-rose-500/20 hover:bg-rose-600 text-white rounded-xl border border-rose-500/30 transition-all shadow-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 bg-white/5 border-t border-white/20 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-slate-200 uppercase tracking-widest">Entry Timestamp</span>
                    <span className="text-[10px] font-black text-white">
                      {new Date(c.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {tab === 'Active' ? (
                      <button
                        onClick={() => updateContainerStatus(c.id, 'Repairing')}
                        className="px-5 py-3 bg-indigo-600 text-white text-[10px] font-black rounded-xl shadow-2xl shadow-indigo-500/40 hover:bg-indigo-500 transition-all uppercase tracking-widest active:scale-95"
                      >
                        Initiate Repair
                      </button>
                    ) : tab === 'Repairing' ? (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateContainerStatus(c.id, 'Active')}
                          className="px-4 py-3 bg-white/10 text-white text-[10px] font-black rounded-xl border border-white/20 hover:bg-white/20 transition-all uppercase tracking-widest"
                        >
                          Undo
                        </button>
                        <button
                          onClick={() => updateContainerStatus(c.id, 'Repaired')}
                          className="px-6 py-3 bg-lime-500 text-black text-[10px] font-black rounded-xl shadow-2xl shadow-lime-500/40 hover:bg-lime-400 transition-all uppercase tracking-widest active:scale-95"
                        >
                          Repaired
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => updateContainerStatus(c.id, 'Repairing')}
                        className="px-5 py-3 bg-white/10 text-white text-[10px] font-black rounded-xl border border-white/20 hover:bg-white/20 transition-all uppercase tracking-widest active:scale-95"
                      >
                        Reschedule
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Refined Modals */}
      <AnimatePresence>
        {isAdding && (
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
                <h2 className="text-xl font-display font-medium text-white tracking-tight uppercase">Registry Entry</h2>
                <button onClick={() => setIsAdding(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-8 space-y-6">
                {error && <div className="text-[10px] font-bold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 uppercase tracking-widest">{error}</div>}
                
                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Container Type</label>
                  <div className="flex gap-3">
                    {(['Local', 'Foreign'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setFormType(t)}
                        className={cn(
                          "flex-1 py-3 text-[10px] font-bold rounded-xl border transition-all uppercase tracking-widest",
                          formType === t 
                            ? "bg-laser-indigo text-white border-laser-indigo shadow-lg shadow-laser-indigo/30"
                            : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Container Number</label>
                    <input 
                      type="text" 
                      value={formNumber}
                      onChange={(e) => setFormNumber(e.target.value.toUpperCase())}
                      placeholder="E.G. AX-9920"
                      className="w-full bg-carbon-800 border border-white/10 rounded-xl px-4 py-4 text-[13px] font-mono font-medium text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-laser-indigo/50 transition-all uppercase tracking-widest"
                    />
                  </div>

                  {formType === 'Foreign' && (
                    <div>
                      <label className="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Local Reference</label>
                      <input 
                        type="text" 
                        value={formLocalRef}
                        onChange={(e) => setFormLocalRef(e.target.value.toUpperCase())}
                        placeholder="E.G. LOC-8821"
                        className="w-full bg-carbon-800 border border-white/10 rounded-xl px-4 py-4 text-[13px] font-mono font-medium text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-laser-indigo/50 transition-all uppercase tracking-widest"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-white text-black font-black rounded-xl shadow-xl hover:bg-slate-200 active:scale-95 transition-all uppercase text-[11px] tracking-widest"
                >
                  Confirm Addition
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {addingLocalCode && (
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
                <h2 className="text-xl font-display font-medium text-white tracking-tight uppercase">Reference Update</h2>
                <button onClick={() => setAddingLocalCode(null)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleUpdateLocalRef} className="p-8 space-y-6">
                {localRefError && <div className="text-[10px] font-bold text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 uppercase tracking-widest">{localRefError}</div>}
                <div>
                  <label className="block text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">New Local Reference</label>
                  <input 
                    type="text" 
                    value={promptLocalRef}
                    onChange={(e) => setPromptLocalRef(e.target.value.toUpperCase())}
                    placeholder="LOCAL-REF-001"
                    autoFocus
                    className="w-full bg-carbon-800 border border-white/10 rounded-xl px-4 py-4 text-[13px] font-mono font-medium text-white placeholder-slate-700 focus:outline-none focus:ring-1 focus:ring-laser-indigo/50 transition-all uppercase tracking-widest"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-4 bg-white text-black font-black rounded-xl shadow-xl hover:bg-slate-200 active:scale-95 transition-all uppercase text-[11px] tracking-widest"
                >
                  Update Record
                </button>
              </form>
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
