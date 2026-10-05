/**
 * Admin API Client — Sport+ Backend integratsiyasi.
 * Barcha so'rovlar xatosiz va to'liq himoyalangan formatda qaytariladi.
 */

const API_BASE = 'http://localhost:8000/api/v1/admin';

// Admin demo/session token (ADMIN roli bilan)
let adminToken = localStorage.getItem('sportplus_admin_token') || 'admin-sportplus-super-token';

export const setAdminToken = (token: string) => {
  adminToken = token;
  localStorage.setItem('sportplus_admin_token', token);
};

export const getAdminToken = () => adminToken;

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${adminToken}`,
});

export interface LiveMetrics {
  online_users_now: number;
  app_installations: {
    total: number;
    android: number;
    ios: number;
  };
  users: {
    total_registered: number;
  };
  venues: {
    total_active: number;
  };
  financials: {
    platform_revenue_uzs: number;
  };
  bookings: {
    currently_held: number;
    total_confirmed: number;
  };
}

export interface DashboardStats {
  total_users: number;
  total_venues: number;
  active_venues: number;
  total_bookings: number;
  confirmed_bookings: number;
  total_platform_revenue_uzs: number;
  occupancy_rate: number;
  total_matches: number;
}

export interface AdminUser {
  id: string;
  telegram_id?: number | null;
  full_name: string;
  first_name?: string | null;
  last_name?: string | null;
  phone_number?: string | null;
  role: 'player' | 'owner' | 'admin' | string;
  is_active: boolean;
  rating: number;
  total_games: number;
  venues_count?: number;
  bookings_count?: number;
  created_at?: string | null;
}

export interface AdminVenue {
  id: string;
  name: string;
  address: string;
  city: string;
  district?: string;
  lat?: number;
  lng?: number;
  owner_id?: string;
  owner_name?: string;
  owner_phone?: string;
  is_active: boolean;
  pitches_count: number;
  primary_image_url?: string;
  images: string[];
  created_at?: string;
}

export interface AdminTransaction {
  id: string;
  booking_id: string;
  user_name: string;
  user_phone?: string;
  venue_name: string;
  amount: number;
  service_fee: number;
  payment_status: 'PAID' | 'UNPAID' | 'REFUNDED' | string;
  payment_provider?: string;
  created_at?: string;
}

export const AdminApi = {
  async getLiveMetrics(): Promise<LiveMetrics> {
    try {
      const res = await fetch(`${API_BASE}/analytics/live-metrics`, { credentials: 'omit', headers: getHeaders() });
      if (!res.ok) throw new Error('Live metrics fetch failed');
      const data = await res.json();
      return {
        online_users_now: data.online_users_now ?? 0,
        app_installations: {
          total: data.app_installations?.total ?? 0,
          android: data.app_installations?.android ?? 0,
          ios: data.app_installations?.ios ?? 0,
        },
        users: {
          total_registered: data.users?.total_registered ?? 0,
        },
        venues: {
          total_active: data.venues?.total_active ?? 0,
        },
        financials: {
          platform_revenue_uzs: Number(data.financials?.platform_revenue_uzs ?? 0),
        },
        bookings: {
          currently_held: data.bookings?.currently_held ?? 0,
          total_confirmed: data.bookings?.total_confirmed ?? 0,
        },
      };
    } catch {
      return {
        online_users_now: 0,
        app_installations: { total: 0, android: 0, ios: 0 },
        users: { total_registered: 0 },
        venues: { total_active: 0 },
        financials: { platform_revenue_uzs: 0.0 },
        bookings: { currently_held: 0, total_confirmed: 0 },
      };
    }
  },

  async getStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/dashboard-stats`, { credentials: 'omit', headers: getHeaders() });
      if (!res.ok) throw new Error('Stats fetch failed');
      const data = await res.json();
      return {
        total_users: data.total_users ?? 0,
        total_venues: data.total_venues ?? 0,
        active_venues: data.active_venues ?? 0,
        total_bookings: data.total_bookings ?? 0,
        confirmed_bookings: data.confirmed_bookings ?? 0,
        total_platform_revenue_uzs: Number(data.total_platform_revenue_uzs ?? 0),
        occupancy_rate: Number(data.occupancy_rate ?? 0),
        total_matches: data.total_matches ?? 0,
      };
    } catch {
      return {
        total_users: 0,
        total_venues: 0,
        active_venues: 0,
        total_bookings: 0,
        confirmed_bookings: 0,
        total_platform_revenue_uzs: 0.0,
        occupancy_rate: 0.0,
        total_matches: 0,
      };
    }
  },

  async getUsers(q?: string, role?: string): Promise<AdminUser[]> {
    try {
      const params = new URLSearchParams();
      // Backend 'query' parametrini kutadi (q emas)
      if (q && q.trim()) params.append('query', q.trim());
      if (role && role !== 'ALL') {
        const rNorm = role.toLowerCase() === 'user' ? 'player' : role.toLowerCase();
        params.append('role', rNorm);
      }

      const res = await fetch(`${API_BASE}/users?${params.toString()}`, { credentials: 'omit', headers: getHeaders() });
      if (!res.ok) {
        console.warn('Users fetch failed:', res.status, res.statusText);
        throw new Error(`Users fetch failed: ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      return list.map((u: any) => ({
        id: String(u.id || ''),
        telegram_id: u.telegram_id ?? null,
        full_name: u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || 'User',
        first_name: u.first_name ?? null,
        last_name: u.last_name ?? null,
        phone_number: u.phone_number ?? null,
        role: String(u.role || 'player').toLowerCase(),
        is_active: Boolean(u.is_active ?? true),
        rating: typeof u.rating === 'number' ? u.rating : 5.0,
        total_games: typeof u.total_games === 'number' ? u.total_games : 0,
        venues_count: typeof u.venues_count === 'number' ? u.venues_count : 0,
        bookings_count: typeof u.bookings_count === 'number' ? u.bookings_count : 0,
        created_at: u.created_at ?? null,
      }));
    } catch (err) {
      console.warn('getUsers failed:', err);
      return [];
    }
  },

  async updateUserRole(userId: string, role: string): Promise<boolean> {
    const roleToSend = role.toLowerCase() === 'user' ? 'player' : role.toLowerCase();
    const res = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ role: roleToSend }),
    });
    return res.ok;
  },

  async updateUserStatus(userId: string, isActive: boolean): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ is_active: isActive }),
    });
    return res.ok;
  },

  async getVenues(): Promise<AdminVenue[]> {
    try {
      const res = await fetch(`${API_BASE}/venues`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Venues fetch failed');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      return list.map((v: any) => ({
        id: String(v.id || ''),
        name: v.name || 'Unnamed Venue',
        address: v.address || '',
        city: v.city || 'Tashkent',
        district: v.district,
        lat: v.lat,
        lng: v.lng,
        owner_id: v.owner_id,
        owner_name: v.owner_name,
        owner_phone: v.owner_phone,
        is_active: Boolean(v.is_active ?? true),
        pitches_count: v.pitches_count || (v.pitches ? v.pitches.length : 0),
        primary_image_url: v.primary_image_url || (v.images && v.images.length > 0 ? v.images[0] : ''),
        images: v.images || [],
        created_at: v.created_at,
      }));
    } catch {
      return [];
    }
  },

  async createVenue(payload: {
    name: string;
    description?: string;
    address: string;
    city: string;
    district?: string;
    lat: number;
    lng: number;
    owner_id?: string;
    format: string;
    price_per_hour: number;
    facilities: Record<string, boolean>;
    images: string[];
  }): Promise<{ status: string; message: string; venue_id?: string }> {
    const res = await fetch(`${API_BASE}/venues`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to create venue');
    }
    return await res.json();
  },

  async deleteVenue(venueId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/venues/${venueId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return res.ok;
  },

  async getTransactions(status?: string): Promise<AdminTransaction[]> {
    try {
      // Backend path: /finance/transactions
      const params = status && status !== 'ALL' ? `?status_filter=${status}` : '';
      const res = await fetch(`${API_BASE}/finance/transactions${params}`, { headers: getHeaders() });
      if (!res.ok) {
        console.warn('Transactions fetch failed:', res.status);
        throw new Error(`Transactions fetch failed: ${res.status}`);
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      return list.map((t: any) => ({
        id: String(t.id || ''),
        booking_id: t.booking_id || '',
        user_name: t.user_name || 'Unknown',
        user_phone: t.user_phone || '',
        venue_name: t.venue_name || '',
        amount: Number(t.amount ?? 0),
        service_fee: Number(t.service_fee ?? 10000),
        payment_status: String(t.payment_status || t.status || 'PAID'),
        payment_provider: String(t.payment_provider || t.provider || 'Click'),
        created_at: t.created_at,
      }));
    } catch {
      return [];
    }
  },

  async getOwners(): Promise<{ id: string; full_name: string; phone_number?: string; role: string }[]> {
    try {
      const res = await fetch(`${API_BASE}/owners`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Owners fetch failed');
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.items || []);
      return list.map((o: any) => ({
        id: String(o.id || ''),
        full_name: o.full_name || 'Owner',
        phone_number: o.phone_number || '',
        role: String(o.role || 'owner'),
      }));
    } catch {
      return [];
    }
  },
};
