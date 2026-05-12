/**
 * 메뉴 목록 — 운영 시 이 배열만 수정하면 됩니다.
 * addonOnly: true → 메인·사이드 등(주문서에서 「첫 주문 후」 배지용).
 * hideFirstOrderBadge: true → 해당 배지·강조 테두리 없음(예: 자릿세).
 * 자릿세(COVER_MENU_ID): 주방 조리 없음·시스템 인원(자릿세 수량 합) 집계.
 */
export const COVER_MENU_ID = 12;

export const MENU_LIST = [
  /* 세트 */
  { id: 1, name: "A세트 (제육볶음+주먹밥)", price: 14900, category: "세트" },
  { id: 2, name: "B세트 (소세지불닭+콘치즈)", price: 14900, category: "세트" },
  { id: 3, name: "C세트 (두부김치+계란찜)", price: 14900, category: "세트" },
  { id: 4, name: "D세트 (콘치즈+나초)", price: 10900, category: "세트" },
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
