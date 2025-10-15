# セットアップガイド

Snowflake Permissions Visualizer ❄️ の環境構築と起動方法

## 前提条件

- Python 3.8以上
- Snowflakeアカウントへのアクセス権限
- ブラウザ（Chrome, Firefox, Safari等）

## 1. リポジトリのクローン

```bash
git clone <repository-url>
cd snowflake-permissions-visualizer
```

## 2. Python仮想環境の作成

```bash
# 仮想環境作成
python3 -m venv venv

# 仮想環境の有効化
# macOS/Linux:
source venv/bin/activate
# Windows:
# venv\Scripts\activate
```

## 3. 依存関係のインストール

```bash
pip install -r requirements.txt
```

## 4. 環境設定

### 環境変数ファイルの作成
```bash
cp .env.sample .env
```

### `.env`ファイルの編集
エディタで`.env`ファイルを開き、あなたのSnowflake情報を入力：

```bash
# 必須項目
SNOWFLAKE_USER=your_actual_username
SNOWFLAKE_ACCOUNT=your_actual_account

# 認証方式の選択（下記から一つ）
SNOWFLAKE_AUTHENTICATOR=externalbrowser  # SSO/SAML（推奨）
# または
# SNOWFLAKE_AUTHENTICATOR=snowflake
# SNOWFLAKE_PASSWORD=your_password
```

### 環境変数の読み込み
```bash
# .envファイルの変数を現在のシェルに読み込み
export $(cat .env | xargs)
```

## 5. 初回データ取得

```bash
python fetch_permissions.py
```

成功すると以下のファイルが生成されます：
- `permissions_data.json` - 権限データ
- ブラウザでSnowflake認証画面が開きます（externalbrowser使用時）

## 6. Webアプリケーションの起動

```bash
# Webサーバー起動
python3 -m http.server 8080
```

ブラウザで以下にアクセス：
```
http://localhost:8080
```


## トラブルシューティング

### 接続エラー
```bash
# 環境変数の確認
echo $SNOWFLAKE_USER
echo $SNOWFLAKE_ACCOUNT

# Snowflake接続テスト
python -c "from fetch_permissions import *; print('設定確認中...')"
```

### ポートエラー
```bash
# 別のポートを使用
python3 -m http.server 8081
```

### 権限エラー
- `SNOWFLAKE_ROLE=ACCOUNTADMIN` が設定されているか確認
- Snowflakeでロールが適切に割り当てられているか確認

### Python依存関係エラー
```bash
# 仮想環境の再作成
deactivate
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## 停止方法

### Webサーバーの停止
ターミナルで `Ctrl+C`

### 自動監視サービスの停止
自動監視を起動したターミナルで `Ctrl+C`

### 仮想環境の無効化
```bash
deactivate
```

## 使用方法

1. **ノード操作**：
   - クリック：詳細表示・関連権限ハイライト
   - ドラッグ：位置移動
   - マウスホバー：簡易情報表示

2. **コントロール**：
   - フィルター：表示対象の絞り込み
   - 検索：特定ノードの検索
   - データ更新：最新権限の取得
   - ハイライト解除：全体表示に戻る

3. **自動更新**：
   - 5分間隔で権限変更を自動検知
   - 変更時は自動的にブラウザ表示を更新

## セキュリティ注意事項

- `.env`ファイルは絶対にGitにコミットしないでください
- 本番環境では適切なアクセス制御を実装してください
- 権限データには機密情報が含まれる可能性があります
