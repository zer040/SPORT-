import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Users,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Percent,
  Smartphone,
} from 'lucide-react';
import { AdminApi, DashboardStats, LiveMetrics } from '../services/adminApi';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, loading: _parentLoading }) => {
  const [live, setLive] = useState<LiveMetrics>({
    online_users_now: 0,
    app_installations: {
      total: 0,
      android: 0,
      ios: 0,
    },
    users: {
      total_registered: 0,
    },
    venues: {
      total_active: 0,
    },
    financials: {
      platform_revenue_uzs: 0.0,
    },
    bookings: {
      currently_held: 0,
      total_confirmed: 0,
    },
  });

  const fetchLiveMetrics = async () => {
    try {
      const data = await AdminApi.getLiveMetrics();
      setLive(data);
    } catch {
      // Keep previous or default 0s
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    // Real-vaqtda har 5 soniyada Redis va DB metrikalarini avtomatik yangilash
    const interval = setInterval(fetchLiveMetrics, 5000);
    return () => clearInterval(interval);
  }, []);

  const s = stats || {
    total_users: live.users.total_registered,
    total_venues: live.venues.total_active,
    active_venues: live.venues.total_active,
    total_bookings: live.bookings.currently_held + live.bookings.total_confirmed,
    confirmed_bookings: live.bookings.total_confirmed,
    total_platform_revenue_uzs: live.financials.platform_revenue_uzs,
    occupancy_rate: 0.0,
    total_matches: 0,
  };

  const revenueDisplay =
    live.financials.platform_revenue_uzs > 0
      ? live.financials.platform_revenue_uzs.toLocaleString() + ' UZS'
      : '0.00 UZS';

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Monetization Highlight Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 border border-slate-700/80 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="z-10">
          <h3 className="text-xl font-extrabold tracking-tight">Service Fee: 10,000 UZS / slot</h3>
        </div>
        <div className="bg-slate-950/70 border border-slate-700 rounded-xl px-5 py-3 shrink-0 text-right z-10">
          <div className="text-xs text-slate-400 font-semibold mb-0.5">Total Revenue</div>
          <p className="text-2xl font-black text-emerald-400">{revenueDisplay}</p>
        </div>
      </div>

      {/* 4 PRIMARY REAL-TIME KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KARTA 1: Online */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Online
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE</span>
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight">
            {live.online_users_now}
          </div>
        </div>

        {/* KARTA 2: Installs */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Installs
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-slate-900 tracking-tight">
              {live.app_installations.total}
            </div>
            <div className="text-xs text-slate-500 font-medium">
              Android: {live.app_installations.android} • iOS: {live.app_installations.ios}
            </div>
          </div>
        </div>

        {/* KARTA 3: Platform Revenue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Platform Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight truncate">
            {revenueDisplay}
          </div>
        </div>

        {/* KARTA 4: Active Bookings */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Bookings
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {live.bookings.currently_held + live.bookings.total_confirmed}
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: USERS, VENUES, OCCUPANCY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Users</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">
              {live.users.total_registered > 0 ? live.users.total_registered : s.total_users}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Venues</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{live.venues.total_active}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Percent size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Occupancy</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{s.occupancy_rate}%</p>
          </div>
        </div>
      </div>

      {/* DETAIL BREAKDOWN SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Dynamics */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-extrabold text-slate-900">Revenue Dynamics</h4>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Total Service Revenue
              </span>
              <p className="text-xl font-extrabold text-slate-900 mt-1 truncate">
                {live.financials.platform_revenue_uzs.toLocaleString()}{' '}
                <span className="text-xs text-slate-400 font-medium">UZS</span>
              </p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: live.financials.platform_revenue_uzs > 0 ? '100%' : '0%' }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase">Confirmed Bookings</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {live.bookings.total_confirmed}
              </p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width:
                      live.bookings.total_confirmed > 0
                        ? `${Math.min(100, live.bookings.total_confirmed * 10)}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase">
                Held (Pending Payment)
              </span>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                {live.bookings.currently_held}
              </p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width:
                      live.bookings.currently_held > 0
                        ? `${Math.min(100, live.bookings.currently_held * 20)}%`
                        : '0%',
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <h4 className="text-base font-extrabold text-slate-900">Bookings Distribution</h4>

          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <p className="text-xs font-bold text-slate-900">Confirmed bookings</p>
              </div>
              <span className="text-base font-black text-emerald-700">
                {live.bookings.total_confirmed}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
              <div className="flex items-center gap-3">
                <CalendarCheck size={18} className="text-amber-600" />
                <p className="text-xs font-bold text-slate-900">Pending bookings</p>
              </div>
              <span className="text-base font-black text-amber-700">
                {live.bookings.currently_held}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-blue-600" />
                <p className="text-xs font-bold text-slate-900">Unique devices</p>
              </div>
              <span className="text-base font-black text-blue-700">
                {live.app_installations.total}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
