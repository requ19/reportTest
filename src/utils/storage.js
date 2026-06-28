import { supabase } from './supabase'

export const today = () => new Date().toISOString().slice(0, 10)

export const fmtDate = (d) => {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

export const fmtTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export const fmtDateTime = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
}

export const fmt = (n) =>
  Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })

let _nextId = Date.now()
export const uid    = () => String(_nextId++)
export const isUUID = (id) => typeof id === 'string' && /^[0-9a-f-]{36}$/.test(id)

// ── Auth ───────────────────────────────────────────────────
export async function login(username, password) {
  const { data, error } = await supabase
    .from('users').select('*')
    .eq('username', username).eq('password', password).single()
  if (error || !data) return null
  return data
}

// ── Sales ──────────────────────────────────────────────────
export async function loadSales(date) {
  const { data, error } = await supabase
    .from('sales').select('*').eq('date', date).order('created_at')
  if (error) { console.error('loadSales', error); return [] }
  return (data||[]).map(r => ({
    id: r.id, name: r.name||'', type: r.type||'',
    total: r.total != null ? String(r.total) : '',
    cost:  r.cost  != null ? String(r.cost)  : '',
  }))
}

export async function loadSalesRange(from, to) {
  const { data, error } = await supabase
    .from('sales').select('*').gte('date', from).lte('date', to).order('date')
  if (error) { console.error('loadSalesRange', error); return [] }
  return data || []
}

export async function insertSale(row, date) {
  const { data, error } = await supabase.from('sales')
    .insert({ date, name: row.name||'', type: row.type||'',
      total: parseFloat(row.total)||0, cost: parseFloat(row.cost)||0 })
    .select().single()
  if (error) { console.error('insertSale', error); return null }
  return data.id
}

export async function updateSale(row, date) {
  if (!isUUID(row.id)) return
  await supabase.from('sales').update({
    date, name: row.name||'', type: row.type||'',
    total: parseFloat(row.total)||0, cost: parseFloat(row.cost)||0,
  }).eq('id', row.id)
}

export async function deleteSale(id) {
  if (!isUUID(id)) return
  await supabase.from('sales').delete().eq('id', id)
}

export async function getAllSaleDates() {
  const { data } = await supabase.from('sales').select('date')
  return [...new Set((data||[]).map(r => r.date))].sort((a,b) => b.localeCompare(a))
}

// ── Stock ──────────────────────────────────────────────────
export async function loadStock() {
  const { data, error } = await supabase
    .from('stock').select('*').order('name').order('created_at')
  if (error) { console.error('loadStock', error); return [] }
  return (data||[]).map(r => ({
    id: r.id, name: r.name||'', variant: r.variant||'',
    qty:   r.qty   != null ? String(r.qty)   : '',
    price: r.price != null ? String(r.price) : '',
  }))
}

export async function insertStock(row) {
  const { data, error } = await supabase.from('stock')
    .insert({ name: row.name||'', variant: row.variant||'',
      qty: parseFloat(row.qty)||0, price: parseFloat(row.price)||0 })
    .select().single()
  if (error) { console.error('insertStock', error); return null }
  return data.id
}

export async function updateStock(row) {
  if (!isUUID(row.id)) return
  await supabase.from('stock').update({
    name: row.name||'', variant: row.variant||'',
    qty: parseFloat(row.qty)||0, price: parseFloat(row.price)||0,
  }).eq('id', row.id)
}

export async function deleteStock(id) {
  if (!isUUID(id)) return
  await supabase.from('stock').delete().eq('id', id)
}

// ── Stock log ──────────────────────────────────────────────
// event_type: 'in' = поступление, 'edit' = изменение остатка

export async function loadStockLog() {
  const { data, error } = await supabase
    .from('stock_log').select('*')
    .order('event_time', { ascending: false })
  if (error) { console.error('loadStockLog', error); return [] }
  return data || []
}

export async function insertStockLog(entry) {
  // entry: { stock_id, date, name, variant, qty_added, price, event_type, qty_before, qty_after, event_time? }
  const { data, error } = await supabase.from('stock_log')
    .insert({ ...entry, event_time: entry.event_time || new Date().toISOString() })
    .select().single()
  if (error) { console.error('insertStockLog', error); return null }
  return data
}

export async function deleteStockLog(id) {
  if (!isUUID(id)) return
  await supabase.from('stock_log').delete().eq('id', id)
}

// ── Grand totals ───────────────────────────────────────────
export async function getGrandTotals() {
  const [s, st] = await Promise.all([
    supabase.from('sales').select('total,cost'),
    supabase.from('stock').select('qty,price'),
  ])
  let t = 0, c = 0, stock = 0
  ;(s.data||[]).forEach(r => { t += Number(r.total)||0; c += Number(r.cost)||0 })
  ;(st.data||[]).forEach(r => { stock += (Number(r.qty)||0)*(Number(r.price)||0) })
  return { t, c, p: t - c, stock }
}
