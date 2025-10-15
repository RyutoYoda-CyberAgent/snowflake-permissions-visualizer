# Snowflake Permissions Visualizer

Snowflakeの権限（ロール、ユーザー、テーブル権限）をインタラクティブなD3.jsマップで可視化するWebアプリケーションです。

## 機能

- **インタラクティブな権限マップ**: D3.jsを使用したドラッグ&ドロップ可能な権限関係図
- **フィルタリング**: ユーザー、ロール、テーブル別の表示切り替え
- **検索機能**: ノード名による絞り込み検索
- **フォーカス表示**: 選択したノードに関連する権限のみを表示
- **ダークテーマ**: 見やすい黒ベースのデザイン
- **データエクスポート**: 権限データのJSON形式でのエクスポート

## クイックスタート

### 簡単起動（推奨）
```bash
git clone <repository-url>
cd snowflake-permissions-visualizer

# 初回セットアップ
make setup

# .envファイルを編集してSnowflake接続情報を設定
# SNOWFLAKE_USER=your_username
# SNOWFLAKE_ACCOUNT=your_account

# アプリケーション起動
make run
```

### 手動セットアップ
```bash
# 仮想環境作成・有効化
python3 -m venv venv
source venv/bin/activate

# 依存関係インストール
pip install -r requirements.txt

# 設定ファイル作成と編集
cp .env.sample .env
# .envファイルを編集

# 起動
export $(cat .env | xargs)
python fetch_permissions.py
python3 -m http.server 8080
```

ブラウザで `http://localhost:8080` にアクセス

詳細なセットアップ手順は [SETUP.md](SETUP.md) をご確認ください。

## ファイル構成

```
snowflake-permissions-visualizer/
├── index.html              # メインWebアプリケーション
├── app.js                  # D3.js可視化ロジック
├── fetch_permissions.py    # Snowflake権限データ取得
├── requirements.txt        # Python依存関係
├── .env.sample            # 環境変数サンプル
├── Makefile               # 簡単起動用
├── SETUP.md               # 詳細セットアップガイド
└── README.md              # このファイル
```

## 使用方法

### ノード操作
- **クリック**: 詳細表示・関連権限フォーカス
- **ドラッグ**: 位置移動
- **ホバー**: 簡易情報表示

### コントロール
- **フィルター**: 表示対象絞り込み
- **検索**: 特定ノード検索
- **データ更新**: 最新権限取得
- **ハイライト解除**: 全体表示復帰

## 可視化の見方

### ノード
- **青色**: ユーザー
- **赤色**: ロール
- **緑色**: データベース
- **黄色**: テーブル

### リンク
- **赤線**: 権限付与
- **水色線**: ロール所属

## データ更新

Webアプリの「データ更新」ボタンをクリックすることで、最新のSnowflake権限情報を取得できます。

## セキュリティ

- `.env`ファイルは絶対にコミットしないでください
- 権限データには機密情報が含まれる可能性があるため、適切に保護してください

## ライセンス

MIT License