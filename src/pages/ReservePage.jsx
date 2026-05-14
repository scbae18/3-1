import { useCallback, useState } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

/**
 * 손님 전용 예약 화면 — 헤더/다른 메뉴 없음. /reserve 만 사용.
 */
export default function ReservePage() {
  const { socket, connected } = useAppSocket();
  const [name, setName] = useState("");
  const [partySize, setPartySize] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);

  const resetForm = useCallback(() => {
    setName("");
    setPartySize("");
    setPhone("");
    setError(null);
    setDone(false);
  }, []);

  const submit = useCallback(() => {
    setError(null);
    if (!connected) {
      setError("연결 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const n = Math.max(0, Math.floor(Number(partySize) || 0));
    if (!name.trim()) {
      setError("이름을 입력해 주세요.");
      return;
    }
    if (n < 1 || n > 99) {
      setError("인원수는 1~99명으로 입력해 주세요.");
      return;
    }
    if (!phone.trim()) {
      setError("전화번호를 입력해 주세요.");
      return;
    }
    setSending(true);
    socket.emit(
      "reservation:create",
      { name: name.trim(), partySize: n, phone: phone.trim() },
      (res) => {
        setSending(false);
        if (res?.ok) {
          setDone(true);
          setName("");
          setPartySize("");
          setPhone("");
          return;
        }
        setError(res?.error ?? "접수에 실패했습니다.");
      }
    );
  }, [socket, connected, name, partySize, phone]);

  return (
    <div className="page reserve-page">
      <div className="reserve-shell">
        <h1 className="reserve-title">예약</h1>
        <p className="reserve-lead muted">이름 · 인원 · 연락처를 남겨 주세요.</p>

        {!connected && <p className="reserve-warn">서버에 연결하는 중…</p>}

        {done && (
          <div className="reserve-done" role="status">
            <p className="reserve-done-msg">예약이 접수되었습니다.</p>
            <button type="button" className="btn-primary btn-block" onClick={resetForm}>
              추가 예약하기
            </button>
          </div>
        )}

        {!done && (
          <form
            className="reserve-form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <label className="field-label">
              이름
              <input
                type="text"
                className="field-input wide"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoComplete="name"
                placeholder="홍길동"
              />
            </label>
            <label className="field-label">
              인원수
              <input
                type="number"
                className="field-input wide"
                min={1}
                max={99}
                inputMode="numeric"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                placeholder="예: 4"
              />
            </label>
            <label className="field-label">
              전화번호
              <input
                type="tel"
                className="field-input wide"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="01000000000"
              />
            </label>
            {error && <p className="reserve-error">{error}</p>}
            <button type="submit" className="btn-primary btn-block" disabled={!connected || sending}>
              {sending ? "접수 중…" : "예약하기"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
