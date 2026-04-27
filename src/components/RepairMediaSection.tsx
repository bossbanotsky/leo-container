import React, { useState, useRef } from 'react';
import { ContainerRepair } from '../types';
import { useStore } from '../store/StoreContext';
import { uploadMedia } from '../services/CloudinaryService';
import { Image, Video, Upload, Trash2, CheckCircle, Clock, Download, X, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { compressImage, compressVideo, getVideoDuration, getOptimizedMediaUrl } from '../lib/mediaUtils';
import { InAppCamera } from './InAppCamera';

interface RepairMediaSectionProps {
  containerId: string;
}

export const RepairMediaSection: React.FC<RepairMediaSectionProps> = ({ containerId }) => {
  const { state, startRepair, completeRepair, updateRepairMedia, removeRepairMedia } = useStore();
  const container = state.containers.find(c => c.id === containerId);
  const containerNumber = container?.number || containerId;
  const repair = state.repairs.find(r => r.containerId === containerId && r.status === 'active') || 
                 state.repairs.find(r => r.containerId === containerId && r.status === 'completed');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [percentProgress, setPercentProgress] = useState<number>(0);
  const [activePhase, setActivePhase] = useState<'before' | 'after'>('before');
  const [selectedMedia, setSelectedMedia] = useState<{ type: 'image' | 'video', url: string, phase?: 'before' | 'after', videoThumbnail?: string | null } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'image' | 'video', url?: string } | null>(null);
  const [cameraMode, setCameraMode] = useState<'video' | 'image' | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  const processFiles = async (files: File[], phase: 'before' | 'after', typeHint?: 'video' | 'image') => {
    if (files.length === 0) return;

    setIsUploading(true);
    setPercentProgress(0);
    try {
      for (const file of files) {
        // Detect video based on actual file type OR the provided hint
        const isVideo = file.type.startsWith('video/') || typeHint === 'video' || (file.name.toLowerCase().endsWith('.mp4') || file.name.toLowerCase().endsWith('.webm'));
        
        console.log(`Processing file: ${file.name}, size: ${Math.round(file.size/1024)}KB, type: ${file.type}, isVideo detected: ${isVideo}, hint: ${typeHint}`);

        if (isVideo) {
          try {
            const duration = await getVideoDuration(file);
            if (duration > 120) {
                throw new Error("Video must be 2 minutes or less");
            }
          } catch(e) {
            console.warn("Could not determine duration, proceeding with compression");
          }
          
          const originalSizeMB = Math.round(file.size / (1024 * 1024));
          setUploadProgress(`Compressing Video...`);
          let fileToUpload = await compressVideo(file, (ratio) => {
              setUploadProgress(`Optimizing size...`);
              setPercentProgress(Math.round(ratio * 100));
          });
          
          const compressedSizeMB = Math.round(fileToUpload.size / (1024 * 1024));
          const compressedLabel = originalSizeMB > compressedSizeMB ? `${originalSizeMB}MB → ${compressedSizeMB}MB compressed ✔` : 'Compression skipped';

          setUploadProgress(`Uploading Video... (${compressedLabel})`);
          setPercentProgress(0);
          const folder = `containers/${containerNumber}/${phase}`;
          const url = await uploadMedia(fileToUpload, folder, (progress) => {
            setPercentProgress(progress);
          });
          setUploadProgress('Processing Video...');
          setPercentProgress(100);
          await updateRepairMedia(repair.id, phase, 'video', url);
        } else {
          // It's an image
          const currentImagesCount = repair[`${phase}Media`].images.length;
          if (currentImagesCount >= 10) {
            console.warn('Skipping extra images - reached limit of 10');
            continue;
          }

          const originalSizeKB = Math.round(file.size / 1024);
          setUploadProgress(`Compressing Image...`);
          setPercentProgress(20);
          
          const fileToUpload = await compressImage(file);
          const compressedSizeKB = Math.round(fileToUpload.size / 1024);
          const compressionLabel = originalSizeKB > compressedSizeKB ? `${originalSizeKB}KB → ${compressedSizeKB}KB ✔` : 'Already optimized';
          
          setUploadProgress(`Uploading Image... (${compressionLabel})`);
          setPercentProgress(0);
          const folder = `containers/${containerNumber}/${phase}`;
          const url = await uploadMedia(fileToUpload, folder, (progress) => {
            setPercentProgress(progress);
          });
          
          await updateRepairMedia(repair.id, phase, 'image', url);
        }
      }
      setUploadProgress('Upload complete');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress('');
        setPercentProgress(0);
      }, 1500); 
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, phase: 'before' | 'after', typeHint?: 'video' | 'image') => {
    const files = Array.from(e.target.files || []) as File[];
    await processFiles(files, phase, typeHint);
    if (e.target) e.target.value = ''; // Reset input
  };

  const handleCloseCamera = React.useCallback(() => {
    setCameraMode(null);
  }, []);

  const handleCaptureCamera = React.useCallback(async (file: File) => {
    const mode = cameraMode;
    setCameraMode(null);
    await processFiles([file], activePhase, mode || undefined);
  }, [activePhase, cameraMode]);

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
                  href={getOptimizedMediaUrl(repair[`${activePhase}Media`].video!, 'video', { asDownload: true })}
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
                <>
                  <img 
                    src={getOptimizedMediaUrl(repair[`${activePhase}Media`].video!, 'video', { isThumbnail: true, videoThumbnail: repair[`${activePhase}Media`].videoThumbnail })} 
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setSelectedMedia({ type: 'video', url: repair[`${activePhase}Media`].video!, phase: activePhase, videoThumbnail: repair[`${activePhase}Media`].videoThumbnail })}
                    alt="Video thumbnail"
                  />
                  <div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ type: 'video' });
                      }}
                      className="absolute top-2 right-2 bg-black/60 p-2 rounded-full hover:bg-rose-500 transition-colors z-10"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-4">
                  <Video className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">No Video Evidence</p>
                  
                  {!isCompleted && (
                    <div className="flex gap-3 justify-center">
                      <button 
                        onClick={() => setCameraMode('video')}
                        className="flex items-center gap-2 px-4 py-2 bg-laser-indigo text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:scale-105 transition-transform shadow-lg shadow-laser-indigo/20"
                      >
                        <Video className="w-4 h-4" /> Capture
                      </button>
                      <label className="flex items-center gap-2 px-4 py-2 bg-carbon-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-carbon-600 transition-all cursor-pointer shadow-lg">
                        <input 
                          type="file" 
                          accept="video/*" 
                          className="hidden" 
                          onChange={(e) => handleFileUpload(e, activePhase, 'video')}
                          disabled={isUploading}
                        />
                        <Upload className="w-4 h-4" /> Upload
                      </label>
                    </div>
                  )}
                </div>
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
                <div 
                  key={idx} 
                  className="aspect-square bg-black rounded-lg border border-white/5 overflow-hidden group relative cursor-pointer"
                  onClick={() => setSelectedMedia({ type: 'image', url: img })}
                >
                  <img src={getOptimizedMediaUrl(img, 'image', { isThumbnail: true })} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm({ type: 'image', url: img });
                        }}
                        className="bg-black/60 p-1.5 rounded text-slate-300 hover:text-rose-500 hover:bg-rose-500/20 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <a
                        href={getOptimizedMediaUrl(img, 'image', { asDownload: true })}
                        download
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="bg-black/60 p-1.5 rounded text-slate-300 hover:text-white transition-colors"
                      >
                         <Download className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              {!isCompleted && repair[`${activePhase}Media`].images.length < 10 && (
                <div className="aspect-square bg-carbon-800 border-2 border-dashed border-white/10 rounded-lg flex flex-col items-center justify-center gap-2 group hover:border-laser-indigo/50 transition-all">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCameraMode('image')}
                      className="p-2.5 bg-laser-indigo rounded-full hover:scale-110 transition-transform text-white shadow-xl shadow-laser-indigo/20"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <label className="p-2.5 bg-carbon-700 rounded-full hover:scale-110 hover:bg-carbon-600 transition-all text-white cursor-pointer shadow-xl">
                       <input 
                        type="file" 
                        accept="image/*" 
                        multiple
                        className="hidden" 
                        onChange={(e) => handleFileUpload(e, activePhase, 'image')}
                        disabled={isUploading}
                      />
                      <Upload className="w-4 h-4" />
                    </label>
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">Add Media</span>
                </div>
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

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedMedia && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
            onClick={() => setSelectedMedia(null)}
          >
            <button 
              className="absolute top-6 right-6 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors z-50"
              onClick={() => setSelectedMedia(null)}
            >
              <X className="w-6 h-6" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              {selectedMedia.type === 'image' ? (
                <img 
                  src={getOptimizedMediaUrl(selectedMedia.url, 'image', { isLightbox: true })} 
                  alt="Enlarged view" 
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
                />
              ) : (
                <video 
                  ref={videoRef}
                  src={getOptimizedMediaUrl(selectedMedia.url, 'video', { isLightbox: true })} 
                  poster={getOptimizedMediaUrl(selectedMedia.url, 'video', { isThumbnail: true, videoThumbnail: selectedMedia.videoThumbnail })}
                  className="max-w-full max-h-[85vh] rounded-xl shadow-2xl"
                  controls
                  preload="metadata"
                />
              )}
              
              <div className="mt-4 flex gap-4">
                <a
                  href={getOptimizedMediaUrl(selectedMedia.url, selectedMedia.type, { asDownload: true })}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Original
                </a>
                <button
                  onClick={() => {
                    setDeleteConfirm({ type: selectedMedia.type, url: selectedMedia.url });
                  }}
                  className="bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete Permanently
                </button>
                {!isCompleted && selectedMedia.type === 'video' && (
                   <button
                     onClick={() => {
                        if (videoRef.current && selectedMedia.phase) {
                           const time = videoRef.current.currentTime;
                           updateRepairMedia(repair.id, selectedMedia.phase, 'video', selectedMedia.url, time.toFixed(2));
                           alert("Thumbnail updated!");
                        }
                     }}
                     className="bg-laser-indigo/20 hover:bg-laser-indigo/40 text-laser-indigo hover:text-white px-6 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors"
                   >
                     <Image className="w-4 h-4" /> Set as Thumbnail
                   </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-carbon-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <div className="w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-rose-500" />
              </div>
              <h3 className="text-white text-center font-bold text-lg mb-2">Delete Media?</h3>
              <p className="text-slate-400 text-center text-sm mb-6">
                Are you sure you want to delete this {deleteConfirm.type}? This will permanently remove the file from your uploads.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-carbon-800 hover:bg-carbon-700 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    removeRepairMedia(repair.id, activePhase, deleteConfirm.type, deleteConfirm.url);
                    setDeleteConfirm(null);
                    setSelectedMedia(null);
                  }}
                  className="flex-1 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {cameraMode && (
        <InAppCamera
          mode={cameraMode}
          onClose={handleCloseCamera}
          onCapture={handleCaptureCamera}
        />
      )}
    </div>
  );
};

