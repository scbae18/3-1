import { useCallback, useMemo, useState } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

/**
 * 주문서 화면: 메뉴 수량, 품절 반영, 테이블 번호, 합계, 주문 완료
 */
export default function OrderPage() {
  const { socket, connected, state, toast } = useAppSocket();
  const [table, setTable] = useState("");
  /** menuId -> 수량 */
  const [quantities, setQuantities] = useState({});

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
      }
    });
  }, [socket, table, quantities]);

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
      <div className="order-top">
        <label className="field-label">
          테이블 번호
          <input
            type="text"
            inputMode="text"
            placeholder="예: 5, 야외1, VIP"
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="field-input wide"
          />
        </label>
        <span className={`conn ${connected ? "ok" : ""}`}>{connected ? "연결됨" : "연결 끊김"}</span>
      </div>

      <section className="menu-section">
        <h2 className="section-title">메뉴</h2>
        <p className="muted menu-hint">
          <strong>첫 주문은 세트를 권장</strong>합니다. 메인·사이드·자릿세는 원칙적으로 첫 주문 이후 추가 메뉴로 쓰기 좋습니다. 테이블 번호를 맞춰 주세요.
        </p>
        {byCategory.map(([cat, items]) => (
          <div key={cat} className="category-block">
            <h3 className="category-title">{cat}</h3>
            <ul className="menu-list">
              {items.map((m) => {
                const sold = soldSet.has(m.id);
                const addonHint = m.addonOnly === true && !tableHasOrdered;
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
        <button type="button" className="btn-primary btn-block" onClick={submit} disabled={!connected}>
          주문 완료
        </button>
      </footer>
    </div>
  );
}
