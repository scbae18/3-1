/**
 * JSDoc 타입 정의 (런타임 import 없음)
 * @typedef {{ id: number, name: string, price: number, category: string, addonOnly?: boolean, hideFirstOrderBadge?: boolean, kitchenParts?: string[] }} MenuItem
 * @typedef {{ id: string, name: string, partySize: number, phone: string, createdAt: number }} Reservation
 * @typedef {{ menuId: number, name: string, price: number, qty: number, done?: boolean, lineKey?: string | null }} OrderLine
 * @typedef {{ id: string, table: string, items: OrderLine[], createdAt: number }} KitchenOrder
 * @typedef {{ timerStartedAt: number | null, bonusLimitMinutes?: number, coverQty?: number }} TableState
 * @typedef {{ menuId: number, name: string, category: string, qty: number, revenue: number }} SalesMenuLine
 * @typedef {{
 *   menuLines: SalesMenuLine[],
 *   totalRevenue: number,
 *   orderSubmitCount: number
 * }} SalesStatsSnapshot
 * @typedef {{
 *   menu: MenuItem[],
 *   soldOutIds: number[],
 *   kitchenQueue: KitchenOrder[],
 *   tables: Record<string, TableState>,
 *   settings: { defaultLimitMinutes: number, extensionMinutes: number },
 *   salesStats: SalesStatsSnapshot,
 *   reservations: Reservation[]
 * }} AppState
 */

export {};
