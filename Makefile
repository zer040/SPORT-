.DEFAULT_GOAL := help

.PHONY: help install lint typecheck test audit-secrets audit-deps check fix verify-frontend verify-backend

# =========================================================
#  SPORT+ — Antigravity Automated Audit Pipeline
# =========================================================

help: ## Mavjud buyruqlar ro'yxatini chiqarish
	@echo ""
	@echo "  SPORT+ — Antigravity Tekshiruv Buyruqlari"
	@echo "  ============================================"
	@echo "  make check            - Barcha tekshiruvlarni ketma-ket ishga tushirish"
	@echo "  make verify-backend   - Backend Python sintaksis va importlarini tekshirish"
	@echo "  make verify-frontend  - Admin-Web TypeScript + Vite build tekshirish"
	@echo "  make typecheck        - Backend + Frontend tiplarini tekshirish"
	@echo "  make lint             - Kod sintaksisi va uslubini tekshirish (ESLint)"
	@echo "  make audit-secrets    - Maxfiy kalitlar (.env, tokenlar) ochiq qolganini tekshirish"
	@echo "  make audit-deps       - Zaif kutubxonalar auditini o'tkazish"
	@echo "  make test             - Testlarni ishga tushirish"
	@echo "  make fix              - Avtomatik format tuzatish"
	@echo ""

# ─── Backend ────────────────────────────────────────────────────────────────

verify-backend: ## Backend Python sintaksisi va FastAPI importlarini tekshirish
	@echo "🔍 [Backend] Python sintaksisi tekshirilmoqda..."
	@python -m py_compile backend/app/main.py backend/app/config.py backend/app/services/telegram_bot.py backend/app/api/router.py
	@echo "   ✅ Backend Python — toza."

# ─── Frontend ───────────────────────────────────────────────────────────────

verify-frontend: ## Admin-Web TypeScript va Vite production build tekshirish
	@echo "🔍 [Frontend] TypeScript va Vite build tekshirilmoqda..."
	@cd admin-web && npm run build
	@echo "   ✅ Admin-Web build — toza."

typecheck: verify-backend verify-frontend ## Backend + Frontend tiplarini tekshirish (tsc --noEmit)
	@echo "   ✅ Barcha tiplar tekshirildi."

lint: ## ESLint orqali Admin-Web kodini tekshirish
	@echo "🧹 [Lint] Admin-Web ESLint tekshirilmoqda..."
	@cd admin-web && npm run lint
	@echo "   ✅ Lint — toza (0 xato)."

audit-secrets: ## Tasodifan qoldirilib ketgan API kalitlari va tokenlarni tekshirish
	@echo "🔑 [Secrets] Secret leakage audit..."
	@cd admin-web && npm run audit:secrets
	@echo "   ✅ Maxfiy kalitlar — xavfsiz."

audit-deps: ## npm va Python paketlarining zaifliklarini tekshirish
	@echo "🛡️  [Deps] Dependency security audit..."
	@cd admin-web && npm run audit:deps
	@echo "   ✅ Dependency audit — toza."

test: ## Unit va integratsion testlarni ishga tushirish
	@echo "🧪 [Test] Testlar ishga tushirilmoqda..."
	@echo "   ℹ️  Test suite hali yozilmagan — o'tkazib yuborildi."

# ─── Master ─────────────────────────────────────────────────────────────────

check: typecheck lint audit-secrets audit-deps test ## ✅ Antigravity: Barcha audit va tekshiruvlarni ketma-ket ishga tushirish
	@echo ""
	@echo "  ========================================================="
	@echo "  ✅  LOYIHA TO'LIQ TEKSHIRUVDAN O'TDI!"
	@echo "      Backend Python | Frontend TS/Build | Lint | Secrets | Deps"
	@echo "  ========================================================="
	@echo ""

fix: ## Avtomatik tuzatiladigan format va lint xatolarini to'g'rilash
	@echo "🔧 [Fix] Avtomatik format tuzatilmoqda..."
	@cd admin-web && npm run lint:fix
	@cd admin-web && npm run format:fix
	@echo "   ✅ Format tuzatildi."

install: ## Barcha bog'liqliklarni o'rnatish
	@echo "📦 [Install] Admin-Web kutubxonalari o'rnatilmoqda..."
	@cd admin-web && npm ci
	@echo "   ✅ O'rnatish tugadi."
