/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StoreProvider, useStore } from './store/StoreContext';
import { BottomNav } from './components/BottomNav';
import { ContainersPage } from './pages/ContainersPage';
import { BillingPage } from './pages/BillingPage';
import { ApprovedPage } from './pages/ApprovedPage';
import { BilledPage } from './pages/BilledPage';
import { ArchivePage } from './pages/ArchivePage';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading } = useStore();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [containersSubTab, setContainersSubTab] = useState<'Active' | 'Repairing' | 'Repaired'>('Active');

  const navigateToContainers = (subTab: 'Active' | 'Repairing' | 'Repaired') => {
    setContainersSubTab(subTab);
    setCurrentTab('containers');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 size={40} className="text-white animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-carbon-950 font-sans flex justify-center text-slate-100 overflow-hidden relative">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-laser-indigo/10 blur-[140px] rounded-full"></div>
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
        </div>
        <div className="w-full max-w-md relative min-h-screen flex flex-col items-center justify-center px-6">
          <LoginPage />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon-950 font-sans flex justify-center text-slate-100 overflow-hidden relative selection:bg-laser-indigo/30">
      {/* Structural Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-laser-indigo/5 blur-[120px] rounded-full animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/5 blur-[120px] rounded-full"></div>
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
      </div>

      <div className="w-full max-w-md relative min-h-screen flex flex-col z-10">
        <div className="flex-1 overflow-hidden relative">
          {currentTab === 'dashboard' && <DashboardPage onNavigate={navigateToContainers} onNavigateTab={setCurrentTab} />}
          {currentTab === 'containers' && <ContainersPage initialTab={containersSubTab} onTabChange={setContainersSubTab} />}
          {currentTab === 'billing' && <BillingPage />}
          {currentTab === 'active' && <ApprovedPage />}
          {currentTab === 'billed' && <BilledPage />}
          {currentTab === 'archive' && <ArchivePage />}
        </div>
        
        {/* Bottom Navigation */}
        <BottomNav currentTab={currentTab} setTab={setCurrentTab} />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
}
