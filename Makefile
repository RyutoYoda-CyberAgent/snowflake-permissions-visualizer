.PHONY: install setup run clean help

# デフォルトターゲット
help:
	@echo "Snowflake Permissions Visualizer"
	@echo ""
	@echo "使用方法:"
	@echo "  make setup    - 初回セットアップ（仮想環境作成、依存関係インストール、.env作成）"
	@echo "  make run      - アプリケーション起動（データ取得 + Webサーバー起動）"
	@echo "  make install  - 依存関係のみインストール"
	@echo "  make clean    - 仮想環境と生成ファイルを削除"
	@echo ""
	@echo "初回:"
	@echo "  1. make setup"
	@echo "  2. .envファイルを編集（SNOWFLAKE_USER, SNOWFLAKE_ACCOUNTを設定）"
	@echo "  3. make run"

# 初回セットアップ
setup:
	@echo "初回セットアップを開始..."
	python3 -m venv venv
	./venv/bin/pip install -r requirements.txt
	@if [ ! -f .env ]; then \
		cp .env.sample .env; \
		echo ".envファイルを作成しました"; \
		echo "WARNING: .envファイルを編集してSnowflake接続情報を設定してください"; \
	else \
		echo ".envファイルは既に存在します"; \
	fi
	@echo "セットアップ完了"

# 依存関係インストール
install:
	@echo "依存関係をインストール中..."
	./venv/bin/pip install -r requirements.txt
	@echo "インストール完了"

# アプリケーション実行
run:
	@echo "Snowflake Permissions Visualizer を起動中..."
	@if [ ! -f .env ]; then \
		echo "ERROR: .envファイルが見つかりません"; \
		echo "       make setup を実行してください"; \
		exit 1; \
	fi
	@if [ ! -d venv ]; then \
		echo "ERROR: 仮想環境が見つかりません"; \
		echo "       make setup を実行してください"; \
		exit 1; \
	fi
	@echo "Snowflakeからデータを取得中..."
	@set -a; . ./.env; set +a; ./venv/bin/python fetch_permissions.py
	@echo "Webサーバーを起動中..."
	@echo "http://localhost:8080 でアクセスできます"
	@echo "停止するには Ctrl+C を押してください"
	@python3 -m http.server 8080

# クリーンアップ
clean:
	@echo "クリーンアップ中..."
	rm -rf venv/
	rm -f permissions_data.json
	rm -f permissions_backup_*.json
	rm -f server.log
	@echo "クリーンアップ完了"