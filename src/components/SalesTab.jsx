import { useMemo } from "react";
import { fmt, fmtDate } from "../utils/storage";

export default function SalesTab({ rows, date, onUpdate, onAdd, onDelete }) {
  const totals = useMemo(() => {
    let t = 0, c = 0;
    rows.forEach(r => { t += parseFloat(r.total) || 0; c += parseFloat(r.cost) || 0; });
    return { t, c, p: t - c };
  }, [rows]);

  return (
    <div className="card">
      <div className="card-header sales-hdr">
        <div className="card-title">Отчёт о продажах</div>
        <div className="card-date">{fmtDate(date)}</div>
      </div>

      <div className="table-scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th className="th-c">#</th>
              <th>Наименование</th>
              <th className="hide-mobile">Модель / Тип</th>
              <th className="th-r">Продажа</th>
              <th className="th-r hide-mobile">Себест.</th>
              <th className="th-r">Прибыль</th>
              <th className="th-del"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const t = parseFloat(r.total) || 0;
              const c = parseFloat(r.cost) || 0;
              const profit = t - c;
              const has = r.total !== "" || r.cost !== "";
              return (
                <tr key={r.id}>
                  <td className="td-c">{i + 1}</td>
                  <td>
                    <input className="cell-inp" placeholder="Товар / услуга"
                      value={r.name} onChange={e => onUpdate(r.id, "name", e.target.value)} />
                  </td>
                  <td className="hide-mobile">
                    <input className="cell-inp" placeholder="Модель, тип..."
                      value={r.type} onChange={e => onUpdate(r.id, "type", e.target.value)} />
                  </td>
                  <td>
                    <input className="num-inp" type="number" placeholder="0"
                      value={r.total} onChange={e => onUpdate(r.id, "total", e.target.value)} />
                  </td>
                  <td className="hide-mobile">
                    <input className="num-inp" type="number" placeholder="0"
                      value={r.cost} onChange={e => onUpdate(r.id, "cost", e.target.value)} />
                  </td>
                  <td className={`td-profit ${!has ? "p-zero" : profit > 0 ? "p-pos" : profit < 0 ? "p-neg" : "p-zero"}`}>
                    {has ? (profit >= 0 ? "+" : "") + fmt(profit) : "—"}
                  </td>
                  <td>
                    <button className="del-btn" onClick={() => onDelete(r.id)}>×</button>
                  </td>
                </tr>
              );
            })}
            {rows.length > 0 && (
              <tr className="totals-row">
                <td></td>
                <td colSpan={2} className="totals-label">Итого</td>
                <td className="td-r" style={{ color: "#1d6fa4" }}>{fmt(totals.t)}</td>
                <td className="td-r hide-mobile" style={{ color: "#6b7280" }}>{fmt(totals.c)}</td>
                <td className="td-r" style={{ fontWeight: 800, color: totals.p >= 0 ? "#16a34a" : "#dc2626" }}>
                  {(totals.p >= 0 ? "+" : "") + fmt(totals.p)}
                </td>
                <td></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <button className="add-row-btn blue" onClick={onAdd}>+ Добавить строку</button>

      <div className="summary s3">
        <div className="sum-card">
          <div className="s-label">Выручка</div>
          <div className="s-val s-blue">{fmt(totals.t)}</div>
        </div>
        <div className="sum-card">
          <div className="s-label">Себестоимость</div>
          <div className="s-val s-gray">{fmt(totals.c)}</div>
        </div>
        <div className="sum-card">
          <div className="s-label">Прибыль</div>
          <div className={`s-val ${totals.p >= 0 ? "s-green" : "s-red"}`}>
            {(totals.p >= 0 ? "+" : "") + fmt(totals.p)}
          </div>
        </div>
      </div>
    </div>
  );
}
