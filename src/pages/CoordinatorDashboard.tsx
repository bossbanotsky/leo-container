import React, { useState } from 'react';
import { useStore } from '../store/StoreContext';
import { PackageSearch, Image as ImageIcon, Video, LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ContainerRepair } from '../types';
import { getOptimizedMediaUrl } from '../lib/mediaUtils';
import { auth } from '../lib/firebase';

export const CoordinatorDashboard: React.FC = () => {
  const { state } = useStore();
  const [activeTab, setActiveTab] = useState<'Repairing' | 'Repaired'>('Repairing');
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  const filteredContainers = state.containers
    .filter(c => c.status === activeTab)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const selectedContainer = state.containers.find(c => c.id === selectedContainerId);
  const selectedRepair = state.repairs.find(
    r => r.containerId === selectedContainerId && (r.status === 'active' || r.status === 'completed')
  );

  return (
    <div className="h-full flex flex-col bg-carbon-950 font-sans p-6 text-slate-100 overflow-y-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Coordinator</h1>
          <p className="text-slate-400 text-sm">Repair Monitoring</p>
        </div>
        <button 
          onClick={() => auth.signOut()}
          className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex bg-black/40 rounded-xl p-1 mb-6 border border-white/5">
        <button
          className={cn(
            "flex-1 py-3 text-sm font-medium rounded-lg transition-all",
            activeTab === 'Repairing' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "text-slate-400 hover:text-white"
          )}
          onClick={() => { setActiveTab('Repairing'); setSelectedContainerId(null); }}
        >
          Repairing ({state.containers.filter(c => c.status === 'Repairing').length})
        </button>
        <button
          className={cn(
            "flex-1 py-3 text-sm font-medium rounded-lg transition-all",
            activeTab === 'Repaired' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "text-slate-400 hover:text-white"
          )}
          onClick={() => { setActiveTab('Repaired'); setSelectedContainerId(null); }}
        >
          Repaired ({state.containers.filter(c => c.status === 'Repaired').length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-8">
        {filteredContainers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <PackageSearch className="w-12 h-12 mb-4 opacity-50" />
            <p>No containers in {activeTab}</p>
          </div>
        ) : (
          filteredContainers.map(container => (
            <motion.div 
              key={container.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-carbon-900 border border-white/5 rounded-xl p-4 cursor-pointer hover:border-white/10 transition-colors"
              onClick={() => setSelectedContainerId(container.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-mono text-lg font-bold text-white tracking-wider">{container.number}</h3>
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider mt-1",
                    container.type === 'Foreign' ? "bg-laser-indigo/10 text-laser-indigo" : "bg-emerald-500/10 text-emerald-400"
                  )}>
                    {container.type}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                 <span className={cn(
                   "text-xs px-2 py-1 rounded font-medium",
                   container.status === 'Repairing' ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
                 )}>
                   {container.status}
                 </span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Media Modal */}
      <AnimatePresence>
        {selectedContainerId && selectedContainer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 bg-carbon-950 flex flex-col pt-12 md:p-6"
          >
            <div className="w-full max-w-md mx-auto flex flex-col h-full bg-carbon-900 border-x md:border border-white/10 relative overflow-hidden md:rounded-2xl shadow-2xl">
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-carbon-900 sticky top-0 z-10">
                <div>
                  <h2 className="font-mono text-xl font-bold text-white tracking-wider">{selectedContainer.number}</h2>
                  <p className="text-xs text-slate-400">Media Viewer</p>
                </div>
                <button
                  onClick={() => setSelectedContainerId(null)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-slate-300 font-medium transition-colors"
                >
                  Close
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-8 pb-32">
                {!selectedRepair && (
                  <div className="text-center py-12 text-slate-500 text-sm">
                    No repair records found for this container.
                  </div>
                )}
                
                {selectedRepair && (
                  <>
                    <CoordinatorMediaPhase phase="before" repair={selectedRepair} />
                    <CoordinatorMediaPhase phase="after" repair={selectedRepair} />
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CoordinatorMediaPhase: React.FC<{ phase: 'before' | 'after', repair: ContainerRepair }> = ({ phase, repair }) => {
  const media = repair[`${phase}Media`];
  const hasImages = media.images.length > 0;
  const hasVideo = !!media.video;

  if (!hasImages && !hasVideo) {
    return null;
  }

  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-4 flex items-center capitalize">
        <span className="w-2 h-2 rounded-full bg-laser-indigo mr-2"></span>
        {phase} Repair Details
      </h3>

      {hasVideo && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-400 flex items-center gap-1"><Video className="w-4 h-4"/> Video</span>
            <a
              href={getOptimizedMediaUrl(media.video!, 'video', { asDownload: true })}
              download
              target="_blank"
              rel="noreferrer"
              className="text-xs text-laser-indigo hover:text-white transition-colors underline"
            >
              Download
            </a>
          </div>
          <video 
            src={getOptimizedMediaUrl(media.video!, 'video', { isLightbox: true })} 
            poster={getOptimizedMediaUrl(media.video!, 'video', { isThumbnail: true, videoThumbnail: media.videoThumbnail })}
            className="w-full aspect-video rounded-xl object-cover bg-black"
            controls
            preload="metadata"
          />
        </div>
      )}

      {hasImages && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-slate-400 flex items-center gap-1"><ImageIcon className="w-4 h-4"/> Images ({media.images.length})</span>
            {media.images.length > 0 && (
              <span className="text-xs text-slate-500">
                Click thumbnails to download
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {media.images.map((img, idx) => (
              <div key={idx} className="relative aspect-square bg-black rounded-lg overflow-hidden group">
                <img 
                  src={getOptimizedMediaUrl(img, 'image', { isThumbnail: true })} 
                  alt="" 
                  className="w-full h-full object-cover" 
                />
                <a
                  href={getOptimizedMediaUrl(img, 'image', { asDownload: true })}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-white text-sm backdrop-blur-sm"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
