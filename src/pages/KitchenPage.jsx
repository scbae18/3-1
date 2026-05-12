import { useMemo } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/**
 * 주방 화면: 주문 카드, 메뉴별 조리 완료, 품절 토글
 */
export default function KitchenPage() {
  const { socket, connected, state } = useAppSocket();
  const menu = state?.menu ?? [];
  const soldSet = useMemo(() => new Set(state?.soldOutIds ?? []), [state?.soldOutIds]);
  const queue = state?.kitchenQueue ?? [];

  return (
    <div className="page kitchen-page">
      <div className="kitchen-top">
        <h1 className="kitchen-h1">주방</h1>
        <span className={`conn large ${connected ? "ok" : ""}`}>{connected ? "실시간 연결" : "끊김"}</span>
      </div>

      <section className="soldout-panel">
        <h2 className="section-title large">품절 설정</h2>
        <p className="muted kitchen-hint">버튼을 누르면 주문서에 즉시 반영됩니다.</p>
        <div className="soldout-grid">
          {menu.map((m) => {
            const on = soldSet.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                className={`soldout-btn ${on ? "on" : ""}`}
                onClick={() => socket.emit("kitchen:soldOut:toggle", m.id)}
              >
                <span className="soldout-name">{m.name}</span>
                <span className="soldout-flag">{on ? "품절" : "판매중"}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="queue-section">
        <h2 className="section-title large">접수 주문</h2>
        {queue.length === 0 ? (
          <p className="empty-kitchen muted">대기 중인 주문이 없습니다.</p>
        ) : (
          <div className="order-cards">
            {queue.map((o) => (
              <article key={o.id} className="order-card">
                <header className="card-head">
                  <span className="table-badge">테이블 {o.table}</span>
                  <time className="card-time">{formatTime(o.createdAt)}</time>
                </header>
                <ul className="card-items card-items--lines">
                  {o.items.map((it, i) => (
                    <li key={it.lineKey ?? `${o.id}-${i}`} className={`card-item-row ${it.done ? "done" : ""}`}>
                      <div className="card-item-main">
                        <span className="card-item-name">
                          {it.name} <span className="qty">×{it.qty}</span>
                        </span>
                        {it.done && <span className="badge-done">조리 완료</span>}
                      </div>
                      {!it.done && (
                        <button
                          type="button"
                          className="btn-line-done"
                          onClick={() =>
                            socket.emit("kitchen:completeLine", {
                              orderId: o.id,
                              lineKey: it.lineKey,
                              lineIndex: i,
                            })
                          }
                        >
                          이 메뉴 조리 완료
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
