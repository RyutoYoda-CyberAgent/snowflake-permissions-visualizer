# Snowflake Permissions Visualizer ❄️

Snowflakeの権限（ロール、ユーザー、テーブル権限）をインタラクティブなD3.jsマップで可視化し、権限変更を自動検知・更新するWebアプリケーションです。

## ✨ 機能

- **📊 インタラクティブな権限マップ**: D3.jsを使用したドラッグ&ドロップ可能な権限関係図
- **🔄 リアルタイム更新**: 権限変更を自動検知して表示を更新
- **🎛️ フィルタリング**: ユーザー、ロール、テーブル別の表示切り替え
- **🔍 検索機能**: ノード名による絞り込み検索
- **💡 フォーカス表示**: 選択したノードに関連する権限のみを表示
- **📱 ダークテーマ**: 見やすい黒ベースのデザイン
- **📥 データエクスポート**: 権限データのJSON形式でのエクスポート

## 🚀 クイックスタート

### 1. リポジトリクローン
```bash
git clone <repository-url>
cd snowflake-permissions-visualizer
```

### 2. 環境設定
```bash
# 仮想環境作成・有効化
python3 -m venv venv
source venv/bin/activate

# 依存関係インストール
pip install -r requirements.txt

# 設定ファイル作成
cp .env.sample .env
```

### 3. Snowflake接続設定
`.env`ファイルを編集：
```bash
SNOWFLAKE_USER=your_username
SNOWFLAKE_ACCOUNT=your_account
SNOWFLAKE_AUTHENTICATOR=externalbrowser
```

### 4. 起動
```bash
# 環境変数読み込み
export $(cat .env | xargs)

# データ取得
python fetch_permissions.py

# Webアプリ起動
python3 -m http.server 8080
```

**ブラウザで `http://localhost:8080` にアクセス**

詳細なセットアップ手順は [SETUP.md](SETUP.md) をご確認ください。

## 📁 ファイル構成

```
snowflake-permissions-visualizer/
├── index.html              # メインWebアプリケーション
├── app.js                  # D3.js可視化ロジック
├── fetch_permissions.py    # Snowflake権限データ取得
├── auto_refresh.py         # 自動更新監視サービス
├── requirements.txt        # Python依存関係
├── .env.sample            # 環境変数サンプル
├── SETUP.md               # 詳細セットアップガイド
└── README.md              # このファイル
```

## 🎯 使用方法

### ノード操作
- **クリック**: 詳細表示・関連権限フォーカス
- **ドラッグ**: 位置移動
- **ホバー**: 簡易情報表示

### コントロール
- **フィルター**: 表示対象絞り込み
- **検索**: 特定ノード検索
- **データ更新**: 最新権限取得
- **ハイライト解除**: 全体表示復帰

## 🔐 認証方式

### SSO/SAML（推奨）
```bash
SNOWFLAKE_AUTHENTICATOR=externalbrowser
```

### パスワード認証
```bash
SNOWFLAKE_AUTHENTICATOR=snowflake
SNOWFLAKE_PASSWORD=your_password
```

### OAuth（本番推奨）
```bash
SNOWFLAKE_AUTHENTICATOR=oauth
SNOWFLAKE_TOKEN=your_token
```

### JWT（自動化推奨）
```bash
SNOWFLAKE_AUTHENTICATOR=jwt
SNOWFLAKE_PRIVATE_KEY=your_private_key
```

## 🎨 可視化の見方

### ノード
- 🔵 **ユーザー** (青)
- 🔴 **ロール** (赤)  
- 🟢 **データベース** (緑)
- 🟡 **テーブル** (黄)

### リンク
- **赤線**: 権限付与
- **水色線**: ロール所属

## 🔄 自動更新

```bash
# 別ターミナルで実行
source venv/bin/activate
export $(cat .env | xargs)
python auto_refresh.py
```

## 🛠️ トラブルシューティング

詳細は [SETUP.md](SETUP.md) の「トラブルシューティング」セクションをご参照ください。

## ⚠️ セキュリティ

- `.env`ファイルは**絶対にコミットしない**
- 本番環境では適切なアクセス制御を実装
- 権限データは機密情報として適切に保護

## 📄 ライセンス

MIT License