.PHONY: help install dev dev-docker test build migrate seed clean logs lint typecheck db-shell redis-shell

# Default target
.DEFAULT_GOAL := help

# Colors for help output
CYAN := \033[36m
RESET := \033[0m

## help: Show this help message
help:
	@echo ""
	@echo "Credit System - Available Commands"
	@echo "==================================="
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //' | awk -F': ' '{printf "  $(CYAN)%-15s$(RESET) %s\n", $$1, $$2}'
	@echo ""

## install: Install all dependencies
install:
	pnpm install

## dev: Start local development (without Docker)
dev:
	pnpm dev

## dev-docker: Start all services with Docker Compose
dev-docker:
	docker compose up --build

## test: Run all tests
test:
	pnpm test

## build: Build all packages and apps
build:
	pnpm build

## migrate: Run database migrations
migrate:
	pnpm --filter @credit-system/backend migrate

## seed: Seed the database with test data
seed:
	pnpm --filter @credit-system/backend seed

## clean: Remove all build artifacts, dependencies, and Docker volumes
clean:
	pnpm clean
	docker compose down -v --remove-orphans 2>/dev/null || true
	rm -rf node_modules apps/*/node_modules packages/*/node_modules

## logs: Tail Docker Compose logs
logs:
	docker compose logs -f

## lint: Run linting across all packages
lint:
	pnpm lint

## typecheck: Run TypeScript type checking across all packages
typecheck:
	pnpm typecheck

## db-shell: Open a psql shell to the database
db-shell:
	docker compose exec postgres psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-credit_system}

## redis-shell: Open a redis-cli shell
redis-shell:
	docker compose exec redis redis-cli
