/**
 * supabase-db.js
 * 盼盼睫研 CRM · Supabase 資料層
 * 取代原本的 localStorage，讓資料雲端同步
 *
 * 使用方式：在 app.html 的 <script> 前引入此檔案
 */

// ── 初始化 ──────────────────────────────────────────────
const SUPABASE_URL = 'https://oglqkingzamedklujdaf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_XsPVrZaPUEAfpw9-YEiiZQ_j3WEGTc8';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// ── Auth 守衛：未登入者導回 index.html ──────────────────
async function requireAuth() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  currentUser = session.user;
  renderUserBadge(session.user);
  return session.user;
}

function renderUserBadge(user) {
  const badge = document.getElementById('user-badge');
  if (!badge) return;
  badge.textContent = user.user_metadata?.name || user.email || '已登入';
  badge.title = user.email;
}

// ── 登出 ────────────────────────────────────────────────
async function signOut() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ═══════════════════════════════════════════════════════
//  CRUD Helpers（自動帶入 user_id，資料隔離）
// ═══════════════════════════════════════════════════════

/** 讀取 clients */
async function dbGetClients() {
  const { data, error } = await sb
    .from('clients')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error('dbGetClients:', error); return []; }
  return data.map(fromRow_client);
}

/** 新增/更新 client */
async function dbUpsertClient(client) {
  const row = toRow_client(client);
  const { data, error } = await sb
    .from('clients')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) { console.error('dbUpsertClient:', error); return null; }
  return fromRow_client(data);
}

/** 刪除 client */
async function dbDeleteClient(id) {
  const { error } = await sb.from('clients').delete().eq('id', id);
  if (error) { console.error('dbDeleteClient:', error); return false; }
  return true;
}

// ── Records ─────────────────────────────────────────────

/** 讀取所有 records（回傳 {clientId: [...records]} 格式） */
async function dbGetRecords() {
  const { data, error } = await sb
    .from('records')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error('dbGetRecords:', error); return {}; }
  const db = {};
  for (const row of data) {
    if (!db[row.client_id]) db[row.client_id] = [];
    db[row.client_id].push(fromRow_record(row));
  }
  return db;
}

async function dbUpsertRecord(clientId, record) {
  const row = toRow_record(clientId, record);
  const { data, error } = await sb
    .from('records')
    .upsert(row, { onConflict: 'id' })
    .select()
    .single();
  if (error) { console.error('dbUpsertRecord:', error); return null; }
  return fromRow_record(data);
}

async function dbDeleteRecord(id) {
  const { error } = await sb.from('records').delete().eq('id', id);
  if (error) { console.error('dbDeleteRecord:', error); return false; }
  return true;
}

// ── Coupons ─────────────────────────────────────────────

async function dbGetCoupons() {
  const { data, error } = await sb.from('coupons').select('*');
  if (error) { console.error('dbGetCoupons:', error); return {}; }
  const db = {};
  for (const row of data) {
    if (!db[row.client_id]) db[row.client_id] = [];
    db[row.client_id].push(fromRow_coupon(row));
  }
  return db;
}

async function dbUpsertCoupon(clientId, coupon) {
  const { desc: description, ...rest } = coupon;
  const row = { ...rest, description, client_id: clientId, user_id: currentUser?.id };
  const { data, error } = await sb
    .from('coupons')
    .upsert(row, { onConflict: 'id' })
    .select().single();
  if (error) { console.error('dbUpsertCoupon:', error); return null; }
  return data;
}

async function dbDeleteCoupon(id) {
  const { error } = await sb.from('coupons').delete().eq('id', id);
  return !error;
}

// ── Expenses ─────────────────────────────────────────────

async function dbGetExpenses() {
  const { data, error } = await sb.from('expenses').select('*').order('date', { ascending: false });
  if (error) { console.error('dbGetExpenses:', error); return {}; }
  const db = {};
  for (const row of data) {
    if (!db[row.category]) db[row.category] = [];
    db[row.category].push(row);
  }
  return db;
}

async function dbUpsertExpense(category, expense) {
  const row = { ...expense, category, user_id: currentUser?.id };
  const { data, error } = await sb
    .from('expenses')
    .upsert(row, { onConflict: 'id' })
    .select().single();
  if (error) { console.error('dbUpsertExpense:', error); return null; }
  return data;
}

async function dbDeleteExpense(id) {
  const { error } = await sb.from('expenses').delete().eq('id', id);
  return !error;
}

// ── Config / TagBank / Sources ───────────────────────────

async function dbGetKV(key, defaultVal) {
  const { data, error } = await sb
    .from('kv_store')
    .select('value')
    .eq('key', key)
    .single();
  if (error || !data) return defaultVal;
  return data.value;
}

async function dbSetKV(key, value) {
  const { error } = await sb
    .from('kv_store')
    .upsert({ key, value, user_id: currentUser?.id }, { onConflict: 'key' });
  if (error) console.error('dbSetKV:', error);
}

// ── Reminded DB ──────────────────────────────────────────

async function dbGetReminded() {
  return dbGetKV('crm_reminded', {});
}

async function dbSetReminded(val) {
  return dbSetKV('crm_reminded', val);
}

// ═══════════════════════════════════════════════════════
//  Row Converters（DB ↔ App 格式）
// ═══════════════════════════════════════════════════════

function toRow_client(c) {
  return {
    id: c.id,
    user_id: currentUser?.id,
    name: c.name,
    nickname: c.nickname || '',
    gender: c.gender || '女',
    age: c.age || null,
    phone: c.phone || '',
    birthday: c.birthday || null,
    overseas: c.overseas || false,
    location: c.location || '台中',
    source: c.source || '',
    note: c.note || '',
    tags: c.tags || [],
    services: c.services || [],
    line_url: c.lineUrl || ''
  };
}

function fromRow_client(row) {
  return {
    id: row.id,
    name: row.name,
    nickname: row.nickname || '',
    gender: row.gender || '女',
    age: row.age || '',
    phone: row.phone || '',
    birthday: row.birthday || '',
    overseas: row.overseas || false,
    location: row.location || '台中',
    source: row.source || '',
    note: row.note || '',
    tags: row.tags || [],
    services: row.services || [],
    lineUrl: row.line_url || ''
  };
}

function toRow_record(clientId, r) {
  return {
    id: r.id,
    user_id: currentUser?.id,
    client_id: clientId,
    date: r.date,
    service: r.service || '',
    amount: r.amount || 0,
    note: r.note || '',
    tags: r.tags || [],
    next_date: r.nextDate || null,
    payment: r.payment || ''
  };
}

function fromRow_record(row) {
  return {
    id: row.id,
    date: row.date,
    service: row.service || '',
    amount: row.amount || 0,
    note: row.note || '',
    tags: row.tags || [],
    nextDate: row.next_date || '',
    payment: row.payment || ''
  };
}

function fromRow_coupon(row) {
  return {
    id: row.id,
    type: row.type,
    desc: row.description,
    amount: row.amount,
    issued: row.issued,
    validity: row.validity,
    status: row.status
  };
}

// ═══════════════════════════════════════════════════════
//  初始化：載入全部資料，填入 app 的全域變數
// ═══════════════════════════════════════════════════════

async function initSupabaseData() {
  showLoadingScreen('載入資料中…');
  try {
    // 平行載入所有資料
    const [
      clientsData, recordsData, couponsData,
      expensesData, remindedData,
      cfgData, tagBankData, sourcesData
    ] = await Promise.all([
      dbGetClients(),
      dbGetRecords(),
      dbGetCoupons(),
      dbGetExpenses(),
      dbGetReminded(),
      dbGetKV('crm_cfg', null),
      dbGetKV('crm_tagbank', null),
      dbGetKV('crm_sources', null)
    ]);

    // 注入到 app 的全域變數（app.html 的 script 會使用這些）
    window._db_clients   = clientsData;
    window._db_records   = recordsData;
    window._db_coupons   = couponsData;
    window._db_expenses  = expensesData;
    window._db_reminded  = remindedData;
    window._db_cfg       = cfgData;
    window._db_tagBank   = tagBankData;
    window._db_sources   = sourcesData;

    hideLoadingScreen();
  } catch (err) {
    console.error('initSupabaseData 失敗:', err);
    showLoadingScreen('載入失敗，請重新整理');
  }
}

// ── Loading Screen ────────────────────────────────────────
function showLoadingScreen(msg) {
  let el = document.getElementById('sb-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'sb-loading';
    el.style.cssText = `position:fixed;inset:0;background:#f5f0e8;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:16px;z-index:9999;font-family:'Noto Sans TC',sans-serif`;
    el.innerHTML = `
      <div style="width:48px;height:48px;background:#5b7a6e;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;color:white">✦</div>
      <div id="sb-loading-spinner" style="width:32px;height:32px;border:3px solid #e0ece8;border-top-color:#5b7a6e;border-radius:50%;animation:sbSpin 0.8s linear infinite"></div>
      <div id="sb-loading-msg" style="font-size:14px;color:#6b6050">${msg}</div>
      <style>@keyframes sbSpin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(el);
  } else {
    document.getElementById('sb-loading-msg').textContent = msg;
  }
}

function hideLoadingScreen() {
  const el = document.getElementById('sb-loading');
  if (el) el.remove();
}
