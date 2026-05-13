import { useMemo } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

function formatWhen(ts) {
  const d = new Date(ts);
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function telHref(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return digits.length > 0 ? `tel:${digits}` : null;
}

/**
 * 운영: 예약 목록(접수 순), 전화 / 삭제
 */
export default function ReservationsPage() {
  const { socket, connected, state } = useAppSocket();
  const list = useMemo(() => {
    const raw = state?.reservations ?? [];
    return [...raw].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  }, [state?.reservations]);

  return (
    <div className="page reservations-page">
      <div className="reservations-top">
        <h1 className="reservations-h1">예약 목록</h1>
        <span className={`conn large ${connected ? "ok" : ""}`}>{connected ? "연결됨" : "연결 끊김"}</span>
      </div>
      <p className="muted reservations-hint">접수된 순서대로 표시됩니다.</p>

      {list.length === 0 ? (
        <p className="muted">등록된 예약이 없습니다.</p>
      ) : (
        <ul className="reservation-list">
          {list.map((r) => {
            const href = telHref(r.phone);
            return (
              <li key={r.id} className="reservation-card">
                <div className="reservation-main">
                  <span className="reservation-name">{r.name}</span>
                  <span className="reservation-meta muted">
                    인원 {r.partySize}명 · {r.phone}
                  </span>
                  <time className="reservation-time muted">{formatWhen(r.createdAt)}</time>
                </div>
                <div className="reservation-actions">
                  {href ? (
                    <a className="btn-secondary reservation-call" href={href}>
                      전화하기
                    </a>
                  ) : (
                    <button type="button" className="btn-secondary" disabled>
                      전화하기
                    </button>
                  )}
                  <button type="button" className="btn-danger" onClick={() => socket.emit("reservation:delete", r.id)}>
                    삭제하기
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
