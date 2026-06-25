import React from 'react';
import { ArrowLeft } from 'lucide-react';

const ActivityHeader = ({ helperText, onBack }) => {
  return (
    <header className="border-b border-slate-800 bg-[#0c1527] text-white">
      <div className="flex items-start gap-3 px-5 pb-4 pt-4">
          <button type="button" onClick={onBack} className="rounded-full p-2 -ml-2 transition-all active:scale-95 text-white">
            <ArrowLeft size={22} className="text-white" strokeWidth={2.6} />
          </button>
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-300">My bookings</p>
            <h1 className="mt-1 truncate text-[20px] font-black leading-none tracking-tight text-white">
              Recent activity
            </h1>
            <p className="mt-1.5 text-[12px] text-slate-300 font-bold leading-normal">{helperText}</p>
          </div>
      </div>
    </header>
  );
};

export default ActivityHeader;
