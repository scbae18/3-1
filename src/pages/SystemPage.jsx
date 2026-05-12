import { useEffect, useMemo, useState } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

function formatElapsed(ms) {
  if (ms < 0) ms = 0;
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 시스템/타이머 화면: 테이블별 경과 시간, 기본/연장 시간 설정, 수동 연장·초기화
 */
export default function SystemPage() {
  const { socket, connected, state } = useAppSocket();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const defaultLimit = state?.settings?.defaultLimitMinutes ?? 90;
  const extensionM = state?.settings?.extensionMinutes ?? 30;

  const tables = useMemo(() => {
    const entries = Object.entries(state?.tables ?? {});
    const now = Date.now();
    return entries.map(([table, t]) => {
      const start = t.timerStartedAt;
      const bonus = Math.max(0, Math.floor(Number(t.bonusLimitMinutes) || 0));
      const limitMin = defaultLimit + bonus;
      const limitMs = limitMin * 60 * 1000;
      const elapsed = start != null ? now - start : 0;
      const over = start != null && elapsed >= limitMs;
      return { table, start, elapsed, over, limitMin, bonus };
    });
  }, [state?.tables, defaultLimit, tick]);

  const [defaultInput, setDefaultInput] = useState(String(defaultLimit));
  const [extensionInput, setExtensionInput] = useState(String(extensionM));

  useEffect(() => {
    if (state?.settings?.defaultLimitMinutes != null) {
      setDefaultInput(String(state.settings.defaultLimitMinutes));
    }
  }, [state?.settings?.defaultLimitMinutes]);

  useEffect(() => {
    if (state?.settings?.extensionMinutes != null) {
      setExtensionInput(String(state.settings.extensionMinutes));
    }
  }, [state?.settings?.extensionMinutes]);

  return (
    <div className="page system-page">
      <div className="system-top">
        <h1 className="system-h1">시스템 / 타이머</h1>
        <span className={`conn large ${connected ? "ok" : ""}`}>{connected ? "연결됨" : "연결 끊김"}</span>
      </div>

      <section className="system-settings">
        <h2 className="section-title large">설정</h2>
        <div className="settings-grid">
          <label className="field-label">
            기본 제한 시간 (분)
            <p className="muted small flush">테이블 첫 주문 후, 이 시간을 넘기면 경고합니다.</p>
            <div className="inline-row">
              <input
                type="number"
                min={1}
                max={999}
                value={defaultInput}
                onChange={(e) => setDefaultInput(e.target.value)}
                className="field-input narrow"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => socket.emit("system:setDefaultLimitMinutes", defaultInput)}
              >
                적용
              </button>
            </div>
          </label>
          <label className="field-label">
            연장 시간 (분)
            <p className="muted small flush">「시간 연장」 한 번 클릭할 때마다, 그 테이블의 허용 제한 시간에 이 값(분)이 더해집니다. 경과 시간(타이머)은 초기화되지 않습니다.</p>
            <div className="inline-row">
              <input
                type="number"
                min={1}
                max={999}
                value={extensionInput}
                onChange={(e) => setExtensionInput(e.target.value)}
                className="field-input narrow"
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => socket.emit("system:setExtensionMinutes", extensionInput)}
              >
                적용
              </button>
            </div>
          </label>
        </div>
        <p className="muted small">
          추가 주문으로 타이머는 자동으로 바뀌지 않습니다. 연장·초기화는 모두 이 화면에서 수동으로 하세요.
        </p>
        <div className="system-reset-all">
          <h3 className="section-title">전체 초기화</h3>
          <p className="muted small flush">
            주방 대기 주문, 모든 테이블 타이머, 매출 집계, 품절 표시를 한 번에 지웁니다. 위의 기본·연장 시간 설정은 그대로입니다.
          </p>
          <button
            type="button"
            className="btn-danger"
            onClick={() => {
              if (
                window.confirm(
                  "정말 전체 초기화할까요? 주방·테이블·매출·품절 내역이 모두 사라지며 되돌릴 수 없습니다."
                )
              ) {
                socket.emit("system:resetAll");
              }
            }}
          >
            전체 초기화
          </button>
        </div>
      </section>

      <section className="tables-section">
        <h2 className="section-title large">사용 중 테이블</h2>
        {tables.length === 0 ? (
          <p className="muted">등록된 테이블이 없습니다. 주문서에서 주문이 들어오면 표시됩니다.</p>
        ) : (
          <ul className="table-timers">
            {tables.map(({ table, elapsed, over, start, limitMin, bonus }) => (
              <li key={table} className={`table-timer-row ${over ? "over" : ""} ${start == null ? "idle" : ""}`}>
                <div className="timer-main">
                  <span className="table-name-lg">{table}</span>
                  <span className="elapsed-lg">{start != null ? formatElapsed(elapsed) : "타이머 대기"}</span>
                  {start != null && (
                    <span className="limit-hint muted">
                      허용 {limitMin}분
                      {bonus > 0 ? ` (기본 ${defaultLimit} + 연장 누적 ${bonus})` : ""}
                    </span>
                  )}
                  {over && <span className="warn-label">제한 시간 초과</span>}
                </div>
                <div className="timer-actions">
                  <button type="button" className="btn-secondary" onClick={() => socket.emit("system:extend", table)}>
                    시간 연장
                  </button>
                  <button type="button" className="btn-danger" onClick={() => socket.emit("system:resetTable", table)}>
                    테이블 초기화
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
