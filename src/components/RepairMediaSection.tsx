import React, { useState } from 'react';
import { ContainerRepair } from '../types';
import { useStore } from '../store/StoreContext';
import { uploadMedia } from '../services/CloudinaryService';
import { Image, Video, Upload, Trash2, CheckCircle, Clock, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { compressImage, compressVideo, getVideoDuration, getOptimizedMediaUrl } from '../lib/mediaUtils';

interface RepairMediaSectionProps {
  containerId: string;
}

export const RepairMediaSection: React.FC<RepairMediaSectionProps> = ({ containerId }) => {
  const { state, startRepair, completeRepair, updateRepairMedia } = useStore();
  const container = state.containers.find(c => c.id === containerId);
  const containerNumber = container?.number || containerId;
  const repair = state.repairs.find(r => r.containerId === containerId && r.status === 'active') || 
                 state.repairs.find(r => r.containerId === containerId && r.status === 'completed');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [percentProgress, setPercentProgress] = useState<number>(0);
  const [activePhase, setActivePhase] = useState<'before' | 'after'>('before');

  if (!repair) {
    return (
      <div className="bg-carbon-800/50 border-2 border-dashed border-white/10 rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-laser-indigo/20 rounded-full flex items-center justify-center mx-auto">
          <Upload className="w-8 h-8 text-laser-indigo" />
        </div>
        <div>
          <h4 className="text-white font-black uppercase tracking-tight text-lg">No Active Repair Cycle</h4>
          <p className="text-slate-400 text-xs">Start a repair cycle to begin attaching media evidence.</p>
        </div>
        <button
          onClick={() => startRepair(containerId)}
          className="bg-laser-indigo text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-laser-indigo/20 hover:scale-105 transition-transform"
        >
          Start Repair Cycle
        </button>
      </div>
    );
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image', phase: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setPercentProgress(0);
    try {
      let fileToUpload = file;
      
      if (type === 'video') {
        const duration = await getVideoDuration(file);
        if (duration > 120) {
            throw new Error("Video must be 2 minutes or less");
        }
        setUploadProgress('Compressing Video...');
        fileToUpload = await compressVideo(file, (ratio) => {
            setUploadProgress('Compressing Video...');
            setPercentProgress(Math.round(ratio * 100));
        });
      } else {
        setUploadProgress('Compressing Image...');
        setPercentProgress(50);
        fileToUpload = await compressImage(file);
      }

      setUploadProgress('Uploading to Server...');
      setPercentProgress(0);
      const folder = `containers/${containerNumber}/${phase}`;
      const url = await uploadMedia(fileToUpload, folder, (progress) => {
        setPercentProgress(progress);
      });
      setUploadProgress('Processing...');
      setPercentProgress(100);
      await updateRepairMedia(repair.id, phase, type, url);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      setPercentProgress(0);
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const isCompleted = repair.status === 'completed';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-carbon-800 p-4 rounded-xl border border-white/10">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckCircle className="w-5 h-5 text-lime-400" />
          ) : (
            <Clock className="w-5 h-5 text-fuchsia-400 animate-pulse" />
          )}
          <div>
            <h4 className="text-white font-black uppercase tracking-tight text-sm">
              Repair Cycle: {repair.id.slice(0, 8).toUpperCase()}
            </h4>
            <p className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isCompleted ? "text-lime-400" : "text-fuchsia-400"
            )}>
              {repair.status === 'active' ? 'IN PROGRESS' : 'COMPLETED'}
            </p>
          </div>
        </div>
        {repair.status === 'active' && (
          <button
            onClick={() => completeRepair(repair.id)}
            className="bg-lime-500 text-black px-4 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] hover:bg-lime-400 transition-colors"
          >
            Mark as Fixed
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {(['before', 'after'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setActivePhase(p)}
            className={cn(
              "flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border-2",
              activePhase === p 
                ? "bg-laser-indigo border-laser-indigo text-white shadow-xl" 
                : "bg-carbon-800 border-white/5 text-slate-400 hover:border-white/10"
            )}
          >
            {p} REPAIR
          </button>
        ))}
      </div>

      <div className="space-y-6 bg-carbon-800/30 p-6 rounded-2xl border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Video Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
              <span className="flex items-center gap-2"><Video className="w-3 h-3" /> Video (1 Max)</span>
              {repair[`${activePhase}Media`].video && (
                <a 
                  href={getOptimizedMediaUrl(repair[`${activePhase}Media`].video!, 'video', true)}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="text-laser-indigo flex items-center gap-1 hover:underline"
                >
                  <Download className="w-3 h-3" /> <span className="text-[9px]">GET</span>
                </a>
              )}
            </label>
            <div className="aspect-video bg-black rounded-xl border-2 border-white/5 flex items-center justify-center relative overflow-hidden group">
              {repair[`${activePhase}Media`].video ? (
                <video 
                  src={getOptimizedMediaUrl(repair[`${activePhase}Media`].video!, 'video')} 
                  className="w-full h-full object-cover"
                  controls
                />
              ) : (
                <div className="text-center">
                  <Video className="w-8 h-8 text-slate-700 mx-auto mb-2" />
                  <p className="text-[9px] text-slate-600 font-black uppercase">No Video Attached</p>
                </div>
              )}
              {!isCompleted && !repair[`${activePhase}Media`].video && (
                <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                  <input 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, 'video', activePhase)}
                    disabled={isUploading}
                  />
                  <Upload className="w-6 h-6 text-white" />
                </label>
              )}
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center">
              <span className="flex items-center gap-2"><Image className="w-3 h-3" /> Images (Max 10)</span>
              <span className="text-laser-indigo">{repair[`${activePhase}Media`].images.length}/10</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {repair[`${activePhase}Media`].images.map((img, idx) => (
                <div key={idx} className="aspect-square bg-black rounded-lg border border-white/5 overflow-hidden group relative">
                  <img src={getOptimizedMediaUrl(img, 'image')} alt="" className="w-full h-full object-cover" />
                  <a
                    href={getOptimizedMediaUrl(img, 'image', true)}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="absolute inset-x-0 bottom-0 bg-black/80 flex justify-center py-2 translate-y-full group-hover:translate-y-0 transition-transform"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </a>
                </div>
              ))}
              {!isCompleted && repair[`${activePhase}Media`].images.length < 10 && (
                <label className="aspect-square bg-carbon-800 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:border-laser-indigo/50 transition-all group">
                   <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(e, 'image', activePhase)}
                    disabled={isUploading}
                  />
                  <Upload className="w-4 h-4 text-slate-600 group-hover:text-laser-indigo" />
                </label>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {isUploading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-8 right-8 bg-carbon-900 border-2 border-laser-indigo/30 p-5 rounded-2xl shadow-2xl flex flex-col gap-3 z-50 w-80 backdrop-blur-md"
        >
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-laser-indigo border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] font-black uppercase tracking-widest">{uploadProgress || 'Uploading Media...'}</span>
            </div>
            <span className="text-[10px] text-laser-indigo font-black">{percentProgress}%</span>
          </div>
          
          <div className="h-2 w-full bg-carbon-800 rounded-full overflow-hidden border border-white/5">
            <motion.div
              className="h-full bg-laser-indigo"
              initial={{ width: 0 }}
              animate={{ width: `${percentProgress}%` }}
              transition={{ ease: "linear", duration: 0.2 }}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
};

