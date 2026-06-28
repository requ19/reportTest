import { useState, useMemo } from 'react'
import { loadSalesRange, fmt } from '../utils/storage'

const MONTHS = [
  'Январь','Февраль','Март','Апрель','Май','Июнь',
  'Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
]

export default function ReportTab() {
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth()) // 0-based
  const [rows,  setRows]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState({})

  async function load() {
    setLoading(true)
    setExpanded({})
    const from = `${year}-${String(month+1).padStart(2,'0')}-01`
    // last day of month
    const lastDay = new Date(year, month+1, 0).getDate()
    const to   = `${year}-${String(month+1).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`
    const data = await loadSalesRange(from, to)
    setRows(data)
    setLoading(false)
  }

  // Group: name → type → { count, total, cost, profit }
  const grouped = useMemo(() => {
    if (!rows) return null
    const map = {}
    rows.forEach(r => {
      const name = r.name?.trim() || '—'
      const type = r.type?.trim() || '—'
      if (!map[name]) map[name] = { total:0, cost:0, count:0, types:{} }
      map[name].total += Number(r.total)||0
      map[name].cost  += Number(r.cost)||0
      map[name].count += 1
      if (!map[name].types[type]) map[name].types[type] = { total:0, cost:0, count:0 }
      map[name].types[type].total += Number(r.total)||0
      map[name].types[type].cost  += Number(r.cost)||0
      map[name].types[type].count += 1
    })
    return map
  }, [rows])

  const grandTotal = useMemo(() => {
    if (!grouped) return null
    return Object.values(grouped).reduce((a,g) => ({
      total:  a.total  + g.total,
      cost:   a.cost   + g.cost,
      count:  a.count  + g.count,
    }), { total:0, cost:0, count:0 })
  }, [grouped])

  function toggle(name) { setExpanded(p => ({ ...p, [name]: !p[name] })) }

  const years = []
  for (let y = now.getFullYear(); y >= now.getFullYear()-3; y--) years.push(y)

  return (
    <div className="card">
      <div className="card-header report-hdr">
        <div className="card-title">📊 Ежемесячный отчёт</div>
      </div>

      {/* Picker */}
      <div className="report-picker">
        <select className="rp-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m,i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select className="rp-select" value={year} onChange={e => setYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button className="rp-btn" onClick={load} disabled={loading}>
          {loading ? 'Загрузка...' : 'Показать'}
        </button>
      </div>

      {/* Empty */}
      {grouped && Object.keys(grouped).length === 0 && (
        <div className="empty-state"><span>📭</span>Нет продаж за {MONTHS[month]} {year}</div>
      )}

      {/* Grand summary */}
      {grandTotal && Object.keys(grouped).length > 0 && (
        <div className="report-grand">
          <div className="rg-item">
            <div className="rg-label">Продаж</div>
            <div className="rg-val">{grandTotal.count}</div>
          </div>
          <div className="rg-item">
            <div className="rg-label">Выручка</div>
            <div className="rg-val s-blue">{fmt(grandTotal.total)}</div>
          </div>
          <div className="rg-item">
            <div className="rg-label">Себест.</div>
            <div className="rg-val s-gray">{fmt(grandTotal.cost)}</div>
          </div>
          <div className="rg-item">
            <div className="rg-label">Прибыль</div>
            <div className={`rg-val ${(grandTotal.total-grandTotal.cost)>=0?'s-green':'s-red'}`}>
              {((grandTotal.total-grandTotal.cost)>=0?'+':'')+fmt(grandTotal.total-grandTotal.cost)}
            </div>
          </div>
        </div>
      )}

      {/* Groups */}
      {grouped && Object.entries(grouped)
        .sort((a,b) => b[1].total - a[1].total)
        .map(([name, g]) => {
          const profit = g.total - g.cost
          const isOpen = expanded[name]
          const typeEntries = Object.entries(g.types).sort((a,b) => b[1].total - a[1].total)

          return (
            <div key={name} className="report-group">
              {/* Product header */}
              <div className="report-group-hdr" onClick={() => toggle(name)}>
                <div className="rgh-left">
                  <span className={`chevron ${isOpen?'open':''}`}>▶</span>
                  <div>
                    <div className="rgh-name">{name}</div>
                    <div className="rgh-meta">{g.count} прод. · {typeEntries.length} вид{typeEntries.length>1?'а':''}</div>
                  </div>
                </div>
                <div className="rgh-right">
                  <div className="rgh-stat">
                    <span className="rgh-stat-label">Выручка</span>
                    <span className="rgh-stat-val s-blue">{fmt(g.total)}</span>
                  </div>
                  <div className="rgh-stat hide-mobile">
                    <span className="rgh-stat-label">Себест.</span>
                    <span className="rgh-stat-val s-gray">{fmt(g.cost)}</span>
                  </div>
                  <div className="rgh-stat">
                    <span className="rgh-stat-label">Прибыль</span>
                    <span className={`rgh-stat-val ${profit>=0?'s-green':'s-red'}`}>
                      {(profit>=0?'+':'')+fmt(profit)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Types breakdown */}
              {isOpen && (
                <div className="report-types">
                  <div className="table-scroll">
                    <table className="tbl">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Вид / Модель</th>
                          <th className="th-r">Кол-во</th>
                          <th className="th-r">Выручка</th>
                          <th className="th-r hide-mobile">Себест.</th>
                          <th className="th-r">Прибыль</th>
                        </tr>
                      </thead>
                      <tbody>
                        {typeEntries.map(([type, t], i) => {
                          const tp = t.total - t.cost
                          return (
                            <tr key={type}>
                              <td className="td-c">{i+1}</td>
                              <td style={{fontWeight:500}}>{type}</td>
                              <td className="td-r">
                                <span className="count-badge">{t.count}</span>
                              </td>
                              <td className="td-r s-blue" style={{fontWeight:600}}>{fmt(t.total)}</td>
                              <td className="td-r s-gray hide-mobile">{fmt(t.cost)}</td>
                              <td className={`td-r ${tp>=0?'s-green':'s-red'}`} style={{fontWeight:700}}>
                                {(tp>=0?'+':'')+fmt(tp)}
                              </td>
                            </tr>
                          )
                        })}
                        {/* Type totals */}
                        <tr className="totals-row">
                          <td></td>
                          <td className="totals-label">Итого</td>
                          <td className="td-r"><span className="count-badge">{g.count}</span></td>
                          <td className="td-r" style={{color:'#1d6fa4',fontWeight:800}}>{fmt(g.total)}</td>
                          <td className="td-r hide-mobile" style={{color:'#6b7280'}}>{fmt(g.cost)}</td>
                          <td className={`td-r`} style={{fontWeight:800,color:profit>=0?'#16a34a':'#dc2626'}}>
                            {(profit>=0?'+':'')+fmt(profit)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })
      }
    </div>
  )
}
