/**
 * Supabase(Postgres) 영속화 — SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 없으면 동작 안 함(인메모리만).
 * Node.js 20 등: Realtime용 내장 WebSocket이 없어 `ws`를 transport로 넘깁니다 (22+는 선택).
 */
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

/** @type {import("@supabase/supabase-js").SupabaseClient | null | undefined} */
let _client;

function getClient() {
  if (_client !== undefined) return _client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  _client = url && key
    ? createClient(url, key, {
        auth: { persistSession: false },
        realtime: { transport: ws },
      })
    : null;
  return _client;
}

export function isPersistenceEnabled() {
  return getClient() != null;
}

/**
 * @param {{ id: string, name: string, partySize: number, phone: string, createdAt: number }} entry
 */
export async function persistReservationInsert(entry) {
  const sb = getClient();
  if (!sb) return null;
  const { error } = await sb.from("reservations").insert({
    id: entry.id,
    name: entry.name,
    party_size: entry.partySize,
    phone: entry.phone,
    created_at: new Date(entry.createdAt).toISOString(),
  });
  return error;
}

/** @param {string} id */
export async function persistReservationSoftDelete(id) {
  const sb = getClient();
  if (!sb) return null;
  const { error } = await sb
    .from("reservations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  return error;
}

/**
 * @param {{ id: string, tableNumber: string, items: { menuId: number, name: string, price: number, qty: number }[] }} p
 */
export async function persistOrderEvent(p) {
  const sb = getClient();
  if (!sb) return null;
  const total_amount = p.items.reduce((s, it) => s + it.price * it.qty, 0);
  const { error } = await sb.from("order_events").insert({
    id: p.id,
    table_number: p.tableNumber,
    items: p.items,
    total_amount,
  });
  return error;
}

export async function persistShopSettingsFromState(state) {
  const sb = getClient();
  if (!sb) return null;
  const sold = [...state.soldOutIds];
  const { error } = await sb.from("shop_settings").upsert(
    {
      id: 1,
      default_limit_minutes: Math.max(1, Math.floor(Number(state.settings.defaultLimitMinutes) || 90)),
      extension_minutes: Math.max(1, Math.floor(Number(state.settings.extensionMinutes) || 60)),
      sold_out_ids: sold,
    },
    { onConflict: "id" }
  );
  return error;
}

/** 주문 이벤트·예약(미삭제)·매출·주방·테이블 초기화. 설정 행의 분 값은 유지, 품절 배열만 비움. */
export async function clearOperationalTables() {
  const sb = getClient();
  if (!sb) return null;
  const t0 = new Date(0).toISOString();
  const { error: e0a } = await sb.from("kitchen_orders").delete().gte("created_at", t0);
  if (e0a) return e0a;
  const { error: e0b } = await sb.from("table_live_state").delete().not("table_number", "is", null);
  if (e0b) return e0b;
  const { error: e1 } = await sb.from("order_events").delete().gte("created_at", t0);
  if (e1) return e1;
  const { error: e2 } = await sb.from("reservations").update({ deleted_at: new Date().toISOString() }).is("deleted_at", null);
  if (e2) return e2;
  const { error: e3 } = await sb.from("shop_settings").update({ sold_out_ids: [] }).eq("id", 1);
  return e3;
}

/**
 * @param {{ id: string, table: string, items: { menuId: number, name: string, price: number, qty: number, done?: boolean, lineKey?: string }[], createdAt: number }} order
 */
export async function persistKitchenOrderInsert(order) {
  const sb = getClient();
  if (!sb) return null;
  const items = order.items.map((it) => ({
    menuId: it.menuId,
    name: it.name,
    price: it.price,
    qty: it.qty,
    done: Boolean(it.done),
    lineKey: it.lineKey ?? null,
  }));
  const { error } = await sb.from("kitchen_orders").insert({
    id: order.id,
    table_number: order.table,
    items,
    created_at: new Date(order.createdAt).toISOString(),
  });
  return error;
}

/**
 * @param {{ id: string, items: { menuId: number, name: string, price: number, qty: number, done?: boolean, lineKey?: string }[] }} order
 */
export async function persistKitchenOrderItems(order) {
  const sb = getClient();
  if (!sb) return null;
  const items = order.items.map((it) => ({
    menuId: it.menuId,
    name: it.name,
    price: it.price,
    qty: it.qty,
    done: Boolean(it.done),
    lineKey: it.lineKey ?? null,
  }));
  const { error } = await sb.from("kitchen_orders").update({ items }).eq("id", order.id);
  return error;
}

/** @param {string} orderId */
export async function persistKitchenOrderDelete(orderId) {
  const sb = getClient();
  if (!sb) return null;
  const { error } = await sb.from("kitchen_orders").delete().eq("id", orderId);
  return error;
}

/**
 * @param {string} tableKey
 * @param {{ timerStartedAt: number | null, bonusLimitMinutes: number, coverQty: number }} ts
 */
export async function persistTableLive(tableKey, ts) {
  const sb = getClient();
  if (!sb) return null;
  const { error } = await sb.from("table_live_state").upsert(
    {
      table_number: tableKey,
      timer_started_at: ts.timerStartedAt != null ? new Date(ts.timerStartedAt).toISOString() : null,
      bonus_limit_minutes: Math.max(0, Math.floor(Number(ts.bonusLimitMinutes) || 0)),
      cover_qty: Math.max(0, Math.floor(Number(ts.coverQty) || 0)),
    },
    { onConflict: "table_number" }
  );
  return error;
}

/** 테이블 초기화: 해당 테이블 주방 행·타이머 행 삭제 */
export async function persistTableSessionReset(tableKey) {
  const sb = getClient();
  if (!sb) return null;
  const t = String(tableKey).trim();
  if (!t) return null;
  const { error: e1 } = await sb.from("kitchen_orders").delete().eq("table_number", t);
  if (e1) return e1;
  const { error: e2 } = await sb.from("table_live_state").delete().eq("table_number", t);
  return e2;
}

/**
 * @param {object} state
 * @param {any[]} rows
 */
function rebuildSalesStatsFromOrderRows(state, rows) {
  state.salesStats = {
    byMenuId: /** @type {Record<number, { qty: number, revenue: number }>} */ ({}),
    totalRevenue: 0,
    orderSubmitCount: 0,
  };
  for (const row of rows) {
    const items = row.items;
    if (!Array.isArray(items)) continue;
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
}

/**
 * @param {object} state — server state (mutates reservations, settings, soldOutIds, salesStats, kitchenQueue, tables)
 */
export async function bootstrapPersistence(state) {
  const sb = getClient();
  if (!sb) {
    // eslint-disable-next-line no-console
    console.log("[db] Supabase 미설정 — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 없으면 인메모리만 사용합니다.");
    return;
  }

  const { data: shop, error: shopErr } = await sb.from("shop_settings").select("*").eq("id", 1).maybeSingle();
  if (shopErr) {
    // eslint-disable-next-line no-console
    console.error("[db] shop_settings 로드 실패:", shopErr.message);
  } else if (shop) {
    state.settings.defaultLimitMinutes = Math.max(1, Math.floor(Number(shop.default_limit_minutes) || 90));
    state.settings.extensionMinutes = Math.max(1, Math.floor(Number(shop.extension_minutes) || 60));
    const arr = Array.isArray(shop.sold_out_ids) ? shop.sold_out_ids : [];
    state.soldOutIds = new Set(arr.map((n) => Math.floor(Number(n))).filter((n) => Number.isFinite(n)));
  }

  const { data: resRows, error: resErr } = await sb
    .from("reservations")
    .select("id,name,party_size,phone,created_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (resErr) {
    // eslint-disable-next-line no-console
    console.error("[db] reservations 로드 실패:", resErr.message);
  } else {
    state.reservations = (resRows || []).map((row) => ({
      id: row.id,
      name: row.name,
      partySize: row.party_size,
      phone: row.phone,
      createdAt: new Date(row.created_at).getTime(),
    }));
  }

  const { data: orderRows, error: ordErr } = await sb
    .from("order_events")
    .select("id,items,total_amount,created_at")
    .order("created_at", { ascending: true });
  if (ordErr) {
    // eslint-disable-next-line no-console
    console.error("[db] order_events 로드 실패:", ordErr.message);
  } else {
    rebuildSalesStatsFromOrderRows(state, orderRows || []);
  }

  const { data: kRows, error: kErr } = await sb
    .from("kitchen_orders")
    .select("id,table_number,items,created_at")
    .order("created_at", { ascending: true });
  if (kErr) {
    // eslint-disable-next-line no-console
    console.error("[db] kitchen_orders 로드 실패:", kErr.message);
  } else {
    state.kitchenQueue = (kRows || []).map((row) => {
      const raw = Array.isArray(row.items) ? row.items : [];
      return {
        id: row.id,
        table: row.table_number,
        items: raw.map((it, i) => ({
          menuId: Math.floor(Number(it.menuId)),
          name: String(it.name ?? ""),
          price: Number(it.price) || 0,
          qty: Math.max(0, Math.floor(Number(it.qty) || 0)),
          done: Boolean(it.done),
          lineKey:
            typeof it.lineKey === "string" && it.lineKey.length > 0 ? it.lineKey : `legacy-${row.id}-${i}`,
        })),
        createdAt: new Date(row.created_at).getTime(),
      };
    });
  }

  const { data: tRows, error: tErr } = await sb.from("table_live_state").select("*");
  if (tErr) {
    // eslint-disable-next-line no-console
    console.error("[db] table_live_state 로드 실패:", tErr.message);
  } else {
    for (const row of tRows || []) {
      const key = String(row.table_number ?? "").trim();
      if (!key) continue;
      state.tables[key] = {
        timerStartedAt: row.timer_started_at ? new Date(row.timer_started_at).getTime() : null,
        bonusLimitMinutes: Math.max(0, Math.floor(Number(row.bonus_limit_minutes) || 0)),
        coverQty: Math.max(0, Math.floor(Number(row.cover_qty) || 0)),
      };
    }
  }

  // eslint-disable-next-line no-console
  console.log("[db] Supabase 연동됨 — 예약·주문(매출)·설정/품절·주방·테이블 로드 완료");
}
