import React, { useState, useEffect } from 'react';

export interface AdminUser {
  id: string;
  full_name: string;
  phone_number: string;
  role: 'player' | 'owner' | 'admin';
  rating: number;
  total_games: number;
  is_active: boolean;
  venues_count: number;
  bookings_count: number;
}

export const UsersTab: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedRole, selectedStatus]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `/api/v1/admin/users?page=1&page_size=50`;
      if (search.trim()) url += `&query=${encodeURIComponent(search.trim())}`;
      if (selectedRole) url += `&role=${encodeURIComponent(selectedRole)}`;
      if (selectedStatus !== '') url += `&is_active=${selectedStatus}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.items || []);
      }
    } catch (err) {
      console.error('Foydalanuvchilarni yuklashda xatolik:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error('Rolni o\'zgartirishda xatolik:', err);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sarlavha (Ortiqcha texnik tushuntirishlarsiz) */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight text-slate-900">Foydalanuvchilar</h2>
      </div>

      {/* Qidiruv va Filterlar paneli */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white/70 backdrop-blur-md border border-slate-200/80 shadow-sm">
        <div className="relative flex-1 min-w-[280px] max-w-md">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Qidirish..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">Barcha Rollar</option>
            <option value="player">O'yinchi</option>
            <option value="owner">Maydon Egasi</option>
            <option value="admin">Administrator</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="">Barcha Holatlar</option>
            <option value="true">Faqat Faollar</option>
            <option value="false">Bloklanganlar</option>
          </select>
        </div>
      </div>

      {/* Foydalanuvchilar Jadvali */}
      <div className="overflow-hidden rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200/80 shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-medium">Yuklanmoqda...</div>
        ) : users.length === 0 ? (
          /* Bo'sh holat (Empty State) */
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.6" className="mb-3">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p className="text-slate-500 font-semibold">Hozircha ro'yxatdan o'tgan foydalanuvchilar yo'q</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <th className="py-4 px-6">Foydalanuvchi</th>
                <th className="py-4 px-6">Rol</th>
                <th className="py-4 px-6">O'yinlar</th>
                <th className="py-4 px-6">Reyting</th>
                <th className="py-4 px-6">Faollik</th>
                <th className="py-4 px-6">Holati</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-sm">
                        {u.full_name ? u.full_name.slice(0, 2).toUpperCase() : 'SP'}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{u.full_name}</div>
                        <div className="text-xs text-slate-400">{u.phone_number || 'Telegram orqali'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white cursor-pointer"
                    >
                      <option value="player">O'yinchi</option>
                      <option value="owner">Maydon Egasi</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-bold text-slate-900">{u.total_games || 0} ta</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-amber-500 font-bold">★ {u.rating || 5.0}</span>
                  </td>
                  <td className="py-4 px-6">
                    {u.role === 'owner' ? `${u.venues_count || 0} ta maydon` : `${u.bookings_count || 0} ta bron`}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {u.is_active ? 'Faol' : 'Bloklangan'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
