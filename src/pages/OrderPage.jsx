import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

/**
 * 주문서 화면: 메뉴 수량, 품절 반영, 테이블 번호, 합계, 주문 완료
 */
export default function OrderPage() {
  const { socket, connected, state, toast } = useAppSocket();
  const [table, setTable] = useState("");
  /** menuId -> 수량 */
  const [quantities, setQuantities] = useState({});
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const soldSet = useMemo(() => new Set(state?.soldOutIds ?? []), [state?.soldOutIds]);

  const menu = state?.menu ?? [];

  const setQty = useCallback((menuId, delta) => {
    setQuantities((prev) => {
      const cur = Math.max(0, Math.floor(Number(prev[menuId]) || 0));
      const next = Math.max(0, cur + delta);
      if (next === 0) {
        const { [menuId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuId]: next };
    });
  }, []);

  const lines = useMemo(() => {
    const out = [];
    for (const m of menu) {
      const q = Math.max(0, Math.floor(Number(quantities[m.id]) || 0));
      if (q > 0) out.push({ ...m, qty: q });
    }
    return out;
  }, [menu, quantities]);

  const total = useMemo(() => lines.reduce((s, l) => s + l.price * l.qty, 0), [lines]);

  const submit = useCallback(() => {
    socket.emit("order:submit", { table, quantities }, (res) => {
      if (res?.ok) {
        setQuantities({});
        setTable("");
        setPaymentModalOpen(false);
      }
    });
  }, [socket, table, quantities]);

  useEffect(() => {
    if (!paymentModalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setPaymentModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paymentModalOpen]);

  const canSubmit = connected && lines.length > 0 && table.trim().length > 0;

  const byCategory = useMemo(() => {
    const map = new Map();
    for (const m of menu) {
      if (!map.has(m.category)) map.set(m.category, []);
      map.get(m.category).push(m);
    }
    return [...map.entries()];
  }, [menu]);

  const tableKey = table.trim();
  const tableHasOrdered = Boolean(tableKey && state?.tables?.[tableKey]);

  return (
    <div className="page order-page">
      {toast && <div className="toast">{toast}</div>}
      {paymentModalOpen && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setPaymentModalOpen(false)}
        >
          <div
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pay-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="pay-modal-title" className="modal-title">
              입금 확인
            </h2>
            <p className="modal-body">입금 확인했나요?</p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setPaymentModalOpen(false)}>
                취소
              </button>
              <button type="button" className="btn-primary" onClick={submit}>
                주문 완료
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="order-top">
        <label className="field-label">
          테이블 번호
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            placeholder="예: 5, 12"
            value={table}
            onChange={(e) => setTable(e.target.value.replace(/\D/g, ""))}
            className="field-input wide"
          />
        </label>
        <span className={`conn ${connected ? "ok" : ""}`}>{connected ? "연결됨" : "연결 끊김"}</span>
      </div>

      <section className="menu-section">
        <h2 className="section-title">메뉴</h2>
        <div className="order-policy">
          <h3 className="order-policy__heading">3. 인원별 필수 주문 기준</h3>
          <div className="order-policy-table-wrap">
            <table className="order-policy-table">
              <thead>
                <tr>
                  <th scope="col">인원</th>
                  <th scope="col">필수 세트 주문 수</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1~2인</td>
                  <td>세트 1개</td>
                </tr>
                <tr>
                  <td>3~4인</td>
                  <td>세트 2개</td>
                </tr>
                <tr>
                  <td>5~6인</td>
                  <td>세트 3개</td>
                </tr>
                <tr>
                  <td>7~8인</td>
                  <td>세트 4개</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="order-policy__heading">4. 주점 정책</h3>
          <dl className="order-policy-dl">
            <dt>기본 이용 시간</dt>
            <dd>팀당 최대 1시간 반</dd>
            <dt>시간 연장 정책</dt>
            <dd>
              <ul className="order-policy-ul">
                <li>기본 1시간 반 이후 추가 주문 시 1시간 연장 가능</li>
                <li>연장 조건 : 세트메뉴 1개 추가 주문</li>
                <li>추가 연장 시 동일 조건 반복 적용</li>
              </ul>
            </dd>
          </dl>
          <p className="order-policy-note muted">추가 메뉴는 세트 메뉴 주문 이후 주문 가능</p>
        </div>
        {byCategory.map(([cat, items]) => (
          <div key={cat} className="category-block">
            <h3 className="category-title">{cat}</h3>
            <ul className="menu-list">
              {items.map((m) => {
                const sold = soldSet.has(m.id);
                const addonHint = m.addonOnly === true && !tableHasOrdered && !m.hideFirstOrderBadge;
                const q = Math.max(0, Math.floor(Number(quantities[m.id]) || 0));
                return (
                  <li key={m.id} className={`menu-row ${sold ? "soldout" : ""} ${addonHint ? "addon-hint" : ""}`}>
                    <div className="menu-info">
                      <span className="menu-name">{m.name}</span>
                      <span className="menu-price">{m.price.toLocaleString()}원</span>
                      {sold && <span className="badge-sold">주문 불가</span>}
                      {addonHint && !sold && <span className="badge-addon">첫 주문 후</span>}
                    </div>
                    <div className="qty-controls">
                      <button type="button" disabled={sold} onClick={() => setQty(m.id, -1)} aria-label="감소">
                        −
                      </button>
                      <span className="qty-val">{q}</span>
                      <button type="button" disabled={sold} onClick={() => setQty(m.id, 1)} aria-label="증가">
                        +
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <footer className="order-footer">
        <div className="cart-summary">
          <h3 className="cart-title">선택 내역</h3>
          {lines.length === 0 ? (
            <p className="muted">메뉴를 담아 주세요.</p>
          ) : (
            <ul className="cart-lines">
              {lines.map((l) => (
                <li key={l.id}>
                  {l.name} × {l.qty} <span className="sub">{(l.price * l.qty).toLocaleString()}원</span>
                </li>
              ))}
            </ul>
          )}
          <div className="cart-total">
            합계 <strong>{total.toLocaleString()}원</strong>
          </div>
        </div>
        <button
          type="button"
          className="btn-primary btn-block"
          onClick={() => setPaymentModalOpen(true)}
          disabled={!canSubmit}
        >
          주문 완료
        </button>
      </footer>
    </div>
  );
}
