/**
 * SPORT+ ADMIN PANEL — CONTROLLER & REALTIME ENGINE
 * 100% Real Backend Integration with FastAPI + Redis + PostgreSQL
 */

const API_BASE = '/api/v1/admin';
const TOKEN_KEY = 'sportplus_admin_token';

// App State
const state = {
  currentTab: 'dashboard',
  analytics: null,
  venues: [],
  users: [],
  transactions: [],
  activeChartDays: 7,
  searchDebounceTimer: null,
  leafletMapPicker: null,
  pickerMarker: null,
  activeVenueForMap: null,
  heartbeatTimer: null,
};

// ─────────────────────────────────────────────────────────────
// SUPERADMIN AUTH & ROUTE GUARD
// ─────────────────────────────────────────────────────────────

function getAdminToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setAdminToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

function removeAdminToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function checkAdminAuth() {
  const token = getAdminToken();
  const loginOverlay = document.getElementById('loginScreen');
  const adminLayout = document.getElementById('adminLayout');

  if (!token) {
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (adminLayout) adminLayout.style.display = 'none';
    return false;
  } else {
    if (loginOverlay) loginOverlay.style.display = 'none';
    if (adminLayout) adminLayout.style.display = 'flex';
    return true;
  }
}

async function authFetch(url, options = {}) {
  const token = getAdminToken();
  const headers = Object.assign({}, options.headers || {});

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    removeAdminToken();
    checkAdminAuth();
    showToast('Sessiya muddati tugadi. Iltimos, qayta kiring.', true);
    throw new Error('Sessiya muddati tugadi');
  }

  return response;
}

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initAuthEvents();
  initNavigation();
  initDashboardEvents();
  initVenuesEvents();
  initUsersEvents();
  initFinanceEvents();

  // Route Guard tekshiruvi
  const isAuthenticated = checkAdminAuth();
  if (isAuthenticated) {
    initApp();
  }
});

function initApp() {
  // Dastlabki yuklash
  loadAnalytics();
  loadVenues();
  loadUsers();
  loadTransactions();

  // Jonli Redis Heartbeat yangilanishi (har 20 soniyada)
  if (!state.heartbeatTimer) {
    state.heartbeatTimer = setInterval(() => {
      if (state.currentTab === 'dashboard' && getAdminToken()) {
        loadAnalytics(true);
      }
    }, 20000);
  }
}

function initAuthEvents() {
  // Login form submit
  const loginForm = document.getElementById('adminLoginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleAdminLoginSubmit);
  }

  // Password Show / Hide toggle
  const toggleBtn = document.getElementById('btnTogglePassword');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const pwdInput = document.getElementById('adminPassword');
      const eyeOpen = document.getElementById('eyeIconOpen');
      const eyeClosed = document.getElementById('eyeIconClosed');
      if (pwdInput.type === 'password') {
        pwdInput.type = 'text';
        if (eyeOpen) eyeOpen.style.display = 'none';
        if (eyeClosed) eyeClosed.style.display = 'inline-block';
      } else {
        pwdInput.type = 'password';
        if (eyeOpen) eyeOpen.style.display = 'inline-block';
        if (eyeClosed) eyeClosed.style.display = 'none';
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btnAdminLogout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleAdminLogout);
  }
}

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('adminUsername');
  const passwordInput = document.getElementById('adminPassword');
  const errorAlert = document.getElementById('loginErrorAlert');
  const errorText = document.getElementById('loginErrorText');
  const card = document.getElementById('loginCard');
  const submitBtn = document.getElementById('btnLoginSubmit');
  const btnText = document.getElementById('loginBtnText');
  const spinner = document.getElementById('loginBtnSpinner');

  if (errorAlert) errorAlert.style.display = 'none';
  if (card) card.classList.remove('login-card-shake');

  const username = (usernameInput ? usernameInput.value : '').trim();
  const password = passwordInput ? passwordInput.value : '';

  if (!username || !password) return;

  try {
    submitBtn.disabled = true;
    if (btnText) btnText.textContent = 'Tekshirilmoqda...';
    if (spinner) spinner.style.display = 'inline-block';

    const res = await fetch('/api/v1/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (card) {
        card.classList.add('login-card-shake');
        setTimeout(() => card.classList.remove('login-card-shake'), 500);
      }
      if (errorAlert) {
        errorAlert.style.display = 'flex';
        errorText.textContent = data.detail || "Login yoki parol noto'g'ri.";
      }
      return;
    }

    setAdminToken(data.access_token);
    const adminDisplay = document.getElementById('adminNameDisplay');
    if (adminDisplay && data.admin && data.admin.full_name) {
      adminDisplay.textContent = data.admin.full_name;
    }

    checkAdminAuth();
    showToast('Boshqaruv markaziga muvaffaqiyatli kirildi!');
    initApp();
  } catch (err) {
    if (errorAlert) {
      errorAlert.style.display = 'flex';
      errorText.textContent = "Server bilan aloqada xatolik yuz berdi.";
    }
  } finally {
    submitBtn.disabled = false;
    if (btnText) btnText.textContent = 'Kirish';
    if (spinner) spinner.style.display = 'none';
  }
}

async function handleAdminLogout() {
  const token = getAdminToken();
  if (token) {
    try {
      await fetch('/api/v1/admin/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (e) {}
  }
  removeAdminToken();
  checkAdminAuth();
  showToast('Admin tizimidan chiqildi.');
}

// ─────────────────────────────────────────────────────────────
// TOAST NOTIFICATIONS
// ─────────────────────────────────────────────────────────────

function showToast(message, isError = false) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${isError ? 'toast-error' : ''}`;
  toast.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isError ? '#ef4444' : '#10b981'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${isError 
        ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>' 
        : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>'
      }
    </svg>
    <span class="toast-message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────

function initNavigation() {
  const navLinks = document.querySelectorAll('.nav-link[data-tab]');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');
      switchTab(targetTab);
    });
  });
}

function switchTab(tabId) {
  state.currentTab = tabId;

  // Update Nav links
  document.querySelectorAll('.nav-link[data-tab]').forEach((l) => {
    if (l.getAttribute('data-tab') === tabId) {
      l.classList.add('active');
    } else {
      l.classList.remove('active');
    }
  });

  // Update View containers
  document.querySelectorAll('.page-view').forEach((v) => {
    v.classList.remove('active');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  if (activeView) activeView.classList.add('active');

  // Page specific reloads
  if (tabId === 'dashboard') loadAnalytics();
  if (tabId === 'venues') loadVenues();
  if (tabId === 'users') loadUsers();
  if (tabId === 'finance') loadTransactions();
}

// ─────────────────────────────────────────────────────────────
// 1. DASHBOARD & REALTIME METRICS
// ─────────────────────────────────────────────────────────────

async function loadAnalytics(isSilent = false) {
  try {
    const res = await authFetch(`${API_BASE}/analytics/realtime`);
    if (!res.ok) throw new Error('Analytics yuklanmadi');
    const data = await res.json();
    state.analytics = data;

    renderAnalytics(data);
  } catch (err) {
    if (!isSilent) showToast(err.message, true);
  }
}

function renderAnalytics(data) {
  // Live Online
  const onlineEl = document.getElementById('statOnlineUsers');
  if (onlineEl) onlineEl.textContent = data.online_users || 0;

  // App Installs Breakdown
  const inst = data.app_installations || { android: 0, ios: 0, web: 0, total: 0 };
  const totalInstEl = document.getElementById('statAppInstalls');
  if (totalInstEl) totalInstEl.textContent = Number(inst.total || 0).toLocaleString();
  const instAndroidEl = document.getElementById('instAndroid');
  if (instAndroidEl) instAndroidEl.textContent = inst.android || 0;
  const instIosEl = document.getElementById('instIos');
  if (instIosEl) instIosEl.textContent = inst.ios || 0;
  const instWebEl = document.getElementById('instWeb');
  if (instWebEl) instWebEl.textContent = inst.web || 0;

  // Totals
  const t = data.totals || {};
  const revEl = document.getElementById('statTotalRevenue');
  if (revEl) revEl.textContent = `${Number(t.total_platform_revenue_uzs || 0).toLocaleString()} UZS`;

  const usersEl = document.getElementById('statTotalUsers');
  if (usersEl) usersEl.textContent = t.users_count || 0;

  const venuesEl = document.getElementById('statTotalVenues');
  if (venuesEl) venuesEl.textContent = t.venues_count || 0;

  const bookingsEl = document.getElementById('statConfirmedBookings');
  if (bookingsEl) bookingsEl.textContent = t.confirmed_bookings || 0;

  // Side summary in Dashboard
  const sumVenues = document.getElementById('sumVenuesCount');
  if (sumVenues) sumVenues.textContent = t.venues_count || 0;
  const sumPitches = document.getElementById('sumPitchesCount');
  if (sumPitches) sumPitches.textContent = t.pitches_count || 0;
  const sumMatches = document.getElementById('sumMatchesCount');
  if (sumMatches) sumMatches.textContent = t.total_matches || 0;

  // Render SVG Revenue Chart
  renderRevenueChart();
}

function renderRevenueChart() {
  const container = document.getElementById('chartSvgContainer');
  if (!container || !state.analytics) return;

  const is7d = state.activeChartDays === 7;
  const chartData = is7d
    ? state.analytics.revenue_chart_7d || []
    : state.analytics.revenue_chart_30d || [];

  if (chartData.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#94a3b8">Ma\'lumotlar mavjud emas</div>';
    return;
  }

  const width = container.clientWidth || 600;
  const height = 220;
  const padLeft = 40;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 30;

  const maxVal = Math.max(...chartData.map((d) => d.amount), 50000);
  const plotWidth = width - padLeft - padRight;
  const plotHeight = height - padTop - padBottom;

  const points = chartData.map((d, idx) => {
    const x = padLeft + (idx / (chartData.length - 1)) * plotWidth;
    const y = padTop + plotHeight - (d.amount / maxVal) * plotHeight;
    return { x, y, data: d };
  });

  // Smooth spline path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const mx = (p0.x + p1.x) / 2;
    pathD += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  // Area path for gradient fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`;

  let svgHtml = `
    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow:visible">
      <defs>
        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Horizontal gridlines -->
      <line x1="${padLeft}" y1="${padTop}" x2="${width - padRight}" y2="${padTop}" stroke="#f1f5f9" stroke-width="1" />
      <line x1="${padLeft}" y1="${padTop + plotHeight / 2}" x2="${width - padRight}" y2="${padTop + plotHeight / 2}" stroke="#f1f5f9" stroke-width="1" />
      <line x1="${padLeft}" y1="${padTop + plotHeight}" x2="${width - padRight}" y2="${padTop + plotHeight}" stroke="#e2e8f0" stroke-width="1" />

      <!-- Area and Line -->
      <path d="${areaD}" fill="url(#revenueGrad)" />
      <path d="${pathD}" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />

      <!-- Interactive Circles -->
      ${points
        .map(
          (p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="white" stroke="#10b981" stroke-width="2.5" 
          class="chart-point" data-idx="${i}" style="cursor:pointer;transition:transform 0.15s ease;" />
        ${
          i % (is7d ? 1 : 4) === 0
            ? `<text x="${p.x}" y="${height - 8}" text-anchor="middle" font-size="11" fill="#94a3b8" font-weight="600">${p.data.label}</text>`
            : ''
        }
      `
        )
        .join('')}
    </svg>
    <div id="chartTooltip" class="chart-tooltip"></div>
  `;

  container.innerHTML = svgHtml;

  // Tooltip interaction
  const tooltip = document.getElementById('chartTooltip');
  const circles = container.querySelectorAll('.chart-point');
  circles.forEach((c) => {
    c.addEventListener('mouseenter', (e) => {
      const idx = e.target.getAttribute('data-idx');
      const item = chartData[idx];
      c.setAttribute('r', '7');
      c.setAttribute('fill', '#10b981');
      tooltip.innerHTML = `<strong>${item.date}</strong><br/>${Number(item.amount).toLocaleString()} UZS (${item.bookings} bron)`;
      tooltip.style.left = `${e.target.getAttribute('cx')}px`;
      tooltip.style.top = `${e.target.getAttribute('cy')}px`;
      tooltip.style.opacity = '1';
    });
    c.addEventListener('mouseleave', () => {
      c.setAttribute('r', '5');
      c.setAttribute('fill', 'white');
      tooltip.style.opacity = '0';
    });
  });
}

function initDashboardEvents() {
  // Chart Tabs: 7 Days / 30 Days
  const tab7d = document.getElementById('tab7d');
  const tab30d = document.getElementById('tab30d');
  if (tab7d && tab30d) {
    tab7d.addEventListener('click', () => {
      state.activeChartDays = 7;
      tab7d.classList.add('active');
      tab30d.classList.remove('active');
      renderRevenueChart();
    });
    tab30d.addEventListener('click', () => {
      state.activeChartDays = 30;
      tab30d.classList.add('active');
      tab7d.classList.remove('active');
      renderRevenueChart();
    });
  }

  // Quick Action: Flush Redis Cache
  const flushBtn = document.getElementById('btnFlushCache');
  if (flushBtn) {
    flushBtn.addEventListener('click', async () => {
      try {
        flushBtn.disabled = true;
        flushBtn.innerHTML = '<span>Tozalanmoqda...</span>';
        const res = await authFetch(`${API_BASE}/system/flush-cache`, { method: 'POST' });
        const data = await res.json();
        showToast(data.message || 'Redis platforma keshi muvaffaqiyatli tozalandi.');
      } catch (err) {
        showToast('Kesh tozalashda xatolik', true);
      } finally {
        flushBtn.disabled = false;
        flushBtn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>
          <span>Flush Redis Cache</span>
        `;
      }
    });
  }

  // Quick Action: Clean Matches
  const cleanMatchesBtn = document.getElementById('btnCleanMatches');
  if (cleanMatchesBtn) {
    cleanMatchesBtn.addEventListener('click', async () => {
      try {
        cleanMatchesBtn.disabled = true;
        const res = await authFetch(`${API_BASE}/system/clean-matches`, { method: 'POST' });
        const data = await res.json();
        showToast(data.message || 'Bo\'sh qolgan o\'yinlar tozalandi.');
        loadAnalytics(true);
      } catch (err) {
        showToast('O\'yinlarni tozalashda xatolik', true);
      } finally {
        cleanMatchesBtn.disabled = false;
      }
    });
  }
}

// ─────────────────────────────────────────────────────────────
// 2. STADIONLAR & MAYDONLAR (VENUES)
// ─────────────────────────────────────────────────────────────

async function loadVenues() {
  const grid = document.getElementById('venuesGrid');
  if (!grid) return;

  try {
    const res = await authFetch(`${API_BASE}/venues`);
    if (!res.ok) throw new Error('Stadionlar yuklanmadi');
    const venues = await res.json();
    state.venues = venues;

    renderVenues(venues);
  } catch (err) {
    showToast(err.message, true);
  }
}

// ─────────────────────────────────────────────────────────────
// AUTO IMAGE SLIDER & VENUES CONTROLLER
// ─────────────────────────────────────────────────────────────

state.venueSliderIntervals = state.venueSliderIntervals || {};

function clearAllVenueSliders() {
  if (state.venueSliderIntervals) {
    Object.keys(state.venueSliderIntervals).forEach((id) => {
      clearInterval(state.venueSliderIntervals[id]);
    });
    state.venueSliderIntervals = {};
  }
}

function startVenueAutoSlider(venueId, imagesCount) {
  if (!imagesCount || imagesCount <= 1) return;
  if (state.venueSliderIntervals[venueId]) {
    clearInterval(state.venueSliderIntervals[venueId]);
  }
  state.venueSliderIntervals[venueId] = setInterval(() => {
    switchVenueSlide(venueId, 1);
  }, 3500); // Har 3.5 soniyada avto-slayd
}

function stopVenueAutoSlider(venueId) {
  if (state.venueSliderIntervals[venueId]) {
    clearInterval(state.venueSliderIntervals[venueId]);
    delete state.venueSliderIntervals[venueId];
  }
}

function switchVenueSlide(venueId, step) {
  const carousel = document.querySelector(`.venue-carousel[data-venue-id="${venueId}"]`);
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.carousel-slide');
  if (slides.length <= 1) return;

  let curIdx = parseInt(carousel.getAttribute('data-current-index') || '0', 10);
  let nextIdx = (curIdx + step + slides.length) % slides.length;
  setVenueSlideIndex(venueId, nextIdx);
}

function setVenueSlideIndex(venueId, targetIdx) {
  const carousel = document.querySelector(`.venue-carousel[data-venue-id="${venueId}"]`);
  if (!carousel) return;

  const slides = carousel.querySelectorAll('.carousel-slide');
  const dots = carousel.querySelectorAll('.carousel-dot');
  if (slides.length === 0) return;

  carousel.setAttribute('data-current-index', targetIdx);

  slides.forEach((s, idx) => {
    if (idx === targetIdx) {
      s.classList.add('active');
    } else {
      s.classList.remove('active');
    }
  });

  dots.forEach((d, idx) => {
    if (idx === targetIdx) {
      d.classList.add('active');
    } else {
      d.classList.remove('active');
    }
  });
}

function handleVenueHoverEnter(venueId) {
  stopVenueAutoSlider(venueId);
}

function handleVenueHoverLeave(venueId, imagesLength) {
  if (imagesLength > 1) {
    startVenueAutoSlider(venueId, imagesLength);
  }
}

function handleCarouselPrev(venueId, imagesLength) {
  switchVenueSlide(venueId, -1);
  if (imagesLength > 1) {
    startVenueAutoSlider(venueId, imagesLength);
  }
}

function handleCarouselNext(venueId, imagesLength) {
  switchVenueSlide(venueId, 1);
  if (imagesLength > 1) {
    startVenueAutoSlider(venueId, imagesLength);
  }
}

function handleDotClick(venueId, targetIdx, imagesLength) {
  setVenueSlideIndex(venueId, targetIdx);
  if (imagesLength > 1) {
    startVenueAutoSlider(venueId, imagesLength);
  }
}

function renderVenues(venues) {
  const grid = document.getElementById('venuesGrid');
  if (!grid) return;

  // Eski intervallarni tozalaymiz
  clearAllVenueSliders();

  // Stadionlar yo'q bo'lsa toza minimal bo'sh holat
  if (!venues || venues.length === 0) {
    grid.innerHTML = `
      <div class="venue-empty-card">
        <div class="empty-icon-wrap">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
        </div>
        <h3 style="font-size:1.15rem; font-weight:800; color:var(--text-main); margin-bottom:8px;">Hech qanday stadion mavjud emas</h3>
        <p style="font-size:0.9rem; color:var(--text-muted); max-width:440px; margin:0 auto 20px;">Hech qanday stadion mavjud emas. Yangi stadion qo'shish tugmasi orqali ilk stadionni yarating.</p>
        <button class="btn-primary" onclick="openAddVenueModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          <span>Yangi Stadion Qo'shish</span>
        </button>
      </div>
    `;
    return;
  }

  grid.innerHTML = venues
    .map((v) => {
      // Gallery images
      const images = (v.images && v.images.length > 0)
        ? v.images
        : (v.primary_image_url ? [v.primary_image_url] : []);

      // Pitches badges
      const pitchesHtml = (v.pitches || [])
        .map((p) => {
          const pillClass = p.format === '5x5' ? 'pill-5x5' : p.format === '7x7' ? 'pill-7x7' : 'pill-11x11';
          return `<span class="pitch-pill ${pillClass}">${escapeHtml(p.name)} (${p.format})</span>`;
        })
        .join('');

      return `
      <div class="venue-card" id="venue-card-${v.id}">
        <!-- AutoImageSlider with 3.5s interval & hover pause -->
        ${
          images.length === 0
            ? `
          <div class="venue-carousel no-images">
            <div class="venue-no-image">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
              <span>Rasm yuklanmagan</span>
            </div>
          </div>
          `
            : `
          <div class="venue-carousel" data-venue-id="${v.id}" data-current-index="0"
               onmouseenter="handleVenueHoverEnter('${v.id}')"
               onmouseleave="handleVenueHoverLeave('${v.id}', ${images.length})">
            <div class="carousel-track">
              ${images
                .map(
                  (imgUrl, i) => `
                <div class="carousel-slide ${i === 0 ? 'active' : ''}">
                  <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(v.name)} - ${i + 1}"
                       class="carousel-img"
                       onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=900&auto=format&fit=crop';" />
                </div>
              `
                )
                .join('')}
            </div>

            ${
              images.length > 1
                ? `
              <button class="carousel-nav-btn carousel-prev" onclick="handleCarouselPrev('${v.id}', ${images.length})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>
              <button class="carousel-nav-btn carousel-next" onclick="handleCarouselNext('${v.id}', ${images.length})">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
              <div class="carousel-dots">
                ${images
                  .map(
                    (_, i) => `
                  <span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="handleDotClick('${v.id}', ${i}, ${images.length})"></span>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
          </div>
          `
        }

        <!-- Venue Details -->
        <div class="venue-body">
          <div class="venue-header-row">
            <h3 class="venue-name">${escapeHtml(v.name)}</h3>
            <div class="venue-rating">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              <span>${v.avg_rating || '5.0'}</span>
            </div>
          </div>

          <div class="venue-address">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span>${escapeHtml(v.city || 'Toshkent')}, ${escapeHtml(v.address)}</span>
          </div>

          <!-- Pitches -->
          <div class="pitches-list">
            ${pitchesHtml || '<span class="pitch-pill">Maydonlar belgilanmagan</span>'}
          </div>

          <!-- Owner Information -->
          <div class="venue-owner-row">
            <span>Maydon Egasi:</span>
            <span class="venue-owner-name">${escapeHtml(v.owner_name || 'Biriktirilmagan')}</span>
          </div>
        </div>

        <!-- Card Actions: Tahrirlash, Vaqt Slotlari, Xaritada Joylashuv, O'chirish -->
        <div class="venue-actions">
          <button class="action-icon-btn" onclick="openEditVenueModal('${v.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            <span>Tahrirlash</span>
          </button>
          <button class="action-icon-btn" onclick="openSlotsModal('${v.id}', '${escapeHtml(v.name)}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>Vaqt Slotlari</span>
          </button>
          <button class="action-icon-btn" onclick="openMapViewModal('${v.id}', '${escapeHtml(v.name)}', ${v.lat || 41.2995}, ${v.lon || 69.2401})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
            <span>Xarita</span>
          </button>
          <button class="action-icon-btn danger" onclick="deleteVenue('${v.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            <span>O'chirish</span>
          </button>
        </div>
      </div>
      `;
    })
    .join('');

  // 2 tadan ko'p rasmga ega bo'lgan kartalar uchun 3.5s interval avto-slaydni faollashtiramiz
  venues.forEach((v) => {
    const imgs = (v.images && v.images.length > 0)
      ? v.images
      : (v.primary_image_url ? [v.primary_image_url] : []);
    if (imgs.length > 1) {
      startVenueAutoSlider(v.id, imgs.length);
    }
  });
}

function initVenuesEvents() {
  // Yangi Stadion Qo'shish Button
  const addBtn = document.getElementById('btnOpenAddVenue');
  if (addBtn) {
    addBtn.addEventListener('click', openAddVenueModal);
  }

  // Modal Form Submit
  const venueForm = document.getElementById('addVenueForm');
  if (venueForm) {
    venueForm.addEventListener('submit', handleCreateVenueSubmit);
  }
}

// "Yangi Stadion Qo'shish" Modal with Leaflet Map Coordinates Picker
function openAddVenueModal() {
  const modal = document.getElementById('modalAddVenue');
  if (!modal) return;

  modal.classList.add('active');

  // Populate Owners selector
  const ownerSelect = document.getElementById('newVenueOwner');
  if (ownerSelect) {
    const owners = (state.users || []).filter((u) => u.role === 'owner');
    ownerSelect.innerHTML = owners.length > 0
      ? owners.map((o) => `<option value="${o.id}">${escapeHtml(o.full_name)} (${o.phone_number || 'Tel yo\'q'})</option>`).join('')
      : '<option value="">Maydon egasi mavjud emas (Foydalanuvchilarda Owner yarating)</option>';
  }

  // Initialize Leaflet Map for coordinate picking
  setTimeout(() => {
    initLeafletPicker(41.2995, 69.2401);
  }, 200);
}

function initLeafletPicker(lat, lon) {
  const mapContainer = document.getElementById('mapPicker');
  if (!mapContainer) return;

  if (state.leafletMapPicker) {
    state.leafletMapPicker.remove();
  }

  if (typeof L === 'undefined') {
    mapContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Xarita moduli yuklanmoqda...</div>';
    return;
  }

  state.leafletMapPicker = L.map('mapPicker').setView([lat, lon], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
  }).addTo(state.leafletMapPicker);

  state.pickerMarker = L.marker([lat, lon], { draggable: true }).addTo(state.leafletMapPicker);

  const updateInputs = (pos) => {
    const latInput = document.getElementById('newVenueLat');
    const lonInput = document.getElementById('newVenueLon');
    if (latInput) latInput.value = pos.lat.toFixed(5);
    if (lonInput) lonInput.value = pos.lng.toFixed(5);
  };

  updateInputs({ lat, lng: lon });

  state.pickerMarker.on('dragend', function (e) {
    updateInputs(e.target.getLatLng());
  });

  state.leafletMapPicker.on('click', function (e) {
    state.pickerMarker.setLatLng(e.latlng);
    updateInputs(e.latlng);
  });
}

async function handleCreateVenueSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('newVenueName').value.trim();
  const address = document.getElementById('newVenueAddress').value.trim();
  const city = document.getElementById('newVenueCity').value.trim();
  const lat = parseFloat(document.getElementById('newVenueLat').value) || 41.2995;
  const lon = parseFloat(document.getElementById('newVenueLon').value) || 69.2401;
  const ownerId = document.getElementById('newVenueOwner').value;

  // Formats checkboxes: 5x5, 7x7, 11x11
  const pitches = [];
  if (document.getElementById('fmt5x5').checked) {
    pitches.push({ name: `${name} (5x5 Mini)`, format: '5x5', price_per_hour: 200000.0 });
  }
  if (document.getElementById('fmt7x7').checked) {
    pitches.push({ name: `${name} (7x7 Standart)`, format: '7x7', price_per_hour: 300000.0 });
  }
  if (document.getElementById('fmt11x11').checked) {
    pitches.push({ name: `${name} (11x11 Katta)`, format: '11x11', price_per_hour: 600000.0 });
  }

  // Image URLs
  const imgUrl = document.getElementById('newVenueImageUrl').value.trim() || FALLBACK_STADIUM_IMAGE;

  const payload = {
    name,
    address,
    city,
    lat,
    lon,
    owner_id: ownerId,
    primary_image_url: imgUrl,
    images: [imgUrl],
    pitches,
    facilities: { parking: true, shower: true, lighting: true },
  };

  try {
    const res = await authFetch(`${API_BASE}/venues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Stadion qo\'shishda xatolik');
    const data = await res.json();
    showToast(data.message || 'Yangi stadion muvaffaqiyatli saqlandi!');

    closeModal('modalAddVenue');
    loadVenues();
  } catch (err) {
    showToast(err.message, true);
  }
}

// Edit Venue Modal
function openEditVenueModal(venueId) {
  const venue = state.venues.find((v) => String(v.id) === String(venueId));
  if (!venue) return;

  const modal = document.getElementById('modalEditVenue');
  if (!modal) return;

  document.getElementById('editVenueId').value = venue.id;
  document.getElementById('editVenueName').value = venue.name;
  document.getElementById('editVenueAddress').value = venue.address;
  document.getElementById('editVenueCity').value = venue.city || 'Toshkent';

  modal.classList.add('active');
}

async function handleEditVenueSubmit(e) {
  e.preventDefault();
  const venueId = document.getElementById('editVenueId').value;
  const name = document.getElementById('editVenueName').value.trim();
  const address = document.getElementById('editVenueAddress').value.trim();
  const city = document.getElementById('editVenueCity').value.trim();

  try {
    const res = await authFetch(`${API_BASE}/venues/${venueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, address, city }),
    });
    if (!res.ok) throw new Error('Yangilashda xatolik');
    showToast('Stadion ma\'lumotlari muvaffaqiyatli yangilandi.');

    closeModal('modalEditVenue');
    loadVenues();
  } catch (err) {
    showToast(err.message, true);
  }
}

// Slots Calendar Grid Modal
async function openSlotsModal(venueId, venueName) {
  const modal = document.getElementById('modalSlotsCalendar');
  const title = document.getElementById('slotsModalTitle');
  const gridContainer = document.getElementById('slotsGridContent');
  if (!modal || !gridContainer) return;

  title.textContent = `${venueName} — Vaqt Slotlari Jadvali`;
  gridContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#94a3b8">Slotlar yuklanmoqda...</div>';
  modal.classList.add('active');

  try {
    const res = await authFetch(`${API_BASE}/venues/${venueId}/slots`);
    const data = await res.json();
    renderSlotsGrid(data.grid || []);
  } catch (err) {
    gridContainer.innerHTML = '<div style="padding:40px;text-align:center;color:#ef4444">Slotlarni yuklashda xatolik yuz berdi.</div>';
  }
}

function renderSlotsGrid(gridData) {
  const container = document.getElementById('slotsGridContent');
  if (!container) return;

  container.innerHTML = gridData
    .map((row) => {
      const s1 = row.slots[0] || { format: '5x5', status: 'available', price: 200000 };
      const s2 = row.slots[1] || { format: '7x7', status: 'available', price: 300000 };

      return `
      <div class="calendar-slot-grid">
        <div class="slot-time-col">${escapeHtml(row.time)}</div>
        <div class="slot-cell ${s1.status === 'available' ? 'slot-available' : 'slot-booked'}">
          <span>Maydon 1 (${s1.format})</span>
          <strong>${s1.status === 'available' ? 'Bo\'sh' : 'Band'}</strong>
        </div>
        <div class="slot-cell ${s2.status === 'available' ? 'slot-available' : 'slot-booked'}">
          <span>Maydon 2 (${s2.format})</span>
          <strong>${s2.status === 'available' ? 'Bo\'sh' : 'Band'}</strong>
        </div>
      </div>
      `;
    })
    .join('');
}

// Map View Modal
function openMapViewModal(venueId, venueName, lat, lon) {
  const modal = document.getElementById('modalMapView');
  const title = document.getElementById('mapModalTitle');
  if (!modal) return;

  title.textContent = `${venueName} — Xaritada Joylashuv`;
  modal.classList.add('active');

  setTimeout(() => {
    const mapDiv = document.getElementById('venueDetailMap');
    if (!mapDiv) return;

    if (state.activeVenueMap) {
      state.activeVenueMap.remove();
    }

    if (typeof L !== 'undefined') {
      state.activeVenueMap = L.map('venueDetailMap').setView([lat, lon], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
      }).addTo(state.activeVenueMap);

      L.marker([lat, lon]).addTo(state.activeVenueMap).bindPopup(`<b>${escapeHtml(venueName)}</b>`).openPopup();
    }
  }, 200);
}

// Delete Venue
async function deleteVenue(venueId) {
  if (!confirm('Rostdan ham ushbu stadionni o\'chirmoqchimisiz?')) return;

  try {
    const res = await authFetch(`${API_BASE}/venues/${venueId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('O\'chirishda xatolik');
    showToast('Stadion nofaol holatga o\'tkazildi.');
    loadVenues();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ─────────────────────────────────────────────────────────────
// 3. FOYDALANUVCHILAR & ROLLLAR (USERS & RBAC)
// ─────────────────────────────────────────────────────────────

async function loadUsers(query = '', role = '', isActive = '') {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  try {
    let url = `${API_BASE}/users?page=1&page_size=50`;
    if (query) url += `&query=${encodeURIComponent(query)}`;
    if (role) url += `&role=${encodeURIComponent(role)}`;
    if (isActive !== '') url += `&is_active=${isActive}`;

    const res = await authFetch(url);
    if (!res.ok) throw new Error('Foydalanuvchilar yuklanmadi');
    const data = await res.json();
    state.users = data.items || [];

    renderUsers(state.users);
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderUsers(users) {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state-box">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <p>Hozircha ro'yxatdan o'tgan foydalanuvchilar yo'q</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users
    .map((u) => {
      const initials = getInitials(u.full_name);
      const gradient = getAvatarGradient(u.full_name);

      return `
      <tr>
        <!-- User Info with Initials Avatar -->
        <td>
          <div class="user-cell">
            <div class="initials-avatar" style="background:${gradient};">
              ${initials}
            </div>
            <div class="user-text-info">
              <span class="user-name-title">${escapeHtml(u.full_name)}</span>
              <span class="user-phone-sub">${escapeHtml(u.phone_number || 'Telegram orqali')}</span>
            </div>
          </div>
        </td>

        <!-- Role Select Dropdown with Confirmation Dialog -->
        <td>
          <select class="role-select role-${u.role.toLowerCase()}" onchange="handleRoleChangeConfirm('${u.id}', '${escapeHtml(u.full_name)}', this.value, '${u.role.toLowerCase()}')">
            <option value="player" ${u.role === 'player' ? 'selected' : ''}>O'yinchi</option>
            <option value="owner" ${u.role === 'owner' ? 'selected' : ''}>Maydon Egasi</option>
            <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Administrator</option>
          </select>
        </td>

        <!-- Games & Rating -->
        <td><strong>${u.total_games || 0} ta</strong></td>
        <td>
          <span style="font-weight:700; color:#f59e0b;">★ ${u.rating || 5.0}</span>
        </td>

        <!-- Bookings & Venues -->
        <td>${u.role === 'owner' ? `${u.venues_count || 0} ta maydon` : `${u.bookings_count || 0} ta bron`}</td>

        <!-- Status Pill -->
        <td>
          <span class="status-pill ${u.is_active ? 'status-active' : 'status-banned'}">
            <span style="width:6px;height:6px;border-radius:50%;background:currentColor;"></span>
            ${u.is_active ? 'Faol' : 'Bloklangan'}
          </span>
        </td>

        <!-- Ban / Unban Button with Reason Dialog -->
        <td>
          <button class="btn-secondary" style="padding:6px 12px; font-size:0.78rem; ${u.is_active ? 'color:#ef4444;border-color:rgba(239,68,68,0.3);' : 'color:#10b981;border-color:rgba(16,185,129,0.3);'}" 
                  onclick="openBanModal('${u.id}', '${escapeHtml(u.full_name)}', ${u.is_active})">
            ${u.is_active ? 'Bloklash' : 'Faollashtirish'}
          </button>
        </td>
      </tr>
      `;
    })
    .join('');
}

function initUsersEvents() {
  // 300ms Debounce Live Search
  const searchInput = document.getElementById('searchUsersInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        const role = document.getElementById('filterUserRole').value;
        const status = document.getElementById('filterUserStatus').value;
        loadUsers(e.target.value.trim(), role, status);
      }, 300);
    });
  }

  // Filter Dropdowns
  const roleSelect = document.getElementById('filterUserRole');
  const statusSelect = document.getElementById('filterUserStatus');
  if (roleSelect && statusSelect) {
    const handleFilterChange = () => {
      const q = searchInput ? searchInput.value.trim() : '';
      loadUsers(q, roleSelect.value, statusSelect.value);
    };
    roleSelect.addEventListener('change', handleFilterChange);
    statusSelect.addEventListener('change', handleFilterChange);
  }
}

// Role Change Confirmation Modal
function handleRoleChangeConfirm(userId, userName, newRole, oldRole) {
  const roleLabels = { player: 'Oddiy O\'yinchi (PLAYER)', owner: 'Maydon Egasi (OWNER)', admin: 'Administrator (ADMIN)' };

  const message = `Siz rostdan ham "${userName}" foydalanuvchisiga ${roleLabels[newRole]} huquqini bermoqchimisiz?`;
  if (!confirm(message)) {
    // Revert selection
    loadUsers();
    return;
  }

  updateUserRole(userId, newRole);
}

async function updateUserRole(userId, newRole) {
  try {
    const res = await authFetch(`${API_BASE}/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) throw new Error('Rolni o\'zgartirishda xatolik');
    const data = await res.json();
    showToast(data.message || 'Foydalanuvchi roli muvaffaqiyatli yangilandi.');
    loadUsers();
  } catch (err) {
    showToast(err.message, true);
    loadUsers();
  }
}

// Ban / Unban Modal Dialog
function openBanModal(userId, userName, currentIsActive) {
  if (!currentIsActive) {
    // Agar allaqachon bloklangan bo'lsa -> To'g'ridan-to'g'ri faollashtirish
    if (confirm(`"${userName}" hisobini qayta faollashtirmoqchimisiz?`)) {
      updateUserStatus(userId, true, '');
    }
    return;
  }

  // Bloklash oynasini ochish
  const modal = document.getElementById('modalBanUser');
  if (!modal) return;

  document.getElementById('banUserId').value = userId;
  document.getElementById('banUserNameText').textContent = userName;
  document.getElementById('banReasonInput').value = '';

  modal.classList.add('active');
}

async function handleBanFormSubmit(e) {
  e.preventDefault();
  const userId = document.getElementById('banUserId').value;
  const reason = document.getElementById('banReasonInput').value.trim() || 'Qoidabuzarlik uchun';

  closeModal('modalBanUser');
  await updateUserStatus(userId, false, reason);
}

async function updateUserStatus(userId, isActive, reason) {
  try {
    const res = await authFetch(`${API_BASE}/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: isActive, reason }),
    });
    if (!res.ok) throw new Error('Holatni o\'zgartirishda xatolik');
    const data = await res.json();
    showToast(data.message || 'Foydalanuvchi holati yangilandi.');
    loadUsers();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ─────────────────────────────────────────────────────────────
// 4. MOLIYA & TO'LOVLAR (FINANCE & TRANSACTIONS)
// ─────────────────────────────────────────────────────────────

async function loadTransactions() {
  const tbody = document.getElementById('financeTableBody');
  if (!tbody) return;

  try {
    const res = await authFetch(`${API_BASE}/finance/transactions`);
    if (!res.ok) throw new Error('Tranzaksiyalar yuklanmadi');
    const data = await res.json();
    state.transactions = data.items || [];

    // Financial Overview Cards
    const totalRevEl = document.getElementById('financeTotalRev');
    if (totalRevEl) totalRevEl.textContent = `${Number(data.total_revenue_uzs || 0).toLocaleString()} UZS`;

    const totalCountEl = document.getElementById('financeTotalCount');
    if (totalCountEl) totalCountEl.textContent = data.total || 0;

    renderTransactions(state.transactions);
  } catch (err) {
    showToast(err.message, true);
  }
}

function renderTransactions(txs) {
  const tbody = document.getElementById('financeTableBody');
  if (!tbody) return;

  if (txs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state-box">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.6"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <p>Hozircha moliyaviy tranzaksiyalar mavjud emas</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = txs
    .map((tx) => {
      const isCompleted = tx.status === 'COMPLETED' || tx.status === 'CONFIRMED';
      const isRefunded = tx.status === 'REFUNDED';

      return `
      <tr style="cursor:pointer;" onclick="openTransactionInspector('${tx.id}')">
        <!-- Transaction ID -->
        <td>
          <span style="font-family:'JetBrains Mono', monospace; font-weight:700; color:#059669;">
            ${escapeHtml(tx.transaction_id)}
          </span>
        </td>

        <!-- Client Name -->
        <td>
          <div style="display:flex;flex-direction:column;">
            <strong style="color:var(--text-main);">${escapeHtml(tx.user_name)}</strong>
            <span style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml(tx.user_phone || '-')}</span>
          </div>
        </td>

        <!-- Stadium & Pitch -->
        <td>
          <div style="display:flex;flex-direction:column;">
            <span>${escapeHtml(tx.venue_name)}</span>
            <span style="font-size:0.78rem;color:var(--text-muted);">${escapeHtml(tx.slot_time)}</span>
          </div>
        </td>

        <!-- Platform 10,000 UZS Service Fee -->
        <td>
          <span style="font-weight:800; color:var(--text-main);">
            ${Number(tx.service_fee).toLocaleString()} UZS
          </span>
        </td>

        <!-- Provider -->
        <td>
          <span style="font-weight:700; text-transform:uppercase; font-size:0.8rem; color:var(--text-secondary);">
            ${escapeHtml(tx.provider)}
          </span>
        </td>

        <!-- Status -->
        <td>
          <span class="status-pill ${isCompleted ? 'status-completed' : isRefunded ? 'status-refunded' : 'status-banned'}">
            ${isCompleted ? 'Muvaffaqiyatli' : isRefunded ? 'Qaytarilgan' : escapeHtml(tx.status)}
          </span>
        </td>

        <!-- Action: Refund button for canceled games -->
        <td onclick="event.stopPropagation();">
          ${
            !isRefunded
              ? `
            <button class="btn-secondary" style="padding:6px 12px;font-size:0.78rem;color:#d97706;border-color:rgba(217,119,6,0.3);"
                    onclick="handleManualRefund('${tx.booking_id}', '${escapeHtml(tx.transaction_id)}')">
              Qaytarish
            </button>
          `
              : '<span style="font-size:0.78rem;color:#94a3b8;">Qaytarildi</span>'
          }
        </td>
      </tr>
      `;
    })
    .join('');
}

function initFinanceEvents() {
  // Export to Excel / CSV Button
  const exportBtn = document.getElementById('btnExportFinance');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        showToast('Moliyaviy hisobot yuklab olinmoqda (Excel/CSV)...');
        const res = await authFetch(`${API_BASE}/finance/export`);
        if (!res.ok) throw new Error('Yuklab olishda xatolik');
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sportplus_finance_${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }

  // Filter Search
  const searchInput = document.getElementById('searchFinanceInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = state.transactions.filter(
        (t) =>
          t.transaction_id.toLowerCase().includes(q) ||
          t.user_name.toLowerCase().includes(q) ||
          t.venue_name.toLowerCase().includes(q)
      );
      renderTransactions(filtered);
    });
  }
}

// Transaction Inspector Modal
function openTransactionInspector(txnId) {
  const tx = state.transactions.find((t) => String(t.id) === String(txnId));
  if (!tx) return;

  const modal = document.getElementById('modalTransactionInspector');
  if (!modal) return;

  document.getElementById('inspTxId').textContent = tx.transaction_id;
  document.getElementById('inspClient').textContent = `${tx.user_name} (${tx.user_phone || 'Tel ko\'rsatilmagan'})`;
  document.getElementById('inspVenue').textContent = tx.venue_name;
  document.getElementById('inspPitch').textContent = tx.pitch_name;
  document.getElementById('inspSlot').textContent = tx.slot_time;
  document.getElementById('inspTotalAmount').textContent = `${Number(tx.amount).toLocaleString()} UZS`;
  document.getElementById('inspServiceFee').textContent = `${Number(tx.service_fee).toLocaleString()} UZS (Platforma)`;
  document.getElementById('inspProvider').textContent = tx.provider.toUpperCase();
  document.getElementById('inspStatus').textContent = tx.status;
  document.getElementById('inspDate').textContent = new Date(tx.created_at).toLocaleString();

  modal.classList.add('active');
}

// Manual Refund Action (10,000 UZS)
async function handleManualRefund(bookingId, transactionId) {
  const reason = prompt(`"${transactionId}" uchun 10,000 UZS platforma to'lovini qaytarish sababini kiriting:`, 'Mijoz talabiga ko\'ra bekor qilindi');
  if (reason === null) return;

  try {
    const res = await authFetch(`${API_BASE}/finance/refund/${bookingId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error('Qaytarishda xatolik yuz berdi');
    const data = await res.json();
    showToast(data.message || '10,000 UZS servis to\'lovi muvaffaqiyatli qaytarildi.');

    loadTransactions();
  } catch (err) {
    showToast(err.message, true);
  }
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('active');
}

function getInitials(name) {
  if (!name) return 'SP';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getAvatarGradient(name) {
  const gradients = [
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #0f172a, #334155)',
  ];
  let hash = 0;
  for (let i = 0; i < (name || '').length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
