export type ContainerType = 'Local' | 'Foreign';
export type ContainerStatus = 'Active' | 'Repairing' | 'Repaired' | 'Billing' | 'Billed' | 'Archived';

export interface ContainerHistory {
  status: ContainerStatus;
  timestamp: number;
}

export interface Note {
  id: string;
  text: string;
  authorId: string;
  authorEmail: string;
  timestamp: number;
}

export interface Container {
  id: string;
  number: string;
  type: ContainerType;
  localReference?: string;
  status: ContainerStatus;
  createdAt: number;
  updatedAt: number;
  history?: ContainerHistory[];
  notes?: Note[];
}

export type InvoiceStatus = 'Draft' | 'Approved' | 'Billed' | 'Archived';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  containerIds: string[];
  status: InvoiceStatus;
  createdAt: number;
  billedAt?: number;
  archivedAt?: number;
}

export interface MediaData {
  video: string | null;
  videoThumbnail?: string | null;
  images: string[];
}

export interface ContainerRepair {
  id: string;
  containerId: string;
  status: 'active' | 'completed';
  beforeMedia: MediaData;
  afterMedia: MediaData;
  createdAt: number;
  completedAt?: number;
}

export interface AppState {
  containers: Container[];
  invoices: Invoice[];
  repairs: ContainerRepair[];
}
