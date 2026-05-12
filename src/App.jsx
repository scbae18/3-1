import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import { SocketProvider } from "./context/SocketContext.jsx";
import OrderPage from "./pages/OrderPage.jsx";
import KitchenPage from "./pages/KitchenPage.jsx";
import SystemPage from "./pages/SystemPage.jsx";
import StatsPage from "./pages/StatsPage.jsx";

function App() {
  const { pathname } = useLocation();
  const wideLayout = pathname === "/kitchen" || pathname === "/system" || pathname === "/stats";

  return (
    <SocketProvider>
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
        </nav>
      </header>
      <main className={`app-main${wideLayout ? " app-main--wide" : ""}`}>
        <Routes>
          <Route path="/" element={<OrderPage />} />
          <Route path="/kitchen" element={<KitchenPage />} />
          <Route path="/system" element={<SystemPage />} />
          <Route path="/stats" element={<StatsPage />} />
        </Routes>
      </main>
    </SocketProvider>
  );
}

export default App;
