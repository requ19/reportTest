import { useState, useEffect, useRef } from 'react'
import './App.css'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import SalesTab from './components/SalesTab'
import StockTab from './components/StockTab'
import ReportTab from './components/ReportTab'
import {
  today, fmtDate, isUUID, uid,
  loadSales, insertSale, updateSale, deleteSale, getAllSaleDates,
  loadStock, insertStock, updateStock, deleteStock,
  loadStockLog, insertStockLog, deleteStockLog,
  getGrandTotals,
} from './utils/storage'

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('user')) } catch { return null }
  })
  const [date, setDate]           = useState(today)
  const [tab, setTab]             = useState('sales')
  const [salesRows, setSalesRows] = useState([])
  const [stockRows, setStockRows] = useState([])
  const [stockLog, setStockLog]   = useState([])
  const [dates, setDates]         = useState([])
  const [grand, setGrand]         = useState({ t:0, c:0, p:0, stock:0 })
  const [sideOpen, setSideOpen]   = useState(false)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)

  const timers    = useRef({})
  // track logged ids for 'in' events (first-time log)
  const loggedIds = useRef(new Set())
  // track previous qty for each stock row to detect changes
  const prevQty   = useRef({})

  const isAdmin = user?.role === 'admin'

  function handleLogin(u)  { sessionStorage.setItem('user', JSON.stringify(u)); setUser(u) }
  function handleLogout()  { sessionStorage.removeItem('user'); setUser(null) }

  useEffect(() => { if (user) init() }, [user])

  async function init() {
    setLoading(true)
    const curDate = today()
    const [s, st, sl, d, g] = await Promise.all([
      loadSales(curDate), loadStock(), loadStockLog(), getAllSaleDates(), getGrandTotals(),
    ])
    setSalesRows(s)
    setStockRows(st)
    setStockLog(sl)
    // init prevQty map
    st.forEach(r => { prevQty.current[r.id] = parseFloat(r.qty)||0 })
    // mark already-logged 'in' events
    sl.filter(e => e.event_type === 'in' || !e.event_type)
      .forEach(e => { if (e.stock_id) loggedIds.current.add(e.stock_id) })
    setDates([...new Set([curDate, ...d])].sort((a,b) => b.localeCompare(a)))
    setGrand(g)
    setLoading(false)
  }

  async function refreshMeta() {
    const [d, g] = await Promise.all([getAllSaleDates(), getGrandTotals()])
    setDates(prev => [...new Set([...d, date])].sort((a,b) => b.localeCompare(a)))
    setGrand(g)
  }

  async function switchDate(d) {
    setLoading(true); setSideOpen(false); setDate(d)
    const s = await loadSales(d)
    setSalesRows(s); setLoading(false)
    setDates(prev => [...new Set([d, ...prev])].sort((a,b) => b.localeCompare(a)))
  }

  async function handleDeleteDate(d, e) {
    e.stopPropagation()
    if (!confirm(`Удалить продажи за ${fmtDate(d)}?`)) return
    const { supabase } = await import('./utils/supabase')
    await supabase.from('sales').delete().eq('date', d)
    const upd = await getAllSaleDates()
    setDates(upd)
    if (d === date) { if (upd[0]) switchDate(upd[0]); else { setDate(today()); setSalesRows([]) } }
    refreshMeta()
  }

  function schedule(key, fn) {
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(async () => { setSaving(true); await fn(); setSaving(false) }, 700)
  }

  // ── Sales ─────────────────────────────────────────────────
  function updateSaleField(id, field, val) {
    setSalesRows(prev => {
      const next = prev.map(r => r.id !== id ? r : { ...r, [field]: val })
      const row = next.find(r => r.id === id)
      if (row && isUUID(id)) schedule(id, () => updateSale(row, date).then(refreshMeta))
      return next
    })
  }

  async function addSaleRow() {
    const tempId = uid()
    setSalesRows(prev => [...prev, { id: tempId, name:'', type:'', total:'', cost:'' }])
    setSaving(true)
    const newId = await insertSale({ name:'', type:'', total:0, cost:0 }, date)
    if (newId) setSalesRows(prev => prev.map(r => r.id === tempId ? { ...r, id: newId } : r))
    setSaving(false); refreshMeta()
  }

  async function delSaleRow(id) {
    setSalesRows(prev => prev.filter(r => r.id !== id))
    clearTimeout(timers.current[id])
    await deleteSale(id); refreshMeta()
  }

  // ── Stock ─────────────────────────────────────────────────
  function updateStockField(id, field, val) {
    if (!isAdmin) return
    setStockRows(prev => {
      const next = prev.map(r => r.id !== id ? r : { ...r, [field]: val })
      const row  = next.find(r => r.id === id)
      if (row && isUUID(id)) {
        schedule('stock_' + id, async () => {
          const oldQty = prevQty.current[id] ?? 0
          const newQty = parseFloat(row.qty) || 0
          const price  = parseFloat(row.price) || 0
          const now    = new Date().toISOString()

          await updateStock(row)
          refreshMeta()

          // First-time 'in' log: name + qty > 0 + price > 0, not yet logged
          if (row.name && newQty > 0 && price > 0 && !loggedIds.current.has(id)) {
            await insertStockLog({
              stock_id:   id,
              date:       today(),
              name:       row.name,
              variant:    row.variant || '',
              qty_added:  newQty,
              price,
              event_type: 'in',
              qty_before: 0,
              qty_after:  newQty,
              event_time: now,
            })
            loggedIds.current.add(id)
            prevQty.current[id] = newQty
          }
          // 'edit' log: qty changed after initial log
          else if (loggedIds.current.has(id) && newQty !== oldQty) {
            await insertStockLog({
              stock_id:   id,
              date:       today(),
              name:       row.name,
              variant:    row.variant || '',
              qty_added:  Math.abs(newQty - oldQty),
              price,
              event_type: 'edit',
              qty_before: oldQty,
              qty_after:  newQty,
              event_time: now,
            })
            prevQty.current[id] = newQty
          }

          const sl = await loadStockLog()
          setStockLog(sl)
        })
      }
      return next
    })
  }

  async function addStockItem(name) {
    if (!isAdmin) return
    const tempId = uid()
    setStockRows(prev => [...prev, { id: tempId, name, variant:'', qty:'', price:'' }])
    setSaving(true)
    const newId = await insertStock({ name, variant:'', qty:0, price:0 })
    if (newId) {
      setStockRows(prev => prev.map(r => r.id === tempId ? { ...r, id: newId } : r))
      prevQty.current[newId] = 0
    }
    setSaving(false); refreshMeta()
  }

  async function delStockItem(id) {
    if (!isAdmin) return
    setStockRows(prev => prev.filter(r => r.id !== id))
    clearTimeout(timers.current['stock_' + id])
    loggedIds.current.delete(id)
    delete prevQty.current[id]
    await deleteStock(id)
    const sl = await loadStockLog(); setStockLog(sl)
    refreshMeta()
  }

  async function delStockLogEntry(id) {
    if (!isAdmin) return
    const entry = stockLog.find(e => e.id === id)
    // if deleting an 'in' entry, allow re-logging
    if (entry?.stock_id && (entry.event_type === 'in' || !entry.event_type)) {
      loggedIds.current.delete(entry.stock_id)
    }
    await deleteStockLog(id)
    setStockLog(prev => prev.filter(r => r.id !== id))
  }

  if (!user) return <Login onLogin={handleLogin} />

  return (
    <>
      <div className="mobile-bar">
        <button className="burger" onClick={() => setSideOpen(true)}>☰</button>
        <span className="mobile-bar-title">{tab === 'report' ? 'Отчёт' : fmtDate(date)}</span>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {saving && <span className="save-dot" title="Сохраняется..."/>}
          <div className="mobile-tabs">
            <button className={`mobile-tab ${tab==='sales'?'active-sales':''}`} onClick={() => setTab('sales')}>🛒</button>
            {isAdmin && <button className={`mobile-tab ${tab==='stock'?'active-stock':''}`} onClick={() => setTab('stock')}>📦</button>}
            {isAdmin && <button className={`mobile-tab ${tab==='report'?'active-report':''}`} onClick={() => setTab('report')}>📊</button>}
          </div>
        </div>
      </div>

      <div className="layout">
        <Sidebar
          open={sideOpen} dates={dates} activeDate={date}
          onSwitch={switchDate} onNewDate={d => d && switchDate(d)}
          onDelete={handleDeleteDate} grand={grand} user={user} onLogout={handleLogout}
        />
        <div className={`overlay ${sideOpen?'open':''}`} onClick={() => setSideOpen(false)}/>

        <main className="main">
          <div className="tabs">
            <button className={`tab-btn ${tab==='sales'?'active-sales':''}`} onClick={() => setTab('sales')}>🛒 Продажи</button>
            {isAdmin && <button className={`tab-btn ${tab==='stock'?'active-stock':''}`} onClick={() => setTab('stock')}>📦 Склад</button>}
            {isAdmin && <button className={`tab-btn ${tab==='report'?'active-report':''}`} onClick={() => setTab('report')}>📊 Отчёт</button>}
            {saving && <span style={{marginLeft:8,display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#6b7280'}}><span className="save-dot"/>Сохраняется...</span>}
          </div>

          {loading ? (
            <div className="loading-box"><div className="spinner"/><span>Загрузка...</span></div>
          ) : (
            <>
              {tab === 'sales'  && <SalesTab rows={salesRows} date={date} onUpdate={updateSaleField} onAdd={addSaleRow} onDelete={delSaleRow}/>}
              {tab === 'stock'  && isAdmin && <StockTab rows={stockRows} onUpdate={updateStockField} onAddRow={addStockItem} onDelete={delStockItem} log={stockLog} onDeleteLog={delStockLogEntry}/>}
              {tab === 'report' && isAdmin && <ReportTab />}
            </>
          )}
        </main>
      </div>
    </>
  )
}
