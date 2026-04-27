import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { cn } from '../lib/utils';
import { X, Clock, Terminal, ChevronUp, ChevronDown, MessageSquare, Send } from 'lucide-react';
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
  const { state, addContainerNote, updateContainerData } = useStore();
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const c = state.containers.find(x => x.id === containerId);

  const [isEditing, setIsEditing] = useState(false);
  const [editNumber, setEditNumber] = useState(c?.number || '');
  const [editLocalRef, setEditLocalRef] = useState(c?.localReference || '');

  if (!c) return null;

  const handleSaveEdit = async () => {
    if (!editNumber.trim()) return;
    setIsSubmitting(true);
    await updateContainerData(c.id, editNumber.trim().toUpperCase(), editLocalRef.trim().toUpperCase());
    setIsEditing(false);
    setIsSubmitting(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await addContainerNote(c.id, noteText.trim());
    setNoteText('');
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-carbon-950/80 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-carbon-900 border border-white/10 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="px-8 py-6 border-b border-white/20 bg-white/10 flex justify-between items-center text-white shrink-0">
          <div className="flex items-center gap-2">
            <Terminal size={18} className="text-laser-indigo" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Unit Telemetry</h2>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white/10 p-2 rounded-xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Container Number</label>
                    <input
                      type="text"
                      value={editNumber}
                      onChange={(e) => setEditNumber(e.target.value)}
                      className="w-full bg-carbon-800 border-2 border-white/10 rounded-xl px-4 py-2 text-[14px] font-mono text-white outline-none focus:border-laser-indigo uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Local Reference</label>
                    <input
                      type="text"
                      value={editLocalRef}
                      onChange={(e) => setEditLocalRef(e.target.value)}
                      className="w-full bg-carbon-800 border-2 border-white/10 rounded-xl px-4 py-2 text-[14px] font-mono text-white outline-none focus:border-laser-indigo uppercase"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleSaveEdit}
                      disabled={isSubmitting}
                      className="flex-1 bg-laser-indigo text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg"
                    >
                      {isSubmitting ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-white/5 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10"
                    >
                      CANCEL
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setEditNumber(c.number);
                      setEditLocalRef(c.localReference || '');
                      setIsEditing(true);
                    }}
                    className="text-left group w-full"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black text-laser-indigo uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Click to edit</span>
                    </div>
                    <h3 className="text-3xl font-display font-black text-white tracking-tight uppercase leading-none drop-shadow-md text-glow group-hover:text-laser-indigo transition-colors flex items-center gap-3">
                      {c.number}
                    </h3>
                  </button>
                  <p className="text-[10px] font-mono text-slate-100 font-black uppercase tracking-widest mt-2 px-1 opacity-60">
                    Asset Ref // {c.id.slice(0, 12).toUpperCase()}
                  </p>
                </>
              )}
            </div>
            <span className={cn(
              "text-[9px] font-black px-2.5 py-1 rounded-full border-2 uppercase tracking-widest shadow-lg shrink-0",
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
            <button 
              onClick={() => {
                setEditNumber(c.number);
                setEditLocalRef(c.localReference || '');
                setIsEditing(true);
              }}
              className="bg-carbon-800 p-4 rounded-xl border-2 border-white/10 shadow-2xl hover:border-laser-indigo transition-all text-left"
            >
              <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest block mb-1">Link Ref</span>
              <span className="text-[11px] font-mono text-white font-black uppercase truncate block">{c.localReference || 'UNLINKED'}</span>
            </button>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Operation Log</span>
            </div>
            <div className="bg-carbon-950 p-4 rounded-2xl border-2 border-white/10 max-h-48 overflow-y-auto no-scrollbar shadow-inner">
              {[...(c.history || []), { status: 'Created', timestamp: c.createdAt }]
                .reduce((acc, current) => {
                  if (!acc.find(item => item.timestamp === current.timestamp)) {
                    acc.push(current);
                  }
                  return acc;
                }, [] as { status: string, timestamp: number }[])
                .sort((a, b) => a.timestamp - b.timestamp)
                .map((h, i) => (
                <React.Fragment key={i}>
                  <StatusLogEntry h={h} />
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare size={14} className="text-white" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Operator Notes</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                  placeholder="ADD ENCRYPTION NOTE..."
                  className="flex-1 bg-carbon-950 border-2 border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-white placeholder:text-white/20 focus:border-laser-indigo outline-none transition-all"
                />
                <button
                  onClick={handleAddNote}
                  disabled={!noteText.trim() || isSubmitting}
                  className="bg-white text-black p-2 rounded-xl hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-xl"
                >
                  <Send size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                {c.notes && c.notes.length > 0 ? (
                  [...c.notes].sort((a, b) => b.timestamp - a.timestamp).map((note) => (
                    <div key={note.id} className="bg-carbon-800 p-3 rounded-xl border border-white/5 shadow-sm">
                      <p className="text-[11px] text-white leading-relaxed font-medium">{note.text}</p>
                      <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                        <span className="text-[8px] font-mono text-slate-400 uppercase tracking-tighter truncate max-w-[120px]">
                          {note.authorEmail}
                        </span>
                        <span className="text-[8px] font-mono text-slate-500">
                          {new Date(note.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[9px] font-mono text-white/30 text-center py-4 uppercase tracking-widest">
                    No active transmissions recorded
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-6 bg-white text-black font-black rounded-xl shadow-[0_20px_50px_rgba(255,255,255,0.15)] hover:bg-slate-100 transition-all uppercase text-[12px] tracking-widest active:scale-95 border-2 border-white sticky bottom-0"
          >
            Acknowledge Record
          </button>
        </div>
      </motion.div>
    </div>
  );
};
