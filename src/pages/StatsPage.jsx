import { useMemo } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

/**
 * 메뉴별 주문 수량·매출 요약 (주문 완료 접수 기준, 실시간)
 */
export default function StatsPage() {
  const { connected, state } = useAppSocket();
  const sales = state?.salesStats;
  const lines = sales?.menuLines ?? [];

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const row of lines) {
      if (!map.has(row.category)) map.set(row.category, []);
      map.get(row.category).push(row);
    }
    return [...map.entries()];
  }, [lines]);

  const totalQty = useMemo(() => lines.reduce((s, r) => s + r.qty, 0), [lines]);

  return (
    <div className="page stats-page">
      <div className="stats-header">
        <h1 className="stats-h1">매출 · 주문량</h1>
        <span className={`conn large ${connected ? "ok" : ""}`}>{connected ? "실시간 연결" : "끊김"}</span>
      </div>
      <p className="muted stats-note">
        「주문 완료」로 접수된 수량·금액만 집계합니다. 서버를 재시작하면 초기화됩니다.
      </p>

      <section className="stats-summary-cards">
        <div className="stat-card">
          <span className="stat-label">총 매출</span>
          <strong className="stat-value">{(sales?.totalRevenue ?? 0).toLocaleString()}원</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">총 주문 수량</span>
          <strong className="stat-value">{totalQty.toLocaleString()}개</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">주문 완료 건수</span>
          <strong className="stat-value">{(sales?.orderSubmitCount ?? 0).toLocaleString()}건</strong>
        </div>
      </section>

      <section className="stats-detail">
        <h2 className="section-title large">메뉴별</h2>
        <div className="stats-tables">
          {byCategory.map(([cat, rows]) => (
            <div key={cat} className="stats-cat-block">
              <h3 className="category-title">{cat}</h3>
              <div className="stats-table-wrap">
                <table className="stats-table">
                  <thead>
                    <tr>
                      <th scope="col">메뉴</th>
                      <th scope="col" className="num">
                        수량
                      </th>
                      <th scope="col" className="num">
                        매출
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.menuId} className={r.qty === 0 ? "stats-row-zero" : ""}>
                        <td>{r.name}</td>
                        <td className="num">{r.qty.toLocaleString()}</td>
                        <td className="num">{r.revenue.toLocaleString()}원</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
