import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  TrendingUp,
  Users,
  Building2,
  CalendarCheck,
  CheckCircle2,
  AlertCircle,
  Percent,
  Sparkles,
  Smartphone,
  Radio,
  Clock,
  Activity,
} from 'lucide-react';
import { AdminApi, DashboardStats, LiveMetrics } from '../services/adminApi';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats, loading: parentLoading }) => {
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

  const [lastUpdated, setLastUpdated] = useState<string>('Hozir');
  const [liveLoading, setLiveLoading] = useState(false);

  const fetchLiveMetrics = async () => {
    try {
      const data = await AdminApi.getLiveMetrics();
      setLive(data);
      const now = new Date();
      setLastUpdated(
        `${now.getHours().toString().padStart(2, '0')}:${now
          .getMinutes()
          .toString()
          .padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );
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
        <div className="space-y-1.5 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
            <Sparkles size={13} />
            <span>Monetizatsiya & Real-Vaqt Tizimi</span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">
            Har bir bron qilingan slotdan 10,000 UZS qatʼiy platforma xizmat haqi
          </h3>
          <p className="text-slate-400 text-sm max-w-2xl">
            Hech qanday yasama raqamlarsiz: barcha statistika PostgreSQL va Redis xotirasidagi real vaqt
            hodisalariga 100% bog'langan.
          </p>
        </div>
        <div className="bg-slate-950/70 border border-slate-700 rounded-xl p-4 shrink-0 text-right z-10">
          <div className="flex items-center justify-end gap-1.5 mb-1 text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Real Tushum (10,000 UZS)</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{revenueDisplay}</p>
          <p className="text-[11px] text-slate-400 mt-1">So'nggi yangilanish: {lastUpdated}</p>
        </div>
      </div>

      {/* 4 PRIMARY REAL-TIME KPI CARDS (TALAB QILINGAN KARTALAR) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KARTA 1: Yashil Pulsatsion "Online Now" Kartasi */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ayni Damda Online
            </span>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>LIVE</span>
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
              <span>{live.online_users_now}</span>
              <span className="text-sm font-semibold text-slate-500">user</span>
            </div>
            <p className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <Radio size={12} className="text-emerald-500 animate-pulse" />
              <span>Oxirgi 120s da faol ping yuborganlar</span>
            </p>
          </div>
        </div>

        {/* KARTA 2: "App Installs" (Qurilmalar va Yuklab Olishlar) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              App Installs
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Smartphone size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
              <span>{live.app_installations.total}</span>
              <span className="text-sm font-semibold text-slate-500">ta qurilma</span>
            </div>
            <div className="text-xs text-slate-500 font-semibold flex items-center gap-3 pt-0.5">
              <span className="inline-flex items-center gap-1 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Android: <strong className="text-slate-900">{live.app_installations.android}</strong>
              </span>
              <span className="inline-flex items-center gap-1 text-slate-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                iOS: <strong className="text-slate-900">{live.app_installations.ios}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* KARTA 3: "Platform Revenue (10,000 UZS Servis To'lovi)" */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Platform Revenue
            </span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight truncate">
              {revenueDisplay}
            </div>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <TrendingUp size={13} />
              <span>Har to‘lovdan 10,000 UZS aniq tushum</span>
            </p>
          </div>
        </div>

        {/* KARTA 4: "Jonli Bronlar (Held vs Confirmed)" */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between pb-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Jonli Bronlar
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarCheck size={20} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight flex items-baseline gap-2">
              <span className="text-amber-600">{live.bookings.currently_held}</span>
              <span className="text-xs text-slate-400 font-bold uppercase">held</span>
              <span className="text-slate-300">/</span>
              <span className="text-emerald-600">{live.bookings.total_confirmed}</span>
              <span className="text-xs text-slate-400 font-bold uppercase">ok</span>
            </div>
            <p className="text-xs text-amber-700 font-medium">
              {live.bookings.currently_held} ta o‘yin 10 daqiqalik lockda
            </p>
          </div>
        </div>
      </div>

      {/* SECONDARY ROW: REGISTRATION, VENUES, OCCUPANCY, MATCHES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ro'yxatdan O'tganlar</p>
            <p className="text-xl font-black text-slate-900">
              {live.users.total_registered > 0 ? live.users.total_registered : s.total_users}{' '}
              <span className="text-xs font-semibold text-slate-500">foydalanuvchi</span>
            </p>
            <p className="text-[11px] text-slate-500">Telegram orqali ro'yxatdan o'tgan haqiqiy hisoblar</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Building2 size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Faol Stadionlar</p>
            <p className="text-xl font-black text-slate-900">
              {live.venues.total_active}{' '}
              <span className="text-xs font-semibold text-slate-500">ta sport majmuasi</span>
            </p>
            <p className="text-[11px] text-slate-500">PostGIS geolokatsiyasi va maydonlari biriktirilgan</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
            <Percent size={22} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">O'rtacha Bandlik</p>
            <p className="text-xl font-black text-slate-900">
              {s.occupancy_rate}%
            </p>
            <p className="text-[11px] text-slate-500">Maydonlarning tasdiqlangan o'yinlar bilan to'lish ulushi</p>
          </div>
        </div>
      </div>

      {/* DETAIL BREAKDOWN SECTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tushum davrlari & Monetizatsiya kafolati */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-base font-extrabold text-slate-900">Platforma Tushumi Dinamikasi</h4>
              <p className="text-xs text-slate-500">10,000 UZS kafolatli to'lovlar kesimida</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <Activity size={13} className="text-emerald-600" />
              <span>Jonli Rekonsiliatsiya</span>
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase">Jami Servis Tushumi</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1 truncate">
                {live.financials.platform_revenue_uzs.toLocaleString()} <span className="text-xs text-slate-400 font-medium">UZS</span>
              </p>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: live.financials.platform_revenue_uzs > 0 ? '100%' : '0%' }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase">Tasdiqlangan Bronlar</span>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {live.bookings.total_confirmed} <span className="text-xs text-slate-400 font-medium">ta</span>
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
              <span className="text-xs font-bold text-slate-400 uppercase">HELD (To'lov Kutilmoqda)</span>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                {live.bookings.currently_held} <span className="text-xs text-slate-400 font-medium">ta</span>
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

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
            <span>Click va Payme integratsiyasi orqali har bir slot uchun 10,000 UZS avtomatik yoziladi.</span>
            <span className="font-bold text-slate-900">Redis Presense: Faol</span>
          </div>
        </div>

        {/* Bronlar va Statuslar Taqsimoti */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <h4 className="text-base font-extrabold text-slate-900">Bronlar Taqsimoti</h4>
          <p className="text-xs text-slate-500 -mt-3">Real-vaqt holati bo'yicha</p>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Tasdiqlangan Bronlar</p>
                  <p className="text-[11px] text-slate-500">Muvaffaqiyatli to'langan (CONFIRMED)</p>
                </div>
              </div>
              <span className="text-base font-black text-emerald-700">{live.bookings.total_confirmed}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50/60 border border-amber-100">
              <div className="flex items-center gap-3">
                <CalendarCheck size={18} className="text-amber-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">HELD (To'lov Kutayotgan)</p>
                  <p className="text-[11px] text-slate-500">10 daqiqalik qulf holatida</p>
                </div>
              </div>
              <span className="text-base font-black text-amber-700">{live.bookings.currently_held}</span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/60 border border-blue-100">
              <div className="flex items-center gap-3">
                <Smartphone size={18} className="text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-900">Unikal Qurilmalar</p>
                  <p className="text-[11px] text-slate-500">Ilovani o'rnatganlar</p>
                </div>
              </div>
              <span className="text-base font-black text-blue-700">{live.app_installations.total}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">Solo Play Lobbylar:</span>
            <span className="font-bold text-slate-900">{s.total_matches} ta faol match</span>
          </div>
        </div>
      </div>
    </div>
  );
};
