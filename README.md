# 盼盼睫研 CRM

> 盼盼睫研工作室客戶管理系統 · 支援 Google 登入 · 資料雲端同步 · 可部署至 GitHub Pages

---

## 功能

- 🔐 Google OAuth 登入（Supabase Auth）
- ☁️ 資料雲端儲存（Supabase PostgreSQL，取代 localStorage）
- 👥 客戶管理（新增・編輯・搜尋・標籤・篩選）
- 📋 施作紀錄（睫毛・眉毛・霧唇・髮際線・除色）
- 📅 回訪提醒系統
- 📊 統計報表
- 💰 成本支出管理
- 🎁 優惠券管理
- 📱 PWA 支援（可加入主畫面）

---

## 快速部署（5步驟）

### 步驟 1：建立 Supabase 專案

1. 前往 [supabase.com](https://supabase.com) → 建立新專案
2. 進入 **SQL Editor** → 貼上 `supabase-schema.sql` 內容 → 執行
3. 前往 **Authentication > Providers > Google** → 啟用 Google Auth
4. 在 Google Cloud Console 建立 OAuth 2.0 憑證，填入 Supabase 的 Callback URL
5. 記下以下兩個值（**Project Settings > API**）：
   - `Project URL`（即 `SUPABASE_URL`）
   - `anon public` key（即 `SUPABASE_ANON_KEY`）

### 步驟 2：Fork 此 Repository

在 GitHub 上 Fork 此 repo 到你的帳號。

### 步驟 3：設定 GitHub Secrets

進入你的 repo → **Settings > Secrets and variables > Actions** → 新增：

| Name | Value |
|------|-------|
| `SUPABASE_URL` | 你的 Supabase Project URL |
| `SUPABASE_ANON_KEY` | 你的 Supabase anon key |

### 步驟 4：啟用 GitHub Pages

進入 **Settings > Pages** → Source 選 **GitHub Actions**

### 步驟 5：設定 Supabase Redirect URL

在 Supabase **Authentication > URL Configuration** 填入：
```
https://你的帳號.github.io/你的repo名稱/app.html
```

---

## 本地開發

```bash
# 安裝 live-server（或任意靜態伺服器）
npm install -g live-server

# 在根目錄建立 config.local.js（不提交到 git）
echo "window.SUPABASE_URL='你的URL'; window.SUPABASE_ANON_KEY='你的Key';" > config.local.js

# 啟動
live-server --port=3000
```

> ⚠️ 本地開發時，在 `index.html` 和 `app.html` 的 `<script>` 區塊手動填入 URL 和 Key（記得不要提交到 git）

---

## 專案結構

```
panpan-crm/
├── index.html          # 登入頁面（Google OAuth）
├── app.html            # CRM 主程式（需登入）
├── supabase-db.js      # Supabase 資料層
├── supabase-schema.sql # 資料庫建表 SQL
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml  # 自動部署到 GitHub Pages
```

---

## Supabase 資料表

| 資料表 | 用途 |
|--------|------|
| `clients` | 客戶資料 |
| `records` | 施作紀錄 |
| `coupons` | 優惠券 |
| `expenses` | 耗材支出 |
| `kv_store` | 設定・標籤庫・來源列表 |

所有資料表均啟用 **Row Level Security**，每位登入使用者只能看到自己的資料。

---

## 安全說明

- `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 透過 GitHub Secrets 注入，不會出現在原始碼中
- Supabase `anon key` 是公開設計的，RLS 政策才是真正的保護層
- 建議在 Supabase 設定允許登入的 Email 白名單（Authentication > Restrictions）

---

## 授權

MIT License · 盼盼睫研工作室專用
