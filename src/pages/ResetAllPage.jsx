import { useCallback, useEffect, useState } from "react";
import { useAppSocket } from "../context/SocketContext.jsx";

/**
 * 전체 초기화 전용 화면. 확인 모달 후에만 서버로 전송.
 */
export default function ResetAllPage() {
  const { socket, connected } = useAppSocket();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  const runReset = useCallback(() => {
    socket.emit("system:resetAll");
    setModalOpen(false);
  }, [socket]);

  return (
    <div className="page reset-all-page">
      <div className="reset-all-top">
        <h1 className="reset-all-h1">전체 초기화</h1>
        <span className={`conn large ${connected ? "ok" : ""}`}>{connected ? "연결됨" : "연결 끊김"}</span>
      </div>

      <section className="reset-all-card">
        <p className="reset-all-lead">
          주방 대기 주문, 모든 테이블 타이머, 매출 집계, 품절 표시, <strong>예약 목록</strong>을 한 번에 지웁니다.
        </p>
        <p className="muted reset-all-note">기본·연장 시간(분) 설정은 그대로 유지됩니다. 되돌릴 수 없습니다.</p>
        <button
          type="button"
          className="btn-danger btn-block reset-all-trigger"
          disabled={!connected}
          onClick={() => setModalOpen(true)}
        >
          전체 초기화
        </button>
      </section>

      {modalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setModalOpen(false)}>
          <div
            className="modal-panel modal-panel--danger"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="reset-modal-title" className="modal-title">
              정말 전체 초기화할까요?
            </h2>
            <p className="modal-body">
              주방·테이블·매출·품절·예약 내역이 모두 사라지며 <strong>복구할 수 없습니다</strong>.
            </p>
            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
                취소
              </button>
              <button type="button" className="btn-danger" onClick={runReset}>
                초기화 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
