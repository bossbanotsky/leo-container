import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Container, Invoice, ContainerType, ContainerStatus, ContainerRepair, MediaData, VideoVersion } from '../types';
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  User,
  signOut
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { differenceInDays } from 'date-fns';
import { deleteMedia, archiveMedia } from '../services/CloudinaryService';

interface StoreContextType {
  state: AppState;
  user: User | null;
  userRole: 'admin' | 'coordinator';
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  addContainer: (number: string, type: ContainerType, localReference?: string) => Promise<{ success: boolean; error?: string }>;
  updateLocalReference: (id: string, localRef: string) => Promise<{ success: boolean; error?: string }>;
  updateContainerStatus: (id: string, status: ContainerStatus) => Promise<void>;
  deleteContainer: (id: string) => Promise<void>;
  addContainerNote: (containerId: string, text: string) => Promise<void>;
  bulkUpdateContainerStatus: (ids: string[], status: ContainerStatus) => Promise<void>;
  bulkDeleteContainers: (ids: string[]) => Promise<void>;
  createInvoice: (invoiceNumber: string) => Promise<{ success: boolean; error?: string }>;
  addContainersToInvoice: (invoiceId: string, containerIds: string[]) => Promise<void>;
  removeContainerFromInvoice: (invoiceId: string, containerId: string) => Promise<void>;
  deleteInvoice: (invoiceId: string) => Promise<void>;
  bulkDeleteInvoices: (ids: string[]) => Promise<void>;
  markInvoiceBilled: (invoiceId: string) => Promise<void>;
  bulkMarkInvoicesBilled: (ids: string[]) => Promise<void>;
  approveInvoice: (invoiceId: string) => Promise<void>;
  bulkApproveInvoices: (ids: string[]) => Promise<void>;
  unapproveInvoice: (invoiceId: string) => Promise<void>;
  bulkUnapproveInvoices: (ids: string[]) => Promise<void>;
  archiveInvoice: (invoiceId: string) => Promise<void>;
  bulkArchiveInvoices: (ids: string[]) => Promise<void>;
  createManualInvoice: (invoiceNumber: string, localContainers: string[], foreignContainers: string[]) => Promise<{ success: boolean; error?: string }>;
  undoInvoiceBilled: (invoiceId: string) => Promise<void>;
  undoInvoiceArchived: (invoiceId: string) => Promise<void>;
  bulkUndoInvoiceBilled: (ids: string[]) => Promise<void>;
  bulkUndoInvoiceArchived: (ids: string[]) => Promise<void>;
  updateContainerData: (id: string, number: string, localReference: string) => Promise<{ success: boolean; error?: string }>;
  startRepair: (containerId: string) => Promise<{ success: boolean; repairId?: string; error?: string }>;
  completeRepair: (repairId: string) => Promise<void>;
  updateRepairMedia: (repairId: string, phase: 'before' | 'after', type: 'video' | 'image', data: string | VideoVersion) => Promise<void>;
  removeRepairMedia: (repairId: string, phase: 'before' | 'after', type: 'video' | 'image', url?: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>({ containers: [], invoices: [], repairs: [] });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Firestore listeners
  useEffect(() => {
    if (!user) return;

    const qContainers = query(collection(db, 'containers'), orderBy('createdAt', 'desc'), limit(200));
    const unsubscribeContainers = onSnapshot(qContainers, (snapshot) => {
      const containers = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (data.updatedAt || data.createdAt),
          history: data.history?.map((h: any) => ({
            ...h,
            timestamp: h.timestamp instanceof Timestamp ? h.timestamp.toMillis() : h.timestamp
          })),
          notes: data.notes?.map((n: any) => ({
            ...n,
            timestamp: n.timestamp instanceof Timestamp ? n.timestamp.toMillis() : n.timestamp
          }))
        } as Container;
      });
      setState(s => ({ ...s, containers }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'containers');
    });

    const qInvoices = query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribeInvoices = onSnapshot(qInvoices, (snapshot) => {
      const invoices = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          billedAt: data.billedAt instanceof Timestamp ? data.billedAt.toMillis() : data.billedAt,
          archivedAt: data.archivedAt instanceof Timestamp ? data.archivedAt.toMillis() : data.archivedAt
        } as Invoice;
      });
      setState(s => ({ ...s, invoices }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'invoices');
    });

    const qRepairs = query(collection(db, 'containerRepairs'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribeRepairs = onSnapshot(qRepairs, (snapshot) => {
      const repairs = snapshot.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : data.createdAt,
          completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toMillis() : data.completedAt
        } as ContainerRepair;
      });
      setState(s => ({ ...s, repairs }));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'containerRepairs');
    });

    return () => {
      unsubscribeContainers();
      unsubscribeInvoices();
      unsubscribeRepairs();
    };
  }, [user]);

  // Auto-archive check (client-side trigger for now)
  useEffect(() => {
    if (!user || state.invoices.length === 0) return;

    const now = Date.now();
    const toArchive = state.invoices.filter(inv => 
      inv.status === 'Billed' && 
      inv.billedAt && 
      differenceInDays(now, inv.billedAt) >= 3
    );

    if (toArchive.length > 0) {
      toArchive.forEach(inv => archiveInvoice(inv.id));
    }
  }, [state.invoices, user]);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const addContainer = async (number: string, type: ContainerType, localReference?: string) => {
    const formattedNumber = number.trim().toUpperCase();
    const existing = state.containers.find(c => c.number.toUpperCase() === formattedNumber);
    
    if (existing) {
      return { success: false, error: 'Duplicated container' };
    }
    
    const containerData = {
      number: formattedNumber,
      type,
      localReference: type === 'Local' ? formattedNumber : (localReference?.trim().toUpperCase() || null),
      status: 'Active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      history: [{ status: 'Active', timestamp: new Date().getTime() }] // serverTimestamp inside array is tricky in native firestore, using client time for history is okay or just omit for now
    };

    try {
      await addDoc(collection(db, 'containers'), containerData);
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'containers');
      return { success: false, error: 'Failed to create' };
    }
  };

  const updateLocalReference = async (id: string, localRef: string) => {
    const formattedRef = localRef.trim().toUpperCase();
    const existing = state.containers.find(c => (c.localReference === formattedRef || c.number === formattedRef) && c.id !== id);
    if (existing) {
      return { success: false, error: 'Duplicated container' };
    }

    try {
      await updateDoc(doc(db, 'containers', id), {
        localReference: formattedRef,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `containers/${id}`);
      return { success: false, error: 'Failed to update' };
    }
  };

  const updateContainerStatus = async (id: string, status: ContainerStatus) => {
    const container = state.containers.find(c => c.id === id);
    if (!container || container.status === status) return;

    try {
      await updateDoc(doc(db, 'containers', id), {
        status,
        updatedAt: serverTimestamp(),
        history: [...(container.history || []), { status, timestamp: new Date().getTime() }]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `containers/${id}`);
    }
  };
  
  const bulkUpdateContainerStatus = async (ids: string[], status: ContainerStatus) => {
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().getTime();
      
      ids.forEach(id => {
        const container = state.containers.find(c => c.id === id);
        if (!container || container.status === status) return;
        
        batch.update(doc(db, 'containers', id), {
          status,
          updatedAt: serverTimestamp(),
          history: [...(container.history || []), { status, timestamp }]
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-update-containers');
    }
  };

  const deleteContainer = async (id: string) => {
    try {
      const batch = writeBatch(db);
      
      // Find associated repairs
      const associatedRepairs = state.repairs.filter(r => r.containerId === id);
      
      // Delete repairs from Firestore
      associatedRepairs.forEach(r => {
        batch.delete(doc(db, 'containerRepairs', r.id));
      });

      // Delete container from Firestore
      batch.delete(doc(db, 'containers', id));
      
      // Remove from any invoice
      state.invoices.forEach(inv => {
        if (inv.containerIds.includes(id)) {
          batch.update(doc(db, 'invoices', inv.id), {
            containerIds: inv.containerIds.filter(cid => cid !== id)
          });
        }
      });

      // Commit Firestore changes first
      await batch.commit();

      // Cleanup media from Cloudinary (asynchronous, after DB cleanup)
      for (const repair of associatedRepairs) {
        const urlsSet = new Set<string>();
        
        // Add images
        repair.beforeMedia.images.forEach(url => urlsSet.add(url));
        repair.afterMedia.images.forEach(url => urlsSet.add(url));
        
        // Add all video versions
        if (repair.beforeMedia.video && typeof repair.beforeMedia.video !== 'string') {
          urlsSet.add(repair.beforeMedia.video.originalUrl);
          if (repair.beforeMedia.video.playbackUrl) urlsSet.add(repair.beforeMedia.video.playbackUrl);
          if (repair.beforeMedia.video.downloadUrl) urlsSet.add(repair.beforeMedia.video.downloadUrl);
          if (repair.beforeMedia.video.thumbnailUrl && repair.beforeMedia.video.thumbnailUrl.startsWith('http')) {
            urlsSet.add(repair.beforeMedia.video.thumbnailUrl);
          }
        } else if (typeof repair.beforeMedia.video === 'string') {
          urlsSet.add(repair.beforeMedia.video);
        }

        if (repair.afterMedia.video && typeof repair.afterMedia.video !== 'string') {
          urlsSet.add(repair.afterMedia.video.originalUrl);
          if (repair.afterMedia.video.playbackUrl) urlsSet.add(repair.afterMedia.video.playbackUrl);
          if (repair.afterMedia.video.downloadUrl) urlsSet.add(repair.afterMedia.video.downloadUrl);
          if (repair.afterMedia.video.thumbnailUrl && repair.afterMedia.video.thumbnailUrl.startsWith('http')) {
            urlsSet.add(repair.afterMedia.video.thumbnailUrl);
          }
        } else if (typeof repair.afterMedia.video === 'string') {
          urlsSet.add(repair.afterMedia.video);
        }

        for (const url of urlsSet) {
          try {
            await deleteMedia(url);
          } catch (e) {
            console.error(`Failed to delete orphaned media ${url}:`, e);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `containers/${id}`);
    }
  };
  
  const bulkDeleteContainers = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      const allAssociatedRepairs: ContainerRepair[] = [];
      
      ids.forEach(id => {
        // Find associated repairs
        const associatedRepairs = state.repairs.filter(r => r.containerId === id);
        allAssociatedRepairs.push(...associatedRepairs);
        
        // Delete repairs from Firestore
        associatedRepairs.forEach(r => {
          batch.delete(doc(db, 'containerRepairs', r.id));
        });

        // Delete container from Firestore
        batch.delete(doc(db, 'containers', id));
        
        // Remove from any invoice
        state.invoices.forEach(inv => {
          if (inv.containerIds.includes(id)) {
            batch.update(doc(db, 'invoices', inv.id), {
              containerIds: inv.containerIds.filter(cid => cid !== id)
            });
          }
        });
      });
      
      await batch.commit();

      // Cleanup media from Cloudinary
      for (const repair of allAssociatedRepairs) {
        const urlsSet = new Set<string>();
        
        // Add images
        repair.beforeMedia.images.forEach(url => urlsSet.add(url));
        repair.afterMedia.images.forEach(url => urlsSet.add(url));
        
        // Add all video versions
        if (repair.beforeMedia.video && typeof repair.beforeMedia.video !== 'string') {
          urlsSet.add(repair.beforeMedia.video.originalUrl);
          if (repair.beforeMedia.video.playbackUrl) urlsSet.add(repair.beforeMedia.video.playbackUrl);
          if (repair.beforeMedia.video.downloadUrl) urlsSet.add(repair.beforeMedia.video.downloadUrl);
          if (repair.beforeMedia.video.thumbnailUrl && repair.beforeMedia.video.thumbnailUrl.startsWith('http')) {
            urlsSet.add(repair.beforeMedia.video.thumbnailUrl);
          }
        } else if (typeof repair.beforeMedia.video === 'string') {
          urlsSet.add(repair.beforeMedia.video);
        }

        if (repair.afterMedia.video && typeof repair.afterMedia.video !== 'string') {
          urlsSet.add(repair.afterMedia.video.originalUrl);
          if (repair.afterMedia.video.playbackUrl) urlsSet.add(repair.afterMedia.video.playbackUrl);
          if (repair.afterMedia.video.downloadUrl) urlsSet.add(repair.afterMedia.video.downloadUrl);
          if (repair.afterMedia.video.thumbnailUrl && repair.afterMedia.video.thumbnailUrl.startsWith('http')) {
            urlsSet.add(repair.afterMedia.video.thumbnailUrl);
          }
        } else if (typeof repair.afterMedia.video === 'string') {
          urlsSet.add(repair.afterMedia.video);
        }

        for (const url of urlsSet) {
          try {
            await deleteMedia(url);
          } catch (e) {
            console.error(`Failed to bulk delete orphaned media ${url}:`, e);
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-delete-containers');
    }
  };

  const addContainerNote = async (containerId: string, text: string) => {
    if (!user) return;
    const container = state.containers.find(c => c.id === containerId);
    if (!container) return;

    const note = {
      id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      text,
      authorId: user.uid,
      authorEmail: user.email || 'unknown',
      timestamp: new Date().getTime()
    };

    try {
      await updateDoc(doc(db, 'containers', containerId), {
        notes: [...(container.notes || []), note],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `containers/${containerId}`);
    }
  };

  const createManualInvoice = async (invoiceNumber: string, localNumbers: string[], foreignNumbers: string[]) => {
    if (!user) return { success: false, error: 'User not authenticated' };
    if (state.invoices.find(i => i.invoiceNumber === invoiceNumber.trim().toUpperCase())) {
      return { success: false, error: 'Invoice number already exists.' };
    }
    
    try {
      const batch = writeBatch(db);
      const timestamp = new Date().getTime();
      const serverTime = serverTimestamp();
      const containerIds: string[] = [];

      // Create Local Containers
      localNumbers.forEach(entry => {
        if (!entry.trim()) return;
        let reference = entry.trim();
        let number = reference;

        // Split by the middle " - " separator
        if (entry.includes(' - ')) {
          const parts = entry.split(' - ');
          reference = parts[0].trim();
          number = parts.slice(1).join(' - ').trim();
        }

        const newId = doc(collection(db, 'containers')).id;
        containerIds.push(newId);
        batch.set(doc(db, 'containers', newId), {
          number,
          type: 'Local',
          localReference: reference,
          status: 'Billing',
          createdAt: serverTime,
          updatedAt: serverTime,
          history: [{ status: 'Active', timestamp: timestamp }, { status: 'Repairing', timestamp: timestamp }, { status: 'Repaired', timestamp: timestamp }, { status: 'Billing', timestamp: timestamp }],
          notes: [{ 
            id: Math.random().toString(36).substring(2),
            text: 'Bypassed entry - Quick Invoice', 
            authorId: user.uid,
            authorEmail: user.email || 'system',
            timestamp 
          }]
        });
      });

      // Create Foreign Containers
      foreignNumbers.forEach(entry => {
        if (!entry.trim()) return;
        let reference = entry.trim();
        let number = reference;

        // Split by the middle " - " separator
        if (entry.includes(' - ')) {
          const parts = entry.split(' - ');
          reference = parts[0].trim();
          number = parts.slice(1).join(' - ').trim();
        }

        const newId = doc(collection(db, 'containers')).id;
        containerIds.push(newId);
        batch.set(doc(db, 'containers', newId), {
          number,
          type: 'Foreign',
          localReference: reference === number ? null : reference,
          status: 'Billing',
          createdAt: serverTime,
          updatedAt: serverTime,
          history: [{ status: 'Active', timestamp: timestamp }, { status: 'Repairing', timestamp: timestamp }, { status: 'Repaired', timestamp: timestamp }, { status: 'Billing', timestamp: timestamp }],
          notes: [{ 
            id: Math.random().toString(36).substring(2),
            text: 'Bypassed entry - Quick Invoice', 
            authorId: user.uid,
            authorEmail: user.email || 'system',
            timestamp 
          }]
        });
      });

      if (containerIds.length === 0) return { success: false, error: 'No containers provided' };

      const invoiceId = doc(collection(db, 'invoices')).id;
      batch.set(doc(db, 'invoices', invoiceId), {
        invoiceNumber: invoiceNumber.trim().toUpperCase(),
        containerIds,
        status: 'Draft',
        createdAt: serverTime,
        updatedAt: serverTime
      });

      await batch.commit();
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'manual-invoice');
      return { success: false, error: 'Failed to create manual invoice' };
    }
  };

  const createInvoice = async (invoiceNumber: string) => {
    if (state.invoices.find(i => i.invoiceNumber === invoiceNumber)) {
      return { success: false, error: 'Billing/Invoice number already exists.' };
    }

    try {
      await addDoc(collection(db, 'invoices'), {
        invoiceNumber,
        containerIds: [],
        status: 'Draft',
        createdAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'invoices');
      return { success: false, error: 'Failed to create' };
    }
  };

  const addContainersToInvoice = async (invoiceId: string, containerIds: string[]) => {
    try {
      const batch = writeBatch(db);
      const invoice = state.invoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      batch.update(doc(db, 'invoices', invoiceId), {
        containerIds: [...new Set([...invoice.containerIds, ...containerIds])]
      });

      containerIds.forEach(cid => {
        batch.update(doc(db, 'containers', cid), {
          status: 'Billing',
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-add-to-invoice');
    }
  };

  const removeContainerFromInvoice = async (invoiceId: string, containerId: string) => {
    try {
      const batch = writeBatch(db);
      const invoice = state.invoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      batch.update(doc(db, 'invoices', invoiceId), {
        containerIds: invoice.containerIds.filter(id => id !== containerId)
      });

      batch.update(doc(db, 'containers', containerId), {
        status: 'Repaired',
        updatedAt: serverTimestamp()
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch-remove-from-invoice');
    }
  };

  const deleteInvoice = async (invoiceId: string) => {
    try {
      const invoice = state.invoices.find(i => i.id === invoiceId);
      if (!invoice) return;
      
      const batch = writeBatch(db);
      batch.delete(doc(db, 'invoices', invoiceId));

      invoice.containerIds.forEach(cid => {
        batch.update(doc(db, 'containers', cid), {
          status: 'Repaired',
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `invoices/${invoiceId}`);
    }
  };
  
  const bulkDeleteInvoices = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      
      ids.forEach(invoiceId => {
        const invoice = state.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        
        batch.delete(doc(db, 'invoices', invoiceId));
        invoice.containerIds.forEach(cid => {
          batch.update(doc(db, 'containers', cid), {
            status: 'Repaired',
            updatedAt: serverTimestamp()
          });
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-delete-invoices');
    }
  };

  const markInvoiceBilled = async (invoiceId: string) => {
    try {
      const invoice = state.invoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      // --- Archiving Media Logic ---
      const repairsToArchive = state.repairs.filter(r => invoice.containerIds.includes(r.containerId));
      const urlsToArchive: string[] = [];
      repairsToArchive.forEach(r => {
        urlsToArchive.push(...r.beforeMedia.images, ...r.afterMedia.images);
        if (r.beforeMedia.video) {
          urlsToArchive.push(r.beforeMedia.video.originalUrl);
          if (r.beforeMedia.video.playbackUrl) urlsToArchive.push(r.beforeMedia.video.playbackUrl);
          if (r.beforeMedia.video.downloadUrl) urlsToArchive.push(r.beforeMedia.video.downloadUrl);
          if (r.beforeMedia.video.thumbnailUrl) urlsToArchive.push(r.beforeMedia.video.thumbnailUrl);
        }
        if (r.afterMedia.video) {
          urlsToArchive.push(r.afterMedia.video.originalUrl);
          if (r.afterMedia.video.playbackUrl) urlsToArchive.push(r.afterMedia.video.playbackUrl);
          if (r.afterMedia.video.downloadUrl) urlsToArchive.push(r.afterMedia.video.downloadUrl);
          if (r.afterMedia.video.thumbnailUrl) urlsToArchive.push(r.afterMedia.video.thumbnailUrl);
        }
      });
      
      let newUrlsMap: Record<string, string> = {};
      if (urlsToArchive.length > 0) {
        try {
          newUrlsMap = await archiveMedia(urlsToArchive);
        } catch (e) {
          console.error("Failed to archive media:", e);
        }
      }

      const batch = writeBatch(db);
      batch.update(doc(db, 'invoices', invoiceId), {
        status: 'Billed',
        billedAt: serverTimestamp()
      });

      invoice.containerIds.forEach(cid => {
        batch.update(doc(db, 'containers', cid), {
          status: 'Billed',
          updatedAt: serverTimestamp()
        });
      });

      // Update repairs with new URLs
      repairsToArchive.forEach(r => {
        const updateMedia = (media: MediaData) => ({
          ...media,
          images: media.images.map((url: string) => newUrlsMap[url] || url),
          video: media.video ? {
            originalUrl: newUrlsMap[media.video.originalUrl] || media.video.originalUrl,
            playbackUrl: newUrlsMap[media.video.playbackUrl] || media.video.playbackUrl,
            downloadUrl: newUrlsMap[media.video.downloadUrl] || media.video.downloadUrl,
            thumbnailUrl: media.video.thumbnailUrl ? (newUrlsMap[media.video.thumbnailUrl] || media.video.thumbnailUrl) : null
          } : null
        });
        
        batch.update(doc(db, 'containerRepairs', r.id), {
          beforeMedia: updateMedia(r.beforeMedia),
          afterMedia: updateMedia(r.afterMedia)
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoiceId}`);
    }
  };
  
  const bulkMarkInvoicesBilled = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      
      const allContainerIds = new Set<string>();
      
      ids.forEach(invoiceId => {
        const invoice = state.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        
        invoice.containerIds.forEach(id => allContainerIds.add(id));
        
        batch.update(doc(db, 'invoices', invoiceId), {
          status: 'Billed',
          billedAt: timestamp
        });
        
        invoice.containerIds.forEach(cid => {
          batch.update(doc(db, 'containers', cid), {
            status: 'Billed',
            updatedAt: timestamp
          });
        });
      });
      
      // --- Archiving Media Logic ---
      const repairsToArchive = state.repairs.filter(r => allContainerIds.has(r.containerId));
      const urlsToArchive: string[] = [];
      repairsToArchive.forEach(r => {
        urlsToArchive.push(...r.beforeMedia.images, ...r.afterMedia.images);
        if (r.beforeMedia.video) {
          urlsToArchive.push(r.beforeMedia.video.originalUrl);
          if (r.beforeMedia.video.playbackUrl) urlsToArchive.push(r.beforeMedia.video.playbackUrl);
          if (r.beforeMedia.video.downloadUrl) urlsToArchive.push(r.beforeMedia.video.downloadUrl);
          if (r.beforeMedia.video.thumbnailUrl) urlsToArchive.push(r.beforeMedia.video.thumbnailUrl);
        }
        if (r.afterMedia.video) {
          urlsToArchive.push(r.afterMedia.video.originalUrl);
          if (r.afterMedia.video.playbackUrl) urlsToArchive.push(r.afterMedia.video.playbackUrl);
          if (r.afterMedia.video.downloadUrl) urlsToArchive.push(r.afterMedia.video.downloadUrl);
          if (r.afterMedia.video.thumbnailUrl) urlsToArchive.push(r.afterMedia.video.thumbnailUrl);
        }
      });
      
      let newUrlsMap: Record<string, string> = {};
      if (urlsToArchive.length > 0) {
        try {
          newUrlsMap = await archiveMedia(urlsToArchive);
        } catch (e) {
          console.error("Failed to bulk archive media:", e);
        }
      }

      repairsToArchive.forEach(r => {
        const updateMedia = (media: MediaData) => ({
          ...media,
          images: media.images.map((url: string) => newUrlsMap[url] || url),
          video: media.video ? {
            originalUrl: newUrlsMap[media.video.originalUrl] || media.video.originalUrl,
            playbackUrl: newUrlsMap[media.video.playbackUrl] || media.video.playbackUrl,
            downloadUrl: newUrlsMap[media.video.downloadUrl] || media.video.downloadUrl,
            thumbnailUrl: media.video.thumbnailUrl ? (newUrlsMap[media.video.thumbnailUrl] || media.video.thumbnailUrl) : null
          } : null
        });
        
        batch.update(doc(db, 'containerRepairs', r.id), {
          beforeMedia: updateMedia(r.beforeMedia),
          afterMedia: updateMedia(r.afterMedia)
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-mark-billed');
    }
  };

  const approveInvoice = async (invoiceId: string) => {
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'Approved',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoiceId}`);
    }
  };
  
  const bulkApproveInvoices = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.update(doc(db, 'invoices', id), {
          status: 'Approved',
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-approve-invoices');
    }
  };

  const unapproveInvoice = async (invoiceId: string) => {
    try {
      await updateDoc(doc(db, 'invoices', invoiceId), {
        status: 'Draft',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoiceId}`);
    }
  };
  
  const bulkUnapproveInvoices = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        batch.update(doc(db, 'invoices', id), {
          status: 'Draft',
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-unapprove-invoices');
    }
  };

  const archiveInvoice = async (invoiceId: string) => {
    try {
      const invoice = state.invoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'invoices', invoiceId), {
        status: 'Archived',
        archivedAt: serverTimestamp()
      });

      invoice.containerIds.forEach(cid => {
        batch.update(doc(db, 'containers', cid), {
          status: 'Archived',
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoiceId}`);
    }
  };
  
  const bulkArchiveInvoices = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      
      ids.forEach(invoiceId => {
        const invoice = state.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        
        batch.update(doc(db, 'invoices', invoiceId), {
          status: 'Archived',
          archivedAt: timestamp
        });
        
        invoice.containerIds.forEach(cid => {
          batch.update(doc(db, 'containers', cid), {
            status: 'Archived',
            updatedAt: timestamp
          });
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-archive-invoices');
    }
  };

  const undoInvoiceBilled = async (invoiceId: string) => {
    try {
      const invoice = state.invoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'invoices', invoiceId), {
        status: 'Approved',
        billedAt: null
      });

      invoice.containerIds.forEach(cid => {
        batch.update(doc(db, 'containers', cid), {
          status: 'Billing',
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoiceId}`);
    }
  };

  const bulkUndoInvoiceBilled = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      
      ids.forEach(invoiceId => {
        const invoice = state.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        
        batch.update(doc(db, 'invoices', invoiceId), {
          status: 'Approved',
          billedAt: null
        });
        
        invoice.containerIds.forEach(cid => {
          batch.update(doc(db, 'containers', cid), {
            status: 'Billing',
            updatedAt: timestamp
          });
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-undo-billed');
    }
  };

  const undoInvoiceArchived = async (invoiceId: string) => {
    try {
      const invoice = state.invoices.find(i => i.id === invoiceId);
      if (!invoice) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'invoices', invoiceId), {
        status: 'Billed',
        archivedAt: null,
        billedAt: serverTimestamp()
      });

      invoice.containerIds.forEach(cid => {
        batch.update(doc(db, 'containers', cid), {
          status: 'Billed',
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `invoices/${invoiceId}`);
    }
  };

  const bulkUndoInvoiceArchived = async (ids: string[]) => {
    try {
      const batch = writeBatch(db);
      const timestamp = serverTimestamp();
      
      ids.forEach(invoiceId => {
        const invoice = state.invoices.find(i => i.id === invoiceId);
        if (!invoice) return;
        
        batch.update(doc(db, 'invoices', invoiceId), {
          status: 'Billed',
          archivedAt: null,
          billedAt: timestamp
        });
        
        invoice.containerIds.forEach(cid => {
          batch.update(doc(db, 'containers', cid), {
            status: 'Billed',
            updatedAt: timestamp
          });
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bulk-undo-archive');
    }
  };

  const updateContainerData = async (id: string, number: string, localReference: string) => {
    try {
      await updateDoc(doc(db, 'containers', id), {
        number,
        localReference: localReference || null,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `containers/${id}`);
      return { success: false, error: 'Failed to update' };
    }
  };

  const startRepair = async (containerId: string) => {
    try {
      const repairData = {
        containerId,
        status: 'active' as const,
        beforeMedia: { video: null, images: [] },
        afterMedia: { video: null, images: [] },
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, 'containerRepairs'), repairData);
      
      // Also update container status to Repairing
      await updateContainerStatus(containerId, 'Repairing');
      
      return { success: true, repairId: docRef.id };
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'containerRepairs');
      return { success: false, error: 'Failed to start repair' };
    }
  };

  const completeRepair = async (repairId: string) => {
    try {
      const repair = state.repairs.find(r => r.id === repairId);
      if (!repair) return;

      await updateDoc(doc(db, 'containerRepairs', repairId), {
        status: 'completed',
        completedAt: serverTimestamp()
      });

      // Update container status to Repaired
      await updateContainerStatus(repair.containerId, 'Repaired');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `containerRepairs/${repairId}`);
    }
  };

  const updateRepairMedia = async (repairId: string, phase: 'before' | 'after', type: 'video' | 'image', data: string | VideoVersion) => {
    try {
      const repair = state.repairs.find(r => r.id === repairId);
      if (!repair) return;

      const mediaKey = phase === 'before' ? 'beforeMedia' : 'afterMedia';
      const currentMedia = repair[mediaKey];

      if (type === 'video') {
        const oldVideo = currentMedia.video;
        const videoData = data as VideoVersion;
        
        await updateDoc(doc(db, 'containerRepairs', repairId), {
          [`${mediaKey}.video`]: videoData
        });
        
        // Delete old video if it's being replaced
        if (oldVideo && oldVideo.originalUrl !== videoData.originalUrl) {
          try {
            await deleteMedia(oldVideo.originalUrl);
          } catch (e) {
            console.error('Failed to delete replaced video from Cloudinary:', e);
          }
        }
      } else {
        // Enforce max 10 images
        const url = data as string;
        if (currentMedia.images.length >= 10) return;
        await updateDoc(doc(db, 'containerRepairs', repairId), {
          [`${mediaKey}.images`]: [...currentMedia.images, url]
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `containerRepairs/${repairId}`);
    }
  };

  const removeRepairMedia = async (repairId: string, phase: 'before' | 'after', type: 'video' | 'image', url?: string) => {
    try {
      const repair = state.repairs.find(r => r.id === repairId);
      if (!repair) return;

      const mediaKey = phase === 'before' ? 'beforeMedia' : 'afterMedia';
      const currentMedia = repair[mediaKey];

      if (type === 'video') {
        await updateDoc(doc(db, 'containerRepairs', repairId), {
          [`${mediaKey}.video`]: null
        });
        if (currentMedia.video) {
          try {
            await deleteMedia(currentMedia.video.originalUrl);
          } catch(e) { console.error('Failed to delete from Cloudinary:', e); }
        }
      } else if (url) {
        await updateDoc(doc(db, 'containerRepairs', repairId), {
          [`${mediaKey}.images`]: currentMedia.images.filter(img => img !== url)
        });
        try {
          await deleteMedia(url);
        } catch(e) { console.error('Failed to delete from Cloudinary:', e); }
      }
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `containerRepairs/${repairId}`);
    }
  };

  // Determine user role (rudimentary check using email pattern)
  const userRole: 'admin' | 'coordinator' = user?.email?.toLowerCase().includes('coordinator') ? 'coordinator' : 'admin';

  const value = {
    state,
    user,
    userRole,
    loading,
    login,
    logout,
    addContainer,
    updateLocalReference,
    updateContainerStatus,
    bulkUpdateContainerStatus,
    deleteContainer,
    bulkDeleteContainers,
    addContainerNote,
    createInvoice,
    addContainersToInvoice,
    removeContainerFromInvoice,
    deleteInvoice,
    createManualInvoice,
    bulkDeleteInvoices,
    markInvoiceBilled,
    bulkMarkInvoicesBilled,
    approveInvoice,
    bulkApproveInvoices,
    unapproveInvoice,
    bulkUnapproveInvoices,
    archiveInvoice,
    bulkArchiveInvoices,
    undoInvoiceBilled,
    undoInvoiceArchived,
    bulkUndoInvoiceBilled,
    bulkUndoInvoiceArchived,
    updateContainerData,
    startRepair,
    completeRepair,
    updateRepairMedia,
    removeRepairMedia
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};
