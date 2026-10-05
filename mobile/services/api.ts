import { Platform } from 'react-native';

// Production Cloud Backend URL (Render 24/7)
export const RENDER_URL = 'https://sport-jmu3.onrender.com/api/v1';

// Local dev URL based on platform
export const LOCAL_DEV_URL = Platform.select({
  android: 'http://10.0.2.2:8000/api/v1',
  ios: 'http://localhost:8000/api/v1',
  default: 'http://localhost:8000/api/v1',
}) || 'http://localhost:8000/api/v1';

// Active API URL (production by default with automatic local failover)
export let API_URL = RENDER_URL;
export let BASE_URL = API_URL;

export const setApiUrl = (newUrl: string) => {
  API_URL = newUrl;
  BASE_URL = newUrl;
};

export const getBaseUrl = (): string => BASE_URL;

// Generic fetcher with resilient auto-failover
async function apiFetch<T>(endpoint: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 1. Try current BASE_URL
  try {
    const primaryUrl = `${BASE_URL}${endpoint}`;
    const res = await fetch(primaryUrl, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.detail || 'Xatolik yuz berdi');
    }
    return data as T;
  } catch (err: any) {
    // 2. If primary failed due to network / cold-start, try failover
    const failoverBase = BASE_URL === RENDER_URL ? LOCAL_DEV_URL : RENDER_URL;
    try {
      const fallbackUrl = `${failoverBase}${endpoint}`;
      const res = await fetch(fallbackUrl, { ...options, headers });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.detail || 'Xatolik yuz berdi');
      }
      BASE_URL = failoverBase;
      API_URL = failoverBase;
      return data as T;
    } catch {
      throw err;
    }
  }
}

// ─── API Methods ──────────────────────────────────────────

export const Api = {
  // Telegram Auth Start
  async startTelegramAuth() {
    return apiFetch<{
      success: boolean;
      bot_username: string;
      session_id: string;
      deep_link: string;
      web_link: string;
      message?: string;
    }>('/auth/telegram-start', {
      method: 'POST',
    });
  },

  // Auth
  async sendOtp(phone_number: string) {
    return apiFetch<{ success: boolean; message: string }>('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number }),
    });
  },

  async verifyOtp(phone_number: string, code: string) {
    return apiFetch<{
      access_token: string;
      refresh_token: string;
      user: {
        id: string;
        phone_number: string;
        full_name: string;
        role: string;
        rating: number;
      };
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number, code }),
    });
  },

  async getMe(token: string) {
    return apiFetch<{
      id: string;
      phone_number: string;
      full_name: string;
      first_name?: string;
      last_name?: string;
      role: string;
      rating: number;
      total_games: number;
      is_profile_completed: boolean;
      has_seen_tutorial: boolean;
      username?: string;
      is_credentials_set: boolean;
    }>('/auth/me', {}, token);
  },

  /** Owner/Admin username+parol bilan kirish */
  async loginWithCredentials(username: string, password: string) {
    return apiFetch<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      status: string;
      user: {
        id: string;
        full_name: string;
        username: string;
        role: string;
        is_credentials_set: boolean;
        avatar_url?: string;
      };
    }>('/auth/login-credentials', {
      method: 'POST',
      body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
    });
  },

  /** Owner/Admin o'zi uchun login va parol o'rnatish yoki yangilash */
  async setCredentials(payload: {
    username: string;
    password: string;
    current_password?: string;
  }, token: string) {
    return apiFetch<{
      success: boolean;
      username: string;
      is_credentials_set: boolean;
      message: string;
    }>('/owner/set-credentials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  // Venues & Pitches
  async getVenues(lat = 41.2858, lon = 69.2163, radius_km = 15) {
    return apiFetch<any[]>(`/venues?lat=${lat}&lon=${lon}&radius_km=${radius_km}`);
  },

  async getVenueDetails(venueId: string) {
    return apiFetch<any>(`/venues/${venueId}`);
  },

  async getRecommendedVenues(lat = 41.2858, lon = 69.2163, token?: string) {
    return apiFetch<{
      recommended_venues: any[];
      previously_liked_venues: any[];
    }>(`/venues/recommendations?lat=${lat}&lon=${lon}`, {}, token);
  },

  async getPitches(venueId: string) {
    return apiFetch<any[]>(`/pitches/venue/${venueId}`);
  },

  async getSlots(pitchId: string) {
    return apiFetch<any[]>(`/slots/pitch/${pitchId}?is_available=true`);
  },

  // ─── Post-Match Reviews & Ratings ─────────────
  async getPendingReview(token: string) {
    return apiFetch<{
      has_pending: boolean;
      pending_review?: {
        booking_id: string;
        venue_id: string;
        venue_name: string;
        pitch_name?: string;
        start_time?: string;
        end_time?: string;
      };
    }>('/reviews/pending', {}, token);
  },

  async submitReview(
    payload: {
      venue_id: string;
      booking_id?: string;
      rating: number;
      comment?: string;
      tags?: string[];
    },
    token: string
  ) {
    return apiFetch<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  async getVenueReviews(venueId: string) {
    return apiFetch<any[]>(`/reviews/venue/${venueId}`);
  },

  // ─── Telegram Auth (0 SMS Cost) ─────────────
  async initTelegramAuth() {
    return apiFetch<{
      success: boolean;
      auth_token: string;
      bot_username: string;
      deep_link: string;
      web_link: string;
      expires_in: number;
    }>('/auth/telegram/init', { method: 'POST' });
  },

  async simulateTelegramStart(authToken: string, telegramId = 987654321, firstName = 'Alisher') {
    return apiFetch<{
      success: boolean;
      message: string;
      code: string;
      expires_in: number;
    }>('/auth/telegram/simulate-start', {
      method: 'POST',
      body: JSON.stringify({
        auth_token: authToken,
        telegram_id: telegramId,
        first_name: firstName,
      }),
    });
  },

  async verifyTelegramOtp(authToken: string, code: string, phoneNumber?: string, fullName?: string) {
    return apiFetch<{
      access_token: string;
      refresh_token: string;
      is_new_user: boolean;
      is_profile_completed: boolean;
      user: {
        id: string;
        telegram_id?: number;
        phone_number?: string;
        full_name: string;
        role: string;
        rating: number;
      };
    }>('/auth/telegram/verify-otp', {
      method: 'POST',
      body: JSON.stringify({
        auth_token: authToken,
        code,
        phone_number: phoneNumber,
        full_name: fullName,
      }),
    });
  },

  // ─── Direct aiogram Bot OTP Auth ─────────────
  async verifyDirectTelegramOtp(code: string) {
    return apiFetch<{
      status: 'NEW_USER' | 'EXISTING_USER' | 'SUCCESS' | 'REQUIRES_REGISTRATION';
      access_token?: string;
      refresh_token?: string;
      telegram_id?: number;
      message?: string;
      show_welcome_back?: boolean;
      is_first_login?: boolean;
      user?: {
        id: string;
        first_name?: string;
        last_name?: string;
        phone_number?: string;
        role: string;
      };
    }>('/auth/verify-telegram-otp', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async completeRegistration(payload: {
    telegram_id: number;
    first_name: string;
    last_name: string;
    phone_number: string;
  }) {
    return apiFetch<{
      status: string;
      access_token: string;
      refresh_token: string;
      is_first_login?: boolean;
      show_welcome_back?: boolean;
      user: {
        id: string;
        full_name?: string;
        first_name: string;
        last_name: string;
        phone_number?: string;
        role: string;
      };
    }>('/auth/complete-registration', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },



  // ─── Bookings (Multi-slot & 10k Fee) ────────
  async holdBooking(slotIds: string | string[], token: string) {
    const ids = Array.isArray(slotIds) ? slotIds : [slotIds];
    return apiFetch<{
      booking_id: string;
      held_until: string;
      total_price: number;
      service_fee: number;
      venue_remaining_amount: number;
      payment_deadline_seconds: number;
      payment_url: string;
    }>('/bookings/hold', {
      method: 'POST',
      body: JSON.stringify({ slot_ids: ids, slot_id: ids[0] }),
    }, token);
  },

  async getCheckoutDetails(bookingId: string, token: string) {
    return apiFetch<{
      booking_id: string;
      service_fee: number;
      total_price: number;
      remaining_venue_amount: number;
      currency: string;
      click_url: string;
      payme_url: string;
      mock_simulator_available: boolean;
      message: string;
    }>(`/payments/checkout?booking_id=${bookingId}`, { method: 'GET' }, token);
  },

  async simulatePayment(bookingId: string, paymentMethod: 'CLICK' | 'PAYME', token: string) {
    return apiFetch<{
      success: boolean;
      booking_id: string;
      status: string;
      payment_status: string;
      paid_amount: number;
      payment_method: string;
      qr_pass: string;
      message: string;
    }>('/payments/simulate-success', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId, payment_method: paymentMethod }),
    }, token);
  },

  async confirmBooking(bookingId: string, token: string) {
    return apiFetch<any>(`/bookings/${bookingId}/confirm`, {
      method: 'POST',
      body: JSON.stringify({ payment_method: 'CLICK' }),
    }, token);
  },

  async getMyBookings(token: string) {
    return apiFetch<any[]>('/bookings/my', { method: 'GET' }, token);
  },

  // ─── Owner Management ──────────────────────
  async getOwnerVenues(token: string) {
    return apiFetch<any[]>('/owner/my-venues', { method: 'GET' }, token);
  },

  async getOwnerPendingBookings(token: string) {
    return apiFetch<any[]>('/owner/pending-bookings', { method: 'GET' }, token);
  },

  async actionOwnerBooking(bookingId: string, action: 'CONFIRM' | 'REJECT', token: string) {
    return apiFetch<any>(`/owner/bookings/${bookingId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }, token);
  },

  async toggleSlotBlock(slotId: string, block: boolean, token: string) {
    return apiFetch<any>('/owner/slots/toggle-block', {
      method: 'POST',
      body: JSON.stringify({ slot_id: slotId, block }),
    }, token);
  },

  /** Venue asosiy ma'lumotlarini yangilash (nomi, narxi, qulayliklar, rasmlar) */
  async updateVenue(venueId: string, payload: {
    name?: string;
    description?: string;
    address?: string;
    city?: string;
    phone_number?: string;
    base_price_per_hour?: number;
    amenities?: Record<string, boolean>;
    photos?: string[];
    is_active?: boolean;
    working_hours_start?: string;
    working_hours_end?: string;
  }, token: string) {
    return apiFetch<any>(`/owner/venues/${venueId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }, token);
  },

  /** AVAILABLE slotlar narxini Smart Pricing bo'yicha bulk yangilash */
  async bulkUpdateSlotPrices(payload: {
    pitch_id: string;
    day_price: number;
    prime_price: number;
    night_price: number;
    only_future?: boolean;
  }, token: string) {
    return apiFetch<{ success: boolean; updated_count: number; message: string }>(
      '/owner/slots/bulk-price-update',
      { method: 'POST', body: JSON.stringify(payload) },
      token
    );
  },

  /** Bugungi sana bo'yicha slot statistikasi (dashboard uchun) */
  async getTodayStats(venueId: string, token: string) {
    return apiFetch<{
      total: number; available: number; locked: number;
      booked: number; manual_booked: number; blocked: number;
      revenue_today: number; venue_id: string;
    }>(`/owner/venues/${venueId}/today-stats`, { method: 'GET' }, token);
  },

  /** Owner taqvimga yangi slot qo'shish */
  async ownerCreateSlot(payload: {
    pitch_id: string;
    start_time: string;
    end_time: string;
    price: number;
    status?: string;
    booked_by_name?: string;
    booked_by_phone?: string;
  }, token: string) {
    return apiFetch<any>('/owner/slots/create', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /** Owner qo'lda slot band qilish (offline bron) */
  async manualBookSlot(payload: {
    slot_id: string;
    booked_by_name: string;
    booked_by_phone: string;
    is_recurring?: boolean;
    price?: number;
    send_sms_notice?: boolean;
  }, token: string) {
    return apiFetch<any>('/owner/slots/manual-book', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  /** Venue'ning slot jadvalini olish (owner uchun) */
  async getOwnerVenueSlots(venueId: string, date: string, token: string) {
    return apiFetch<any[]>(
      `/owner/venues/${venueId}/slots?date=${date}`,
      { method: 'GET' },
      token
    );
  },

  /** Smart Pricing — 30 kunlik slotlarni generatsiya qilish */
  async smartGenerateSlots(payload: {
    pitch_id: string;
    days_ahead?: number;
    day_price: number;
    prime_price: number;
    night_price: number;
  }, token: string) {
    return apiFetch<{
      success: boolean; created_count: number; skipped_count: number; message: string;
    }>('/owner/slots/smart-generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token);
  },

  // Solo Play Matches
  async getMatches(lat = 41.2858, lon = 69.2163, radius_km = 20) {
    return apiFetch<any[]>(`/matches?lat=${lat}&lon=${lon}&radius_km=${radius_km}&status=FORMING`);
  },

  async getMatchDetail(matchId: string) {
    return apiFetch<any>(`/matches/${matchId}`);
  },

  async joinMatch(matchId: string, position: string, token: string) {
    return apiFetch<{
      success: boolean;
      participant_id: string;
      message: string;
    }>(`/matches/${matchId}/join`, {
      method: 'POST',
      body: JSON.stringify({ player_position: position }),
    }, token);
  },

  // Solo Profile & Radar
  async getSoloProfile(token: string) {
    return apiFetch<any>('/solo-profile/me', { method: 'GET' }, token);
  },

  async toggleLookingForGame(isLooking: boolean, lat = 41.2858, lon = 69.2163, token: string) {
    return apiFetch<any>('/solo-profile/me', {
      method: 'PATCH',
      body: JSON.stringify({ is_looking_for_game: isLooking, lat, lon }),
    }, token);
  },

  async getNearbyPlayers(lat = 41.2858, lon = 69.2163, token: string) {
    return apiFetch<any[]>(`/solo-profile/nearby?lat=${lat}&lon=${lon}&radius_km=15`, { method: 'GET' }, token);
  },

  // ─── Analytics & Presence ─────────────────────────────────
  async sendHeartbeat(userIdOrDeviceId: string = 'guest_anonymous') {
    return apiFetch<{ status: string }>('/analytics/ping', {
      method: 'POST',
      body: JSON.stringify({ user_id: userIdOrDeviceId }),
    });
  },

  async registerInstall(deviceUuid: string, platform: string, appVersion: string = '1.0.0', osVersion?: string) {
    return apiFetch<{ status: string }>('/analytics/install', {
      method: 'POST',
      body: JSON.stringify({
        device_uuid: deviceUuid,
        platform,
        app_version: appVersion,
        os_version: osVersion,
      }),
    });
  },
};
