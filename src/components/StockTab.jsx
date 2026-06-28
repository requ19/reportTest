import { useState, useMemo } from 'react'
import { fmt, fmtDate, fmtDateTime } from '../utils/storage'

function groupByName(rows) {
  const map = {}
  rows.forEach(r => {
    const key = r.name.trim() || '—'
    if (!map[key]) map[key] = []
    map[key].push(r)
  })
  return map
}

const VIEW = { stock: 'stock', incoming: 'incoming', journal: 'journal' }

export default function StockTab({ rows, onUpdate, onAddRow, onDelete, log, onDeleteLog }) {
  const [collapsed, setCollapsed] = useState({})
  const [view, setView]           = useState(VIEW.stock)
  const [newName, setNewName]     = useState('')

  const groups = useMemo(() => groupByName(rows), [rows])
  const totals = useMemo(() => {
    let qty = 0, total = 0
    rows.forEach(r => { qty += parseFloat(r.qty)||0; total += (parseFloat(r.qty)||0)*(parseFloat(r.price)||0) })
    return { qty, total }
  }, [rows])

  // Incoming: only event_type === 'in', grouped by date
  const incomingByDate = useMemo(() => {
    const entries = log.filter(e => e.event_type === 'in' || !e.event_type)
    const map = {}
    entries.forEach(e => {
      const d = e.date || e.event_time?.slice(0,10) || '—'
      if (!map[d]) map[d] = []
      map[d].push(e)
    })
    return map
  }, [log])

  // Journal: all events sorted by time desc
  const journal = useMemo(() => [...log].sort((a,b) => {
    return new Date(b.event_time||0) - new Date(a.event_time||0)
  }), [log])

  // Group journal by date
  const journalByDate = useMemo(() => {
    const map = {}
    journal.forEach(e => {
      const d = (e.event_time || e.date || '').slice(0,10)
      if (!map[d]) map[d] = []
      map[d].push(e)
    })
    return map
  }, [journal])

  const toggle = (name) => setCollapsed(prev => ({ ...prev, [name]: !prev[name] }))

  function handleAddGroup() {
    if (!newName.trim()) return
    onAddRow(newName.trim())
    setNewName('')
  }

  return (
    <div>
      {/* Top tabs */}
      <div className="stock-toggle">
        <button className={`stog-btn ${view===VIEW.stock?'active':''}`}     onClick={() => setView(VIEW.stock)}>📦 Остатки</button>
        <button className={`stog-btn ${view===VIEW.incoming?'active':''}`}  onClick={() => setView(VIEW.incoming)}>📋 Поступления</button>
        <button className={`stog-btn ${view===VIEW.journal?'active':''}`}   onClick={() => setView(VIEW.journal)}>🔄 Журнал</button>
      </div>

      {/* ── ОСТАТКИ ── */}
      {view === VIEW.stock && (
        <div className="card">
          <div className="card-header stock-hdr">
            <div className="card-title">Склад — актуальные остатки</div>
          </div>

          {Object.keys(groups).length === 0 && (
            <div className="empty-state"><span>📦</span>Добавьте товар ниже</div>
          )}

          {Object.entries(groups).map(([groupName, groupRows]) => {
            const isOpen     = !collapsed[groupName]
            const groupQty   = groupRows.reduce((a,r) => a+(parseFloat(r.qty)||0), 0)
            const groupTotal = groupRows.reduce((a,r) => a+(parseFloat(r.qty)||0)*(parseFloat(r.price)||0), 0)
            return (
              <div key={groupName} className="group-block">
                <div className="group-header" onClick={() => toggle(groupName)}>
                  <div className="group-name-wrap">
                    <span className={`chevron ${isOpen?'open':''}`}>▶</span>
                    <span className="group-name">{groupName}</span>
                    <span className="group-badge">{groupRows.length} вид{groupRows.length>1?'а':''}</span>
                  </div>
                  <div className="group-meta">
                    <span>{fmt(groupQty)} шт.</span>
                    <span className="group-meta-profit">{fmt(groupTotal)} ₸</span>
                  </div>
                </div>

                {isOpen && (
                  <>
                    <div className="table-scroll">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th className="th-c">#</th>
                            <th>Вид / Модель</th>
                            <th className="th-r">Остаток</th>
                            <th className="th-r">Цена / шт.</th>
                            <th className="th-r">Стоимость</th>
                            <th className="th-del"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupRows.map((r, i) => {
                            const q = parseFloat(r.qty)||0
                            const p = parseFloat(r.price)||0
                            return (
                              <tr key={r.id}>
                                <td className="td-c">{i+1}</td>
                                <td><input className="cell-inp" placeholder="Прозрачный, карбон..." value={r.variant} onChange={e => onUpdate(r.id,'variant',e.target.value)} /></td>
                                <td><input className="num-inp" type="number" placeholder="0" value={r.qty} onChange={e => onUpdate(r.id,'qty',e.target.value)} /></td>
                                <td><input className="num-inp" type="number" placeholder="0" value={r.price} onChange={e => onUpdate(r.id,'price',e.target.value)} /></td>
                                <td className="td-r" style={{fontWeight:600,color:q*p>0?'#16a34a':'#9ca3af'}}>{q*p>0?fmt(q*p):'—'}</td>
                                <td><button className="del-btn" onClick={() => onDelete(r.id)}>×</button></td>
                              </tr>
                            )
                          })}
                          <tr className="totals-row">
                            <td></td><td className="totals-label">Итого</td>
                            <td className="td-r" style={{color:'#d97706'}}>{fmt(groupQty)} шт.</td>
                            <td></td>
                            <td className="td-r" style={{color:'#16a34a',fontWeight:800}}>{fmt(groupTotal)}</td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{padding:'4px 10px 8px'}}>
                      <button className="add-variant-btn" onClick={() => onAddRow(groupName)}>+ Добавить вид</button>
                    </div>
                  </>
                )}
              </div>
            )
          })}

          <div className="new-group-bar">
            <input className="new-group-inp" placeholder="Название товара (напр. Чехол на iPhone)"
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleAddGroup()} />
            <button className="new-group-btn" onClick={handleAddGroup}>+ Товар</button>
          </div>

          <div className="summary s2">
            <div className="sum-card"><div className="s-label">Всего единиц</div><div className="s-val s-yellow">{fmt(totals.qty)}</div></div>
            <div className="sum-card"><div className="s-label">Общая стоимость</div><div className="s-val s-green">{fmt(totals.total)}</div></div>
          </div>
        </div>
      )}

      {/* ── ПОСТУПЛЕНИЯ ── */}
      {view === VIEW.incoming && (
        <div className="card">
          <div className="card-header stock-hdr">
            <div className="card-title">История поступлений</div>
          </div>
          {Object.keys(incomingByDate).length === 0 && (
            <div className="empty-state"><span>📋</span>Нет записей о поступлениях</div>
          )}
          {Object.entries(incomingByDate).map(([date, entries]) => (
            <div key={date} className="group-block">
              <div className="log-date-header">
                <span className="log-date-title">📅 {fmtDate(date)}</span>
                <span className="log-date-count">{entries.length} поступл.</span>
              </div>
              <div className="table-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th className="th-c">#</th>
                      <th>Время</th>
                      <th>Товар</th>
                      <th>Вид</th>
                      <th className="th-r">Кол-во</th>
                      <th className="th-r">Цена</th>
                      <th className="th-r">Сумма</th>
                      <th className="th-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => (
                      <tr key={e.id}>
                        <td className="td-c">{i+1}</td>
                        <td><span className="time-badge">{e.event_time ? new Date(e.event_time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}) : '—'}</span></td>
                        <td style={{fontWeight:500}}>{e.name}</td>
                        <td style={{color:'#6b7280'}}>{e.variant||'—'}</td>
                        <td className="td-r">{fmt(e.qty_added)}</td>
                        <td className="td-r">{fmt(e.price)}</td>
                        <td className="td-r" style={{color:'#16a34a',fontWeight:600}}>{fmt((parseFloat(e.qty_added)||0)*(parseFloat(e.price)||0))}</td>
                        <td><button className="del-btn" onClick={() => onDeleteLog(e.id)}>×</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ЖУРНАЛ ── */}
      {view === VIEW.journal && (
        <div className="card">
          <div className="card-header journal-hdr">
            <div className="card-title">🔄 Журнал изменений</div>
            <div className="card-date" style={{fontSize:12}}>все движения по складу</div>
          </div>
          {Object.keys(journalByDate).length === 0 && (
            <div className="empty-state"><span>🔄</span>Нет записей</div>
          )}
          {Object.entries(journalByDate).map(([date, entries]) => (
            <div key={date} className="group-block">
              <div className="log-date-header" style={{background:'#f0f9ff',borderColor:'#bae6fd'}}>
                <span className="log-date-title" style={{color:'#0369a1'}}>📅 {fmtDate(date)}</span>
                <span className="log-date-count" style={{color:'#0284c7'}}>{entries.length} событий</span>
              </div>
              <div className="table-scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Время</th>
                      <th>Тип</th>
                      <th>Товар</th>
                      <th>Вид</th>
                      <th className="th-r">Было</th>
                      <th className="th-r">Стало</th>
                      <th className="th-r">Изменение</th>
                      <th className="th-del"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map(e => {
                      const before = parseFloat(e.qty_before) || 0
                      const after  = parseFloat(e.qty_after)  || (parseFloat(e.qty_added) || 0)
                      const diff   = e.event_type === 'in'
                        ? parseFloat(e.qty_added) || 0
                        : after - before
                      const isIn   = e.event_type === 'in' || !e.event_type
                      return (
                        <tr key={e.id}>
                          <td><span className="time-badge">{e.event_time ? new Date(e.event_time).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}) : '—'}</span></td>
                          <td>
                            <span className={`event-badge ${isIn ? 'event-in' : diff >= 0 ? 'event-up' : 'event-down'}`}>
                              {isIn ? '⬆ Приход' : diff >= 0 ? '⬆ Добавлено' : '⬇ Убыло'}
                            </span>
                          </td>
                          <td style={{fontWeight:500}}>{e.name}</td>
                          <td style={{color:'#6b7280'}}>{e.variant||'—'}</td>
                          <td className="td-r" style={{color:'#6b7280'}}>{isIn ? '—' : fmt(before)}</td>
                          <td className="td-r" style={{color:'#6b7280'}}>{isIn ? fmt(parseFloat(e.qty_added)||0) : fmt(after)}</td>
                          <td className="td-r" style={{fontWeight:700, color: diff>0?'#16a34a':diff<0?'#dc2626':'#9ca3af'}}>
                            {diff > 0 ? '+' : ''}{fmt(diff)}
                          </td>
                          <td><button className="del-btn" onClick={() => onDeleteLog(e.id)}>×</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
