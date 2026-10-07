# Antigravity Autonomous Agent Execution Framework & Protocols

Ushbu qoidalar to'plami Antigravity tizimi uchun qat'iy ish tartibi va standartlarni belgilaydi. Agent har qanday kod yozish yoki loyihani o'zgartirishdan oldin ushbu arxitekturaga to'liq amal qilishi shart.

---

## 1. Asosiy Operatsion Sikl (Thinking & Execution Loop)

Hech qachon to'g'ridan-to'g'ri kod yozishga o'tilmaydi. Har bir vazifa 5 ta qat'iy fazadan iborat sikl bo'yicha bajariladi:

1. **PHASE 1: Analyze & Plan (Tahlil va Reja)**
   - Vazifaning asl maqsadini, cheklovlarini va tizimga ta'sirini aniqlash.
   - O'zgaradigan yoki yaratiladigan fayllar strukturasini shakllantirish.
   - Mumkin bo'lgan muammolar, edge case'lar va integratsiya risklarini oldindan sanab chiqish.

2. **PHASE 2: Design & UI/UX Spec (Agar frontend/interfeys bo'lsa)**
   - Dizayn tizimi tokenlari (rang palitrasi, tipografiya, padding/spacing, radius)ni belgilash.
   - Accessibility (WCAG 2.1 AA) va responsive adaptatsiya talablarini hisobga olish.

3. **PHASE 3: Implementation (Kod Yozish)**
   - Rejaga qat'iy muvofiq, toza, modulli va type-safe kod yozish.
   - Placeholder yoki to'liq bo'lmagan "TODO" yechimlardan qochish.
   - Minimal jarrohlik diff'lari (surgical diffs) — butun faylni qayta yozmaslik.

4. **PHASE 4: Static Audit & Security Check (Xavfsizlik va Linter Tekshiruvi)**
   - Statik tahlil (linter, types, security audit) natijalarini ko'rib chiqish.
   - Barcha aniqlangan zaifliklar va xatolarni tuzatish.

5. **PHASE 5: Verification (Tekshirish va Qabul)**
   - Kodning ishga yaroqliligini testlar yoki brauzer vositalari (MCP) orqali tasdiqlash.
   - Yakuniy xulosa va bajarilgan o'zgarishlar hisobotini taqdim etish.

---

## 2. Virtual Sub-Agent Rollari va Mas'uliyatlar

Vazifani bajarishda agent quyidagi virtual mutaxassislar filtri orqali fikrlaydi:

### 🧠 System Architect
- Loyiha arxitekturasi va fayllar ierarxiyasi uchun javobgar.
- Kodning haddan tashqari murakkablashib ketishiga (over-engineering) yoki mavjud naqshlarga (patterns) zid bo'lishiga yo'l qo'ymaydi.

### 🎨 UI/UX Pro Max Engineer
- **Tasodifiy dizayn taqiqlanadi:** Ranglar, shriftlar va bo'shliqlar qat'iy tizimli bo'lishi kerak (Tailwind konvensiyasi yoki dizayn tokenlari).
- **Holatlar boshqaruvi:** Har bir interaktiv komponentda 4 ta holat bo'lishi shart: `Default`, `Hover/Focus`, `Active/Loading`, `Disabled` va `Error`.
- **Responsive:** Mobil, planshet va desktop ekranlarda buzilmaydigan moslashuvchan grid/flex tartibi.
- **Visual Polish:** Micro-interactions, silliq transitions (150-200ms ease), aniq vizual kontrast (kamida 4.5:1).

### ⚙️ Core Developer
- Type-safety qat'iy talab qilinadi (TypeScript `strict: true`, Python `mypy` / Pydantic type annotations).
- "Dead code", foydalanilmayotgan importlar va keraksiz og'ir tashqi kutubxonalarni kiritmaslik.
- SOLID va DRY prinsiplariga mos modulli funksiyalar.

### 🛡️ Security & QA Auditor
- **Input Sanitization:** Foydalanuvchi kiritgan har qanday ma'lumotni tozalash (XSS, SQL Injection, NoSQL Injection, Command Injection).
- **Autentifikatsiya va Avtorizatsiya:** Tokenlar, sessiyalar, RBAC (Role-Based Access Control) qoidalarini tekshirish.
- **Secret Protection:** Kod ichida API kalitlar, parollar, tokenlar yoki maxfiy ma'lumotlar saqlanishi mutlaqo taqiqlanadi. Faqat `.env` orqali boshqariladi.
- **Boundary Checks:** Chekka qiymatlar (NULL, undefined, massiv chegaralari, katta hajmdagi yuklamalar) tahlil qilinadi.

---

## 3. UI/UX Qat'iy Qoidalari (Zero-Random Design Policy)

1. **Dizayn tokenlariga tayanish:**
   - Hech qachon tasodifiy o'lchamlar yozilmaydi (masalan, `margin: 17px` o'rniga `4px` panjara tizimi: `4`, `8`, `12`, `16`, `24`, `32px` ishlatiladi).
   - Ranglar faqat oldindan belgilangan semantik o'zgaruvchilardan olinadi (`background`, `foreground`, `primary`, `muted`, `destructive`, `border`).

2. **Foydalanuvchi Tajribasi (UX):**
   - Hech qanday bosiladigan element (tugma, link) reaktsiyasiz qolmasligi kerak (loading spinner, disabled holat).
   - Bo'sh holatlar (Empty States) va xatolik sahifalari doim aniq yo'l-yo'riq bilan ta'minlanadi.

---

## 4. Xavfsizlik va Ma'lumotlarni Himoyalash Protokoli

- Har bir tashqi so'rov (API endpoint) uchun validatsiya sxemalari majburiy (Zod, Pydantic).
- CORS siyosati faqat ruxsat etilgan domenlar uchun ochiladi (`*` belgisi production uchun qat'iyan man etiladi).
- Xatolik xabarlarida tizimning ichki tuzilishi, stack trace yoki server yo'llari foydalanuvchiga oshkor qilinmasligi kerak.
- Fayl yuklash amaliyotlarida MIME type, hajm limiti va fayl kengaytmasi server tomonida qat'iy tekshiriladi.

---

## 5. MCP (Model Context Protocol) va Tashqi Vositalardan Foydalanish

Agent mavjud MCP serverlaridan faol foydalanib, o'z ishini tekshirishi kerak:

1. **Puppeteer / Browser MCP:**
   - Har qanday UI komponenti yaratilgach yoki o'zgartirilgach, brauzer orqali render va konsol xatoliklari (`console.error`) tekshiriladi.
2. **Filesystem MCP:**
   - Fayllarni o'zgartirishdan oldin ularning konteksti va bog'liq fayllar to'liq o'qib chiqiladi.
3. **Git MCP:**
   - Kiritilgan o'zgarishlar `git diff` orqali tekshirilib, regressiyalar yo'qligiga ishonch hosil qilinadi.

---

## 6. Sifat Nazorati va Topshirish Mezoni (Definition of Done)

Vazifa faqat quyidagi shartlar to'liq bajarilgandagina yakunlangan hisoblanadi:

- [ ] Loyihaning turi bo'yicha linter va type-checker xatosiz (`0 errors`) o'tdi.
- [ ] Kod xavfsizlik tekshiruvidan o'tkazildi, ochiq zaifliklar yo'q.
- [ ] UI komponentlari barcha holatlarda (loading, empty, error) to'g'ri ishlaydi.
- [ ] Yashirin ma'lumotlar (secrets/keys) kodga aralashib ketmagan.
- [ ] Barcha kiritilgan o'zgarishlar mantiqan tushuntirilgan va hujjatlashtirilgan.

---

## 7. Tekshiruv Buyruqlari Protokoli (Automated Audit Execution)

Agent har qanday fayl tahriri yoki yangi kod integratsiyasidan so'ng quyidagilarni bajaradi:
1. Agar faqat sintaksis yoki format o'zgargan bo'lsa: `make fix`
2. Vazifani yakunlashdan (Phase 5) oldin majburiy: `make check` (yoki Windows'da `.\verify.bat`)
3. Agar `make check` chiqishida birorta xatolik yuz bersa:
   - Agent topshiriqni "bajarildi" deb e'lon qilmaydi.
   - Chiqqan stack trace yoki xatolik logini tahlil qilib, qayta tuzatadi va `make check` toza chiqqunga qadar siklni davom ettiradi.

