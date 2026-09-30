import React, { useState } from 'react';
import {
  Users,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Ban,
  CheckCircle,
  Phone,
  Send,
  Star,
} from 'lucide-react';
import { AdminApi, AdminUser } from '../services/adminApi';

interface UsersViewProps {
  users: AdminUser[];
  onRefresh: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'USER' | 'OWNER' | 'ADMIN'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      await AdminApi.updateUserRole(userId, newRole);
      onRefresh();
    } catch {
      alert('Rolni o\'zgartirishda xatolik yuz berdi');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    try {
      await AdminApi.updateUserStatus(userId, !currentStatus);
      onRefresh();
    } catch {
      alert('Holatni o\'zgartirishda xatolik yuz berdi');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone_number && u.phone_number.includes(searchTerm)) ||
      (u.telegram_id && u.telegram_id.toString().includes(searchTerm));

    const matchesRole =
      roleFilter === 'ALL' ? true : u.role.toUpperCase() === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Foydalanuvchilar va Rollar Boshqaruvi</h3>
          <p className="text-xs text-slate-500 font-medium">
            Telegram ID, ishonchlilik reytingi va RBAC rollari nazorati
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ism, telefon yoki Telegram ID..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3">
        {(['ALL', 'USER', 'OWNER', 'ADMIN'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              roleFilter === r
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {r === 'ALL' && 'Barchasi'}
            {r === 'USER' && 'O‘yinchilar (USER)'}
            {r === 'OWNER' && 'Maydon Egalari (OWNER)'}
            {r === 'ADMIN' && 'Adminlar (ADMIN)'}
          </button>
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Foydalanuvchi</th>
                <th className="py-3.5 px-6">Telegram ID & Telefon</th>
                <th className="py-3.5 px-6">Roli (RBAC)</th>
                <th className="py-3.5 px-6">Holat</th>
                <th className="py-3.5 px-6">Karma / Reyting</th>
                <th className="py-3.5 px-6 text-right">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isUpdating = updatingId === u.id;
                const roleBadgeColor =
                  u.role.toUpperCase() === 'ADMIN'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : u.role.toUpperCase() === 'OWNER'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs shrink-0 border border-slate-200">
                          {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-sm">{u.full_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : 'Profil to‘liq'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Telegram & Phone */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-700 flex items-center gap-1.5">
                          <Send size={12} className="text-sky-500" />
                          <span>TG: {u.telegram_id || 'Ulanmagan'}</span>
                        </p>
                        <p className="text-slate-400 flex items-center gap-1.5">
                          <Phone size={11} />
                          <span>{u.phone_number || '+998...'}</span>
                        </p>
                      </div>
                    </td>

                    {/* Role Dropdown */}
                    <td className="py-4 px-6">
                      <select
                        disabled={isUpdating}
                        value={u.role.toUpperCase()}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${roleBadgeColor}`}
                      >
                        <option value="USER">USER (O'yinchi)</option>
                        <option value="OWNER">OWNER (Maydon Egasi)</option>
                        <option value="ADMIN">ADMIN (Boshqaruvchi)</option>
                      </select>
                    </td>

                    {/* Status Badge */}
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          u.is_active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {u.is_active ? 'Faol' : 'Bloklangan'}
                      </span>
                    </td>

                    {/* Rating / Karma */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 font-bold text-slate-800">
                        <Star size={13} className="text-amber-400 fill-amber-400" />
                        <span>{u.rating.toFixed(1)}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({u.total_games} o'yin)</span>
                      </div>
                    </td>

                    {/* Action: Ban / Unban */}
                    <td className="py-4 px-6 text-right">
                      <button
                        disabled={isUpdating}
                        onClick={() => handleStatusToggle(u.id, u.is_active)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs inline-flex items-center gap-1.5 transition-colors ${
                          u.is_active
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                      >
                        {u.is_active ? (
                          <>
                            <Ban size={13} />
                            <span>Bloklash</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={13} />
                            <span>Faollashtirish</span>
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
      </div>
    </div>
  );
};
