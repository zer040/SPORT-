# SPORT+ Loyihasi — Antigravity Agent Qoidalari

## Loyiha Haqida

**SPORT+** — Toshkent va Jizzax bo'yicha futbol maydonlari bron qilish platformasi.

**Stack:**
- Backend: FastAPI + SQLAlchemy (async) + PostgreSQL (PostGIS + btree_gist) + Render
- Mobile: React Native + Expo (TypeScript)
- Auth: Telegram OTP bot (`@sport_plus_uz_bot`)
- Deploy: `https://sport-production-c0d6.up.railway.app` (Railway 24/7)

---

## 🧠 Antigravity Autonomous Agent Execution Framework & Protocols (Claude Reasoning Pattern)

Har bir topshiriqni bajarishda quyidagi 5 bosqichli operatsion sikl va qat'iy standartlarga amal qilinadi:

### 1. Asosiy Operatsion Sikl (Thinking & Execution Loop)
1. **PHASE 1: Analyze & Plan (Tahlil va Reja)**:
   - Vazifaning asl maqsadini, cheklovlarini va tizimga ta'sirini aniqlash.
   - O'zgaradigan yoki yaratiladigan fayllar strukturasini shakllantirish.
   - Mumkin bo'lgan muammolar, edge case'lar va integratsiya risklarini oldindan sanab chiqish.
2. **PHASE 2: Design & UI/UX Spec (Agar frontend/interfeys bo'lsa)**:
   - Dizayn tizimi tokenlari (rang palitrasi, tipografiya, padding/spacing, radius)ni belgilash.
   - Accessibility (WCAG 2.1 AA) va responsive adaptatsiya talablarini hisobga olish.
3. **PHASE 3: Implementation (Minimal Jarrohlik Diff)**:
   - Rejaga qat'iy muvofiq, toza, modulli va type-safe kod yozish.
   - Minimal surgical diffs (5-10 qator uchun butun faylni qayta yozmaslik).
   - Placeholder yoki to'liq bo'lmagan "TODO" yechimlardan qochish.
4. **PHASE 4: Static Audit & Security Check (Xavfsizlik va Linter)**:
   - Statik tahlil (linter, types, security audit) natijalarini ko'rib chiqish.
   - Injection (SQL/XSS), CORS, Auth, Input Sanitization, Secret Leakage tekshirish.
5. **PHASE 5: Verification (O'z-o'zini Tekshirish)**:
   - Backend/DB: `python -m py_compile` bilan sintaksis tekshirish, loglarni ko'rish.
   - Frontend: `tsc` / `npm run build` bilan tekshirish.
   - Agar xatolik (500, fetch failed, syntax error) yuz bersa, avtonom tuzatish.

---

## Virtual Sub-Agent Rollari va Mas'uliyatlar

Vazifani bajarishda agent quyidagi virtual mutaxassislar filtri orqali fikrlaydi:

| Sub-Agent | Mas'uliyati | Qoidasi |
|---|---|---|
| **Architect & Planner** | Muammoni dekonstruktsiya qilish, fayllar strukturasini belgilash | Hech qanday kod yozmaydi, faqat algoritm va reja tuzadi. |
| **UI/UX Specialist** | Design System, CSS/Tailwind, komponentlar iyerarxiyasi | Hech qachon "taxminiy" padding/rang ishlatmaydi, tizimli dizayn tokenlariga tayanadi. |
| **Core Dev** | Asosiy backend/frontend mantiqini yozish | Rejaga qat'iy amal qiladi, type-safe, toza kod. |
| **Security & QA Auditor** | Zaifliklar, chekka holatlar (edge cases) va xatolarni tekshirish | Kodni sindirishga (pen-test, boundary check) harakat qiladi. |

---

## Loyiha Arxitekturasi

```
SPORT-/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI routers
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── core/         # DB, config, deps
│   │   └── main.py       # App entry + lifespan
│   └── requirements.txt
└── mobile/
    ├── App.tsx           # Main app + all screens
    ├── components/       # Reusable components
    ├── constants/
    │   └── theme.ts      # Design tokens (LIGHT MODE)
    └── services/
        └── api.ts        # API_URL + Api class
```

---

## Muhim Qoidalar

### Backend
1. Barcha DB operatsiyalar `async/await` bilan
2. Endpoint response modellari Pydantic schema bilan
3. Auth: `get_current_user` dependency injectiondan foydalaning
4. Migration: alembic (hali yo'q, `Base.metadata.create_all` ishlatilmoqda)
5. PostGIS va btree_gist extension `main.py` lifespan da yoqiladi

### Mobile
1. Barcha API chaqiruvlar `services/api.ts` ichida `Api` klassida
2. Theme: `constants/theme.ts` dan foydalaning — **LIGHT MODE** (hech qachon dark reng qo'shmang)
3. `contentContainerStyle={{ paddingBottom: 120 }}` — TabBar ostida kontent ko'rinmasin
4. BottomNav `position: absolute` emas — endi iOS TabBar uslubida

### Git va Deploy
- Branch: `main` → Render'ga avtomatik deploy
- Render URL: `https://sport-jmu3.onrender.com`
- Muhim: Push oldidan `python -m py_compile` bilan sintaksis tekshiring

---

## Tez-tez Ishlatilgan Buyruqlar

```powershell
# Backend lokal test
cd backend && uvicorn app.main:app --reload

# Mobile
cd mobile && npx expo start --tunnel

# Git push
git add . && git commit -m "feat: ..." && git push origin main
```
