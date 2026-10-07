import React, { useState } from 'react';
import { Users, Search, Ban, CheckCircle, Phone, Send, Star, RefreshCw } from 'lucide-react';
import { AdminApi, AdminUser } from '../services/adminApi';

interface UsersViewProps {
  users: AdminUser[];
  onRefresh: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'player' | 'owner' | 'admin'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotice = (type: 'success' | 'error', message: string) => {
    setActionNotice({ type, message });
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const ok = await AdminApi.updateUserRole(userId, newRole);
      if (ok) {
        showNotice('success', `User role successfully updated to "${newRole}".`);
        onRefresh();
      } else {
        showNotice('error', 'Server error updating user role.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating user role.';
      showNotice('error', message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    try {
      const nextStatus = !currentStatus;
      const ok = await AdminApi.updateUserStatus(userId, nextStatus);
      if (ok) {
        showNotice('success', nextStatus ? 'User successfully activated.' : 'User blocked.');
        onRefresh();
      } else {
        showNotice('error', 'Server error updating user status.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error updating user status.';
      showNotice('error', message);
    } finally {
      setUpdatingId(null);
    }
  };

  const safeUsers = Array.isArray(users) ? users : [];

  const filteredUsers = safeUsers.filter((u) => {
    const name = (u.full_name || '').toLowerCase();
    const phone = (u.phone_number || '').toLowerCase();
    const tgId = u.telegram_id ? String(u.telegram_id) : '';
    const q = searchTerm.trim().toLowerCase();

    const matchesSearch = !q || name.includes(q) || phone.includes(q) || tgId.includes(q);

    const uRole = String(u.role || 'player').toLowerCase();
    const matchesRole =
      roleFilter === 'ALL'
        ? true
        : roleFilter === 'player'
          ? uRole === 'player' || uRole === 'user'
          : uRole === roleFilter;

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
          ? u.is_active === true
          : u.is_active === false;

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
              : 'bg-rose-50 text-rose-800 border-rose-200 shadow-sm'
          }`}
        >
          <span>{actionNotice.message}</span>
          <button
            onClick={() => setActionNotice(null)}
            className="opacity-70 hover:opacity-100 font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* Search Input */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search (name, phone, telegram)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all shadow-sm"
          />
        </div>
      </div>

      {/* Role & Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        {/* Role Filters */}
        <div className="flex items-center gap-1.5">
          {(
            [
              { id: 'ALL', label: 'All' },
              { id: 'player', label: 'Players' },
              { id: 'owner', label: 'Venue Owners' },
              { id: 'admin', label: 'Admins' },
            ] as const
          ).map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                roleFilter === r.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {(
            [
              { id: 'ALL', label: 'All Status' },
              { id: 'ACTIVE', label: 'Active' },
              { id: 'BLOCKED', label: 'Blocked' },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === s.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Users size={28} />
            </div>
            <h4 className="text-base font-extrabold text-slate-800">No users found</h4>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">USER</th>
                  <th className="py-3.5 px-6">PHONE / TELEGRAM</th>
                  <th className="py-3.5 px-6">ROLE</th>
                  <th className="py-3.5 px-6">STATUS</th>
                  <th className="py-3.5 px-6">RATING</th>
                  <th className="py-3.5 px-6 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => {
                  const isUpdating = updatingId === u.id;
                  const normalizedRole = String(u.role || 'player').toLowerCase();
                  const roleBadgeColor =
                    normalizedRole === 'admin'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : normalizedRole === 'owner'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  const initials = (u.full_name || 'U').charAt(0).toUpperCase();

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* User Info */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-900 text-emerald-400 font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm leading-tight">
                              {u.full_name}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {normalizedRole === 'owner'
                                ? `${u.venues_count || 0} venues`
                                : `${u.total_games || 0} matches`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Telegram & Phone */}
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                            <Send size={12} className="text-sky-500 shrink-0" />
                            <span>
                              {u.telegram_id ? `TG ID: ${u.telegram_id}` : 'No Telegram linked'}
                            </span>
                          </p>
                          <p className="text-slate-400 flex items-center gap-1.5">
                            <Phone size={11} className="shrink-0" />
                            <span>{u.phone_number || 'No phone number'}</span>
                          </p>
                        </div>
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-4 px-6">
                        <select
                          disabled={isUpdating}
                          value={normalizedRole === 'user' ? 'player' : normalizedRole}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${roleBadgeColor} disabled:opacity-50`}
                        >
                          <option value="player">Player</option>
                          <option value="owner">Venue Owner</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            u.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          />
                          {u.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>

                      {/* Rating / Karma */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <Star size={13} className="text-amber-400 fill-amber-400" />
                          <span>{(typeof u.rating === 'number' ? u.rating : 5.0).toFixed(1)}</span>
                        </div>
                      </td>

                      {/* Action: Ban / Unban */}
                      <td className="py-4 px-6 text-right">
                        <button
                          disabled={isUpdating}
                          onClick={() => handleStatusToggle(u.id, u.is_active)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                            u.is_active
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/60'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200/60'
                          }`}
                        >
                          {isUpdating ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : u.is_active ? (
                            <>
                              <Ban size={13} />
                              <span>Block</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle size={13} />
                              <span>Activate</span>
                            </>
                          )}
                        </button>
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
