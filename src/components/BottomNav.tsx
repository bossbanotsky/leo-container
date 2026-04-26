import React from 'react';
import { Archive, LayoutDashboard, Box, FileText, CreditCard, CheckCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

interface BottomNavProps {
  currentTab: string;
  setTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setTab }) => {
  const tabs = [
    { id: 'dashboard', label: 'Monitor', icon: LayoutDashboard },
    { id: 'containers', label: 'Fleet', icon: Box },
    { id: 'billing', label: 'Pending', icon: FileText },
    { id: 'active', label: 'Active', icon: CheckCircle },
    { id: 'billed', label: 'Settled', icon: CreditCard },
    { id: 'archive', label: 'Vault', icon: Archive },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-2 z-50 pointer-events-none">
      <nav className="bg-carbon-900 border-2 border-white/30 rounded-[2.5rem] flex justify-between items-center px-3 py-2 shadow-[0_16px_48px_rgba(0,0,0,0.9)] pointer-events-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id as any)}
              className={cn(
                "relative flex flex-col items-center justify-center py-3 flex-1 transition-all group outline-none",
                isActive ? "text-white scale-110" : "text-slate-300 hover:text-white"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute inset-x-1 inset-y-1 bg-laser-indigo rounded-[1.5rem] border border-white/20 shadow-[0_0_30px_rgba(129,140,248,0.6)]"
                />
              )}
              <Icon size={isActive ? 22 : 20} className={cn("relative z-10 transition-transform group-active:scale-95", isActive && "drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]")} />
              <span className={cn(
                "text-[7px] font-black uppercase tracking-widest mt-1 relative z-10 transition-all",
                isActive ? "opacity-100 scale-110" : "opacity-60 group-hover:opacity-100"
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
