import React from 'react';
import { RefreshCw, Shield } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh: () => void;
  loading: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, onRefresh, loading }) => {
  return (
    <header className="h-20 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">{title}</h2>
        {subtitle ? <p className="text-xs text-slate-500 font-medium">{subtitle}</p> : null}
      </div>

      <div className="flex items-center gap-4">
        {/* Live Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>FastAPI & Bot Online</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50"
          title="Refresh data"
        >
          <RefreshCw size={17} className={loading ? 'animate-spin text-emerald-600' : ''} />
        </button>

        {/* Admin Badge */}
        <div className="h-9 px-3.5 rounded-xl bg-slate-900 text-white flex items-center gap-2 text-xs font-bold">
          <Shield size={14} className="text-emerald-400" />
          <span>ADMINISTRATOR</span>
        </div>
      </div>
    </header>
  );
};
