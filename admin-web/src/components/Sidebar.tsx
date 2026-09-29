import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  ShieldCheck,
  LogOut,
  Sliders,
} from 'lucide-react';

export type AdminTab = 'dashboard' | 'venues' | 'users' | 'transactions';

interface SidebarProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const menuItems = [
    { id: 'dashboard' as AdminTab, label: 'Boshqaruv & Tahlil', icon: LayoutDashboard },
    { id: 'venues' as AdminTab, label: 'Stadionlar & Maydonlar', icon: Building2 },
    { id: 'users' as AdminTab, label: 'Foydalanuvchilar & Rollar', icon: Users },
    { id: 'transactions' as AdminTab, label: 'Moliya & To‘lovlar', icon: CreditCard },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 min-h-screen border-r border-slate-800">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-400 to-cyan-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              S+
            </div>
            <div>
              <h1 className="text-white font-extrabold text-lg tracking-tight leading-none">SPORT+</h1>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-widest">Admin Boshqaruv</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">v1.2</span>
        </div>

        {/* Navigation Items */}
        <div className="px-3 py-6 space-y-1.5">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Asosiy Bo'limlar
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white truncate">Bosh Administrator</p>
            <p className="text-[11px] text-slate-400 truncate">Super Admin huquqi</p>
          </div>
          <ShieldCheck size={16} className="text-emerald-400" />
        </div>
      </div>
    </aside>
  );
};
