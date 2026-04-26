import React from 'react';
import { cn } from '../lib/utils';
import { ContainerType } from '../types';

export const TypeBadge: React.FC<{ type: ContainerType; className?: string }> = ({ type, className }) => {
  return (
    <span
      className={cn(
        "inline-block px-3 py-1 text-[8px] font-bold rounded-lg uppercase tracking-[0.2em] border",
        type === 'Local' 
          ? "bg-sky-500/10 text-sky-400 border-sky-500/20" 
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        className
      )}
    >
      {type}
    </span>
  );
};
