# egosearchX 開発用タスク集
# 検証順は docs/implementation-plan.md 6章に合わせる: typecheck -> test -> lint -> build

.DEFAULT_GOAL := help

.PHONY: help install dev build start typecheck test test-watch lint format format-check check clean

help: ## コマンド一覧を表示する
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-14s %s\n", $$1, $$2}'

install: ## 依存パッケージを導入する（npm ci）
	npm ci

dev: ## 開発サーバーを起動する
	npm run dev

build: ## 静的書き出し（out/）を生成する
	npm run build

start: ## ビルド結果を起動する
	npm run start

typecheck: ## 型チェック
	npm run typecheck

test: ## テストを1回実行する
	npm test

test-watch: ## テストを監視モードで実行する
	npm run test:watch

lint: ## ESLint
	npm run lint

format: ## Prettier で整形する
	npm run format

format-check: ## Prettier の整形チェック
	npm run format:check

check: typecheck test lint build ## 検証一式（typecheck -> test -> lint -> build）

clean: ## 生成物（out/、.next/、tsbuildinfo）を削除する
	rm -rf out .next tsconfig.tsbuildinfo
