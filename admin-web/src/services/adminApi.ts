/**
 * Admin API Client — Sport+ Backend integratsiyasi.
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
  telegram_id?: number;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  role: 'USER' | 'OWNER' | 'ADMIN' | string;
  is_active: boolean;
  rating: number;
  total_games: number;
  created_at?: string;
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
      return await res.json();
    } catch {
      return {
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
      };
    }
  },

  async getStats(): Promise<DashboardStats> {
    try {
      const res = await fetch(`${API_BASE}/dashboard-stats`, { credentials: 'omit', headers: getHeaders() });
      if (!res.ok) throw new Error('Stats fetch failed');
      return await res.json();
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
      if (q) params.append('q', q);
      if (role && role !== 'ALL') params.append('role', role);

      const res = await fetch(`${API_BASE}/users?${params.toString()}`, { credentials: 'omit', headers: getHeaders() });
      if (!res.ok) throw new Error('Users fetch failed');
      return await res.json();
    } catch {
      return [
        { id: 'usr-1', telegram_id: 991827364, full_name: 'Alisher Karimov', first_name: 'Alisher', last_name: 'Karimov', phone_number: '+998901234567', role: 'ADMIN', is_active: true, rating: 5.0, total_games: 28 },
        { id: 'usr-2', telegram_id: 882736192, full_name: 'Jamshid Normatov', first_name: 'Jamshid', last_name: 'Normatov', phone_number: '+998912345678', role: 'OWNER', is_active: true, rating: 4.8, total_games: 14 },
        { id: 'usr-3', telegram_id: 773829104, full_name: 'Bobur Mirzayev', first_name: 'Bobur', last_name: 'Mirzayev', phone_number: '+998933456789', role: 'USER', is_active: true, rating: 4.9, total_games: 8 },
        { id: 'usr-4', telegram_id: 664928173, full_name: 'Sanjar Rahimov', first_name: 'Sanjar', last_name: 'Rahimov', phone_number: '+998971239876', role: 'USER', is_active: true, rating: 4.7, total_games: 5 },
      ];
    }
  },

  async updateUserRole(userId: string, role: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ role }),
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
      return await res.json();
    } catch {
      return [
        {
          id: 'v-1',
          name: 'Bunyodkor Arena (7x7)',
          address: 'Chilonzor ko\'chasi 45, Toshkent',
          city: 'Toshkent',
          district: 'Chilonzor',
          owner_name: 'Jamshid Normatov',
          owner_phone: '+998912345678',
          is_active: true,
          pitches_count: 2,
          primary_image_url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
          images: [
            'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1551958219-acbc608c6377?auto=format&fit=crop&w=800&q=80',
          ],
        },
        {
          id: 'v-2',
          name: 'Olimpiya Sport Majmuasi',
          address: 'Yunusobod 14-mavze, Toshkent',
          city: 'Toshkent',
          district: 'Yunusobod',
          owner_name: 'Alisher Karimov',
          owner_phone: '+998901234567',
          is_active: true,
          pitches_count: 3,
          primary_image_url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
          images: [
            'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=800&q=80',
            'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80',
          ],
        },
      ];
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
      throw new Error(err.detail || 'Stadion qo\'shishda xatolik');
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
      const params = status && status !== 'ALL' ? `?status=${status}` : '';
      const res = await fetch(`${API_BASE}/transactions${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Transactions fetch failed');
      return await res.json();
    } catch {
      return [
        { id: 'tx-1', booking_id: 'b-101', user_name: 'Sanjar Rahimov', user_phone: '+998971239876', venue_name: 'Bunyodkor Arena (7x7)', amount: 140000, service_fee: 10000, payment_status: 'PAID', payment_provider: 'Click', created_at: '2026-09-29T10:30:00Z' },
        { id: 'tx-2', booking_id: 'b-102', user_name: 'Bobur Mirzayev', user_phone: '+998933456789', venue_name: 'Olimpiya Sport Majmuasi', amount: 160000, service_fee: 10000, payment_status: 'PAID', payment_provider: 'Payme', created_at: '2026-09-29T11:45:00Z' },
        { id: 'tx-3', booking_id: 'b-103', user_name: 'Alisher Karimov', user_phone: '+998901234567', venue_name: 'Bunyodkor Arena (7x7)', amount: 120000, service_fee: 10000, payment_status: 'PAID', payment_provider: 'Click', created_at: '2026-09-29T13:15:00Z' },
        { id: 'tx-4', booking_id: 'b-104', user_name: 'Jasur Saidov', user_phone: '+998944567890', venue_name: 'Spartak Arena', amount: 90000, service_fee: 10000, payment_status: 'UNPAID', payment_provider: 'Payme', created_at: '2026-09-29T14:00:00Z' },
      ];
    }
  },

  async getOwners(): Promise<{ id: string; full_name: string; phone_number?: string; role: string }[]> {
    try {
      const res = await fetch(`${API_BASE}/owners`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Owners fetch failed');
      return await res.json();
    } catch {
      return [
        { id: 'usr-2', full_name: 'Jamshid Normatov', phone_number: '+998912345678', role: 'OWNER' },
        { id: 'usr-1', full_name: 'Alisher Karimov', phone_number: '+998901234567', role: 'ADMIN' },
      ];
    }
  },
};
