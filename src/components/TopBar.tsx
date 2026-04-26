import React from 'react';

export const TopBar: React.FC<{ title: string; rightAction?: React.ReactNode }> = ({ title, rightAction }) => {
  return (
    <div className="sticky top-0 z-40 bg-carbon-900/60 backdrop-blur-xl border-b border-white/5 px-6 h-20 flex items-center justify-between shadow-2xl max-w-md mx-auto w-full">
      <div className="flex flex-col">
        <h1 className="text-lg font-display font-medium tracking-tight text-white uppercase">{title}</h1>
        <div className="w-8 h-[2px] bg-laser-indigo mt-0.5"></div>
      </div>
      {rightAction && <div>{rightAction}</div>}
    </div>
  );
};
