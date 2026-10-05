import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { AdminTransaction } from '../services/adminApi';

interface TransactionsViewProps {
  transactions: AdminTransaction[];
  onRefresh: () => void;
}

export const TransactionsView: React.FC<TransactionsViewProps> = ({ transactions }) => {
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'UNPAID' | 'REFUNDED'>('ALL');

  const safeTx = Array.isArray(transactions) ? transactions : [];

  const filtered = safeTx.filter((t) => {
    if (statusFilter === 'ALL') return true;
    const st = String(t.payment_status || '').toUpperCase();
    return st === statusFilter;
  });

  const totalFeeCollected = safeTx
    .filter((t) => String(t.payment_status || '').toUpperCase() === 'PAID')
    .reduce((acc, curr) => acc + (Number(curr.service_fee) || 10000), 0);

  const paidCount = safeTx.filter(
    (t) => String(t.payment_status || '').toUpperCase() === 'PAID'
  ).length;

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Total Revenue</span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {totalFeeCollected.toLocaleString()} <span className="text-xs text-slate-400 font-bold">UZS</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Successful Payments</span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {paidCount}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <span className="text-xs font-bold text-slate-400 uppercase">Payment Providers</span>
          <div className="flex items-center gap-3 mt-2">
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-extrabold text-xs">Click</span>
            <span className="px-2.5 py-1 rounded-md bg-cyan-50 text-cyan-700 font-extrabold text-xs">Payme</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        {(['ALL', 'PAID', 'UNPAID', 'REFUNDED'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              statusFilter === st
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {st === 'ALL' && 'All Payments'}
            {st === 'PAID' && 'Paid'}
            {st === 'UNPAID' && 'Pending'}
            {st === 'REFUNDED' && 'Refunded'}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <CreditCard size={28} />
            </div>
            <h4 className="text-base font-extrabold text-slate-800">No transaction history</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">ID & BOOKING</th>
                  <th className="py-3.5 px-6">CUSTOMER</th>
                  <th className="py-3.5 px-6">VENUE</th>
                  <th className="py-3.5 px-6">PLATFORM FEE</th>
                  <th className="py-3.5 px-6">GATEWAY</th>
                  <th className="py-3.5 px-6 text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((t) => {
                  const st = String(t.payment_status || '').toUpperCase();
                  const isPaid = st === 'PAID';
                  const isRefunded = st === 'REFUNDED';

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* ID */}
                      <td className="py-4 px-6 font-mono text-[11px] text-slate-500">
                        <span className="font-bold text-slate-800">#{t.id}</span>
                        <p className="text-[10px] text-slate-400">{t.booking_id ? `Booking: ${t.booking_id}` : ''}</p>
                      </td>

                      {/* User */}
                      <td className="py-4 px-6">
                        <p className="font-extrabold text-slate-900">{t.user_name || 'Unknown'}</p>
                        <p className="text-[11px] text-slate-400">{t.user_phone || '+998...'}</p>
                      </td>

                      {/* Venue */}
                      <td className="py-4 px-6 font-semibold text-slate-800">
                        {t.venue_name || 'Unknown Venue'}
                      </td>

                      {/* Service Fee */}
                      <td className="py-4 px-6">
                        <span className="font-black text-emerald-600 text-sm">
                          +{(Number(t.service_fee) || 10000).toLocaleString()} UZS
                        </span>
                        <p className="text-[10px] text-slate-400">
                          Total: {t.amount ? Number(t.amount).toLocaleString() : 0} UZS
                        </p>
                      </td>

                      {/* Payment Provider */}
                      <td className="py-4 px-6">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                          {t.payment_provider || 'Click'}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6 text-right">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700'
                              : isRefunded
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isPaid ? (
                            <CheckCircle2 size={13} className="text-emerald-500" />
                          ) : isRefunded ? (
                            <RotateCcw size={13} className="text-rose-500" />
                          ) : (
                            <Clock size={13} className="text-amber-500" />
                          )}
                          <span>{t.payment_status}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
