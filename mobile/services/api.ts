import { Platform } from 'react-native';

// Local Wi-Fi IP and Android Emulator IP
const WI_FI_HOST = '192.168.137.1:8000';
const ANDROID_EMULATOR_HOST = '10.0.2.2:8000';
const LOCALHOST = 'localhost:8000';

export const getBaseUrl = (): string => {
  if (Platform.OS === 'android') {
    // If running in Android Emulator, 10.0.2.2 points to host machine
    return `http://${ANDROID_EMULATOR_HOST}/api/v1`;
  }
  if (Platform.OS === 'web') {
    return `http://${LOCALHOST}/api/v1`;
  }
  // iOS simulator or real device over Wi-Fi
  return `http://${WI_FI_HOST}/api/v1`;
};

export const BASE_URL = getBaseUrl();
export const API_URL = BASE_URL;

// Generic fetcher
async function apiFetch<T>(endpoint: string, options: RequestInit = {}, token?: string | null): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.detail || 'Xatolik yuz berdi');
    }
    return data as T;
  } catch (err: any) {
    // Fallback attempt to Wi-Fi IP if emulator URL fails
    if (url.includes('10.0.2.2') && Platform.OS === 'web') {
      const fallbackUrl = `http://${LOCALHOST}/api/v1${endpoint}`;
      const res = await fetch(fallbackUrl, { ...options, headers });
      return await res.json();
    }
    throw err;
  }
}

// ─── API Methods ──────────────────────────────────────────

export const Api = {
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
    }>('/auth/me', {}, token);
  },

  // Venues & Pitches
  async getVenues(lat = 41.2858, lon = 69.2163, radius_km = 15) {
    return apiFetch<any[]>(`/venues?lat=${lat}&lon=${lon}&radius_km=${radius_km}`);
  },

  async getPitches(venueId: string) {
    return apiFetch<any[]>(`/pitches/venue/${venueId}`);
  },

  async getSlots(pitchId: string) {
    return apiFetch<any[]>(`/slots/pitch/${pitchId}?is_available=true`);
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
