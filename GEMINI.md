# SPORT+ Loyihasi — Antigravity Agent Qoidalari

## Loyiha Haqida

**SPORT+** — Toshkent va Jizzax bo'yicha futbol maydonlari bron qilish platformasi.

**Stack:**
- Backend: FastAPI + SQLAlchemy (async) + PostgreSQL (PostGIS + btree_gist) + Render
- Mobile: React Native + Expo (TypeScript)
- Auth: Telegram OTP bot (`@sport_plus_uz_bot`)
- Deploy: `https://sport-jmu3.onrender.com`

---

## 🧠 Agent Operating Directive (Claude Reasoning Pattern)

Har bir topshiriqni bajarishda quyidagi chuqur fikrlash va qat'iy agentlik tamoyillariga amal qilinadi:

1. **Think Before You Act (Scratchpad / CoT)**:
   - Hech qachon asossiz kod yozmang yoki vositalarni ko'r-ko'rona ishga tushirmang.
   - Avval mavjud arxitekturani tahlil qiling (FastAPI backend, Expo/React Native mobile, Vite/React admin-web, Supabase PostgreSQL).
   - Fikrlash (thinking) bloki ichida bosqichma-bosqich gipoteza va rejani aniqlang.

2. **Minimal Surgical Diffs (Preserve Existing Code)**:
   - 5-10 qator o'zgarish uchun butun faylni qayta yozib tashlamang.
   - Mavjud konfiguratsiyalar, kommentlar, docstringlar va uslublarni saqlang.
   - Faqat nishonga olingan aniq diff / almashtirishlarni qo'llang.

3. **Autonomous Verification Loop (O'z-o'zini Tekshirish)**:
   - Backend yoki DB o'zgarganda: `python -m py_compile` bilan sintaksis tekshiring, loglarni ko'ring.
   - Frontend o'zgarganda: `tsc` / `npm run build` bilan tekshiring.
   - Agar xatolik (500, fetch failed, syntax error) yuz bersa, foydalanuvchidan so'ramasdan o'zingiz ildiz sababini aniqlab avtonom tuzating.

4. **Lakonik va Texnik Aloqa**:
   - Ortiqcha gaplarsiz, aniq texnik natijalar va fayl havolalari bilan javob bering.

---

## Sub-Agent Ishlatish Qoidalari

Bu loyihada quyidagi sub-agent skilllardan foydalaning (`~/.gemini/config/skills/agents/`):

| Vaziyat | Agent |
|---|---|
| Yangi feature request | Avval `agent-planner` ni o'qing |
| Yangi modul yoki DB schema | Avval `agent-architect` ni o'qing |
| Kod yozilgandan keyin | Avtomatik `agent-code-reviewer` |
| Auth / payment / API kod | Avtomatik `agent-security-reviewer` |
| Bug fix yoki yangi feature | `agent-tdd` bilan test yozing |
| Eski kodni tozalash | `agent-refactor` |

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
