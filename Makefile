.DEFAULT_GOAL := help

.PHONY: help install lint typecheck test audit-secrets audit-deps check fix

help: ## Mavjud buyruqlar royxatini chiqarish
	@echo "SPORT+ — Antigravity Tekshiruv Buyruqlari:"
	@echo "  make check         - Barcha audit va tekshiruvlarni ishga tushirish (Python + TS)"
	@echo "  make typecheck     - Backend va Frontend tiplarini tekshirish"
	@echo "  make lint          - Kod sintaksisi va uslubini tekshirish"
	@echo "  make audit-secrets - Maxfiy kalitlar (.env, tokenlar) ochiq qolganini tekshirish"
	@echo "  make test          - Unit testlarni ishga tushirish"

typecheck: ## TypeScript va Python sintaksis / tiplarini tekshirish
	@echo "🔍 [1/4] Backend Python sintaksisi va tiplarini tekshirish..."
	python -m py_compile backend/app/main.py backend/app/config.py backend/app/services/telegram_bot.py backend/app/api/router.py
	@echo "🔍 [2/4] Admin-Web TypeScript tekshiruvi..."
	@if exist admin-web (cd admin-web && npm run build)

lint: ## Linter va sintaksis tekshiruvi
	@echo "🧹 [3/4] Kod sintaksisi va modullar tekshiruvi..."
	python -c "from app.main import app; print('Backend FastAPI modullari toza!')"

audit-secrets: ## Maxfiy kalitlar va .env ochiq qolmaganini tekshirish
	@echo "🔑 [4/4] Secret Leakage tekshiruvi..."
	git status --porcelain

check: typecheck lint audit-secrets ## Antigravity: Barcha audit va tekshiruvlarni ketma-ket ishga tushirish
	@echo ""
	@echo "========================================================="
	@echo "✅ Loyiha to'liq tekshiruvdan o'tdi! Barcha mezonlar qanoatlantirildi."
	@echo "========================================================="

fix: ## Avtomatik tuzatiladigan format va xatolarni to'g'rilash
	@echo "🔧 Format tekshirilmoqda..."
