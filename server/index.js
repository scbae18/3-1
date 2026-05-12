/**
 * 주점 주문 관리 — Express + Socket.io 서버
 * 상태는 전부 인메모리이며 재시작 시 초기화됩니다.
 */

import express from "express";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import { MENU_LIST } from "../shared/menu.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3002;
const distDir = path.join(__dirname, "..", "dist");
const distIndex = path.join(distDir, "index.html");
/** 빌드 산출물이 있으면 단일 포트로 정적 호스팅 (npm start) */
const hasDist = fs.existsSync(distIndex);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: !hasDist
    ? { origin: ["http://127.0.0.1:5173", "http://localhost:5173"], methods: ["GET", "POST"] }
    : undefined,
});

/** @typedef {{ menuId: number, name: string, price: number, qty: number, done?: boolean, lineKey?: string }} OrderLine */
/** @typedef {{ id: string, table: string, items: OrderLine[], createdAt: number }} KitchenOrder */

/** @type {{ timerStartedAt: number | null, bonusLimitMinutes: number }} */
const defaultTableState = () => ({ timerStartedAt: null, bonusLimitMinutes: 0 });

/** 서버 단일 상태 */
const state = {
  soldOutIds: new Set(),
  kitchenQueue: /** @type {KitchenOrder[]} */ ([]),
  /** 테이블별: timerStartedAt 고정, bonusLimitMinutes는 「시간 연장」마다 extensionMinutes만큼 가산 */
  tables: /** @type {Record<string, { timerStartedAt: number | null, bonusLimitMinutes: number }>} */ ({}),
  settings: {
    /** 경고까지 기본 허용 시간(분) */
    defaultLimitMinutes: 90,
    /** 「시간 연장」 한 번당 제한 시간에 더해지는 분(타이머는 그대로) */
    extensionMinutes: 30,
  },
  /** 매출 집계: 「주문 완료」 접수 기준(인메모리, 서버 재시작 시 초기화) */
  salesStats: {
    /** menuId -> 누적 */
    byMenuId: /** @type {Record<number, { qty: number, revenue: number }>} */ ({}),
    totalRevenue: 0,
    /** 주문 완료 버튼이 성공한 횟수 */
    orderSubmitCount: 0,
  },
};

function randomId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** 클라이언트로 보낼 직렬화 가능한 스냅샷 */
function getSnapshot() {
  return {
    menu: MENU_LIST,
    soldOutIds: [...state.soldOutIds],
    kitchenQueue: state.kitchenQueue.map((o) => ({
      ...o,
      items: o.items.map((i) => ({
        ...i,
        done: Boolean(i.done),
        lineKey: i.lineKey ?? null,
      })),
    })),
    tables: Object.fromEntries(
      Object.entries(state.tables).map(([k, v]) => {
        const bonus = Math.max(0, Math.floor(Number(v.bonusLimitMinutes) || 0));
        return [
          k,
          {
            timerStartedAt: v.timerStartedAt,
            bonusLimitMinutes: bonus,
          },
        ];
      })
    ),
    settings: { ...state.settings },
    salesStats: {
      menuLines: MENU_LIST.map((m) => {
        const row = state.salesStats.byMenuId[m.id];
        return {
          menuId: m.id,
          name: m.name,
          category: m.category,
          qty: row?.qty ?? 0,
          revenue: row?.revenue ?? 0,
        };
      }),
      totalRevenue: state.salesStats.totalRevenue,
      orderSubmitCount: state.salesStats.orderSubmitCount,
    },
  };
}

function broadcastState() {
  io.emit("state", getSnapshot());
}

/** 「주문 완료」로 접수된 품목 기준 매출·수량 누적 */
function recordSalesFromItems(items) {
  let batch = 0;
  for (const it of items) {
    batch += it.price * it.qty;
    const prev = state.salesStats.byMenuId[it.menuId] || { qty: 0, revenue: 0 };
    state.salesStats.byMenuId[it.menuId] = {
      qty: prev.qty + it.qty,
      revenue: prev.revenue + it.price * it.qty,
    };
  }
  state.salesStats.totalRevenue += batch;
  state.salesStats.orderSubmitCount += 1;
}

/**
 * 주문 접수: 주방 큐 추가. 타이머는 해당 테이블에 처음 주문이 들어올 때만 시작(추가 주문은 타이머 건드리지 않음).
 */
function submitOrder(tableRaw, items) {
  const table = String(tableRaw).trim();
  if (!table) return { ok: false, error: "테이블 번호를 입력하세요." };
  if (!items.length) return { ok: false, error: "주문할 메뉴를 선택하세요." };

  for (const it of items) {
    if (state.soldOutIds.has(it.menuId)) {
      return { ok: false, error: `품절 메뉴가 포함되어 있습니다: ${it.name}` };
    }
  }

  recordSalesFromItems(items);

  const order = {
    id: randomId(),
    table,
    items: items.map((i) => ({ ...i, done: false, lineKey: randomId() })),
    createdAt: Date.now(),
  };
  state.kitchenQueue.push(order);

  if (!state.tables[table]) {
    state.tables[table] = defaultTableState();
  }
  const ts = state.tables[table];
  if (ts.timerStartedAt == null) {
    ts.timerStartedAt = Date.now();
  }

  return { ok: true };
}

io.on("connection", (socket) => {
  socket.emit("state", getSnapshot());

  socket.on("order:submit", (payload, ack) => {
    const { table, quantities } = payload || {};
    const q = quantities && typeof quantities === "object" ? quantities : {};
    const items = [];
    for (const m of MENU_LIST) {
      const qty = Math.max(0, Math.floor(Number(q[m.id]) || 0));
      if (qty > 0) items.push({ menuId: m.id, name: m.name, price: m.price, qty });
    }
    const res = submitOrder(table, items);
    if (res.ok) broadcastState();
    if (typeof ack === "function") ack(res);
    if (!res.ok && res.error) socket.emit("error:toast", res.error);
  });

  /** 메뉴(라인) 단위 조리 완료 — 해당 줄만 완료 처리, 모두 완료 시 카드 제거 */
  socket.on("kitchen:completeLine", (payload) => {
    const orderId = payload?.orderId;
    const lineKey = typeof payload?.lineKey === "string" ? payload.lineKey : "";
    const order = state.kitchenQueue.find((o) => o.id === orderId);
    if (!order?.items?.length) return;

    let idx = -1;
    if (lineKey) {
      idx = order.items.findIndex((it) => it.lineKey === lineKey);
    }
    if (idx < 0 && payload?.lineIndex !== undefined && payload?.lineIndex !== null && payload?.lineIndex !== "") {
      const n = parseInt(String(payload.lineIndex), 10);
      if (Number.isInteger(n) && n >= 0 && n < order.items.length) idx = n;
    }
    if (idx < 0) return;

    for (const it of order.items) {
      if (it.done !== true && it.done !== false) it.done = false;
    }

    const line = order.items[idx];
    if (!line || line.done === true) return;
    line.done = true;

    const allDone = order.items.every((it) => it.done === true);
    if (allDone) {
      const qidx = state.kitchenQueue.findIndex((o) => o.id === orderId);
      if (qidx >= 0) state.kitchenQueue.splice(qidx, 1);
    }
    broadcastState();
  });

  socket.on("kitchen:soldOut:toggle", (menuId) => {
    const id = Number(menuId);
    if (!MENU_LIST.some((m) => m.id === id)) return;
    if (state.soldOutIds.has(id)) state.soldOutIds.delete(id);
    else state.soldOutIds.add(id);
    broadcastState();
  });

  /** 시간 연장: 경과 시간은 유지, 허용 제한 시간만 extensionMinutes만큼 가산 */
  socket.on("system:extend", (tableRaw) => {
    const table = String(tableRaw).trim();
    if (!table || !state.tables[table]) return;
    const ts = state.tables[table];
    const add = Math.max(1, Math.floor(Number(state.settings.extensionMinutes) || 30));
    ts.bonusLimitMinutes = Math.max(0, Math.floor(Number(ts.bonusLimitMinutes) || 0)) + add;
    broadcastState();
  });

  socket.on("system:resetTable", (tableRaw) => {
    const table = String(tableRaw).trim();
    if (!table) return;
    delete state.tables[table];
    state.kitchenQueue = state.kitchenQueue.filter((o) => o.table !== table);
    broadcastState();
  });

  /** 주방 대기·테이블 타이머·매출 집계·품절 표시까지 한 번에 비움(설정값은 유지) */
  socket.on("system:resetAll", () => {
    state.kitchenQueue = [];
    state.tables = {};
    state.soldOutIds.clear();
    state.salesStats = {
      byMenuId: {},
      totalRevenue: 0,
      orderSubmitCount: 0,
    };
    broadcastState();
  });

  socket.on("system:setDefaultLimitMinutes", (minutes) => {
    state.settings.defaultLimitMinutes = Math.max(1, Math.floor(Number(minutes) || 90));
    broadcastState();
  });

  socket.on("system:setExtensionMinutes", (minutes) => {
    state.settings.extensionMinutes = Math.max(1, Math.floor(Number(minutes) || 30));
    broadcastState();
  });
});

if (hasDist) {
  app.use(express.static(distDir));
  app.get("*", (_req, res) => {
    res.sendFile(distIndex);
  });
}

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(
      `[server] 포트 ${PORT}가 이미 사용 중입니다. 이전에 실행한 node 서버를 종료하거나 다른 포트를 쓰세요.\n` +
        `  PowerShell: $env:PORT=3001; npm start\n` +
        `  CMD: set PORT=3001&& npm start\n` +
        `  사용 중 PID 확인: netstat -ano | findstr ":${PORT}"`
    );
  } else {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  process.exit(1);
});

const listenHost = process.env.LISTEN_HOST ?? "0.0.0.0";

server.listen(PORT, listenHost, () => {
  // eslint-disable-next-line no-console
  if (hasDist) {
    console.log(
      `[server] 웹 + Socket.io 포트 ${PORT} (바인딩: ${listenHost})\n` +
        `  • 이 머신 안에서만 볼 때: http://127.0.0.1:${PORT}\n` +
        `  • EC2/클라우드에서는 브라우저에 퍼블릭 IP(또는 도메인)로 접속: http://<퍼블릭IP>:${PORT}\n` +
        `    (127.0.0.1은 "내 PC"라서 다른 기기에서는 동작하지 않습니다.)`
    );
  } else {
    console.log(
      `[server] Socket.io http://127.0.0.1:${PORT} — 프론트는 Vite(5173)에서 실행하세요.`
    );
  }
});
