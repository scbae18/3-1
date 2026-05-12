/**
 * 메뉴 목록 — 운영 시 이 배열만 수정하면 됩니다.
 * addonOnly: true → 메인·사이드 등(주문서에서 「첫 주문 후」 배지용).
 * hideFirstOrderBadge: true → 해당 배지·강조 테두리 없음(예: 자릿세).
 * kitchenParts: 세트만. 주방에서는 이 이름들로 각각 조리 완료 줄이 생김.
 * 자릿세(COVER_MENU_ID): 주방 조리 없음·시스템 인원(자릿세 수량 합) 집계.
 */
export const COVER_MENU_ID = 12;

export const MENU_LIST = [
  /* 세트 — kitchenParts: 주방에서 조리 완료를 메뉴별로 나누어 표시 */
  { id: 1, name: "A세트 (제육볶음+주먹밥)", price: 14900, category: "세트", kitchenParts: ["제육볶음", "주먹밥"] },
  { id: 2, name: "B세트 (소세지불닭+콘치즈)", price: 14900, category: "세트", kitchenParts: ["소세지불닭", "콘치즈"] },
  { id: 3, name: "C세트 (두부김치+계란찜)", price: 14900, category: "세트", kitchenParts: ["두부김치", "계란찜"] },
  { id: 4, name: "D세트 (콘치즈+나초)", price: 10900, category: "세트", kitchenParts: ["콘치즈", "나초"] },
  /* 메인 — 추가 주문용 */
  { id: 5, name: "제육볶음", price: 11900, category: "메인", addonOnly: true },
  { id: 6, name: "두부김치", price: 11900, category: "메인", addonOnly: true },
  { id: 7, name: "소세지불닭", price: 10900, category: "메인", addonOnly: true },
  /* 사이드 — 추가 주문용 */
  { id: 8, name: "주먹밥", price: 5900, category: "사이드", addonOnly: true },
  { id: 9, name: "나초", price: 5900, category: "사이드", addonOnly: true },
  { id: 10, name: "계란찜", price: 5900, category: "사이드", addonOnly: true },
  { id: 11, name: "콘치즈", price: 5900, category: "사이드", addonOnly: true },
  /* 기타 */
  { id: COVER_MENU_ID, name: "자릿세", price: 2900, category: "기타", addonOnly: true, hideFirstOrderBadge: true },
];

/**
 * 주방 큐용: 세트는 구성 메뉴 각각 한 줄, 그 외 메뉴는 그대로 한 줄.
 * @param {{ menuId: number, name: string, price: number, qty: number }[]} items
 * @returns {{ menuId: number, name: string, price: number, qty: number }[]}
 */
export function expandKitchenLines(items) {
  const out = [];
  for (const it of items) {
    const m = MENU_LIST.find((x) => x.id === it.menuId);
    const parts = m?.kitchenParts;
    if (Array.isArray(parts) && parts.length > 0) {
      for (const partName of parts) {
        out.push({
          menuId: it.menuId,
          name: String(partName),
          price: 0,
          qty: it.qty,
        });
      }
    } else {
      out.push({ menuId: it.menuId, name: it.name, price: it.price, qty: it.qty });
    }
  }
  return out;
}
