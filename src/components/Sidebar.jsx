import { fmtDate, fmt } from '../utils/storage'

export default function Sidebar({ open, dates, activeDate, onSwitch, onNewDate, onDelete, grand, user, onLogout }) {
  return (
    <div className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-logo">📊 <span>Sales</span> Report</div>

      {/* User info */}
      <div className="sidebar-user">
        <div className="sidebar-user-info">
          <span className="sidebar-user-name">{user?.username}</span>
          <span className={`role-badge ${user?.role === 'admin' ? 'role-admin' : 'role-seller'}`}>
            {user?.role === 'admin' ? 'Админ' : 'Продавец'}
          </span>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Выйти">↩</button>
      </div>

      <div className="sidebar-section">История отчётов</div>
      <div className="date-list">
        {dates.length === 0 && <div style={{padding:'12px 16px',color:'#3a6080',fontSize:12}}>Нет отчётов</div>}
        {dates.map(d => (
          <div key={d} className={`date-item ${d === activeDate ? 'active' : ''}`} onClick={() => onSwitch(d)}>
            <span>{fmtDate(d)}</span>
            <button className="date-del" onClick={e => onDelete(d, e)}>×</button>
          </div>
        ))}
      </div>

      <div className="new-date-wrap">
        <input className="new-date-inp" type="date" value="" title="Выбрать дату" onChange={e => onNewDate(e.target.value)} />
      </div>

      <div className="grand-box">
        <div className="g-title">Всего за всё время</div>
        <div className="grand-row"><span>Выручка</span><span>{fmt(grand.t)}</span></div>
        <div className="grand-row"><span>Себест.</span><span>{fmt(grand.c)}</span></div>
        <div className="grand-row">
          <span>Прибыль</span>
          <span className={grand.p >= 0 ? 'g-green' : 'g-red'}>{(grand.p>=0?'+':'') + fmt(grand.p)}</span>
        </div>
        <div className="grand-row g-divider">
          <span>Склад</span>
          <span className="g-yellow">{fmt(grand.stock)}</span>
        </div>
      </div>
    </div>
  )
}
