import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext.jsx";
import OrderPage from "./pages/OrderPage.jsx";
import KitchenPage from "./pages/KitchenPage.jsx";
import SystemPage from "./pages/SystemPage.jsx";
import StatsPage from "./pages/StatsPage.jsx";
import ReservePage from "./pages/ReservePage.jsx";
import ReservationsPage from "./pages/ReservationsPage.jsx";
import ResetAllPage from "./pages/ResetAllPage.jsx";

function AppShell() {
  const { pathname } = useLocation();
  /** 손님 예약 전용: 헤더·다른 탭 없음 */
  if (pathname === "/reserve" || pathname.startsWith("/reserve/")) {
    return <ReservePage />;
  }

  const wideLayout =
    pathname === "/kitchen" ||
    pathname === "/system" ||
    pathname === "/stats" ||
    pathname === "/reservations" ||
    pathname === "/reset";

  return (
    <>
      <header className="app-header">
        <strong className="app-title">주점 주문</strong>
        <nav className="app-nav">
          <NavLink end className={({ isActive }) => (isActive ? "nav-a active" : "nav-a")} to="/">
            주문서
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "nav-a active" : "nav-a")} to="/kitchen">
            주방
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "nav-a active" : "nav-a")} to="/system">
            시스템
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "nav-a active" : "nav-a")} to="/stats">
            매출
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "nav-a active" : "nav-a")} to="/reservations">
            예약
          </NavLink>
          <NavLink className={({ isActive }) => (isActive ? "nav-a active nav-a--reset" : "nav-a nav-a--reset")} to="/reset">
            전체 초기화
          </NavLink>
        </nav>
      </header>
      <main className={`app-main${wideLayout ? " app-main--wide" : ""}`}>
        <Routes>
          <Route path="/" element={<OrderPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/reservations" element={<ReservationsPage />} />
          <Route path="/reset" element={<ResetAllPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <SocketProvider>
      <AppShell />
    </SocketProvider>
  );
}
