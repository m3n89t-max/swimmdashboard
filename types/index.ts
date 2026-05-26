// ─── 레인 ────────────────────────────────────────────────────────────────────
export interface Lane {
  lane: number;        // 1~8
  name: string;
  region: string;      // 지역코드 예: S14
  team: string;
  record?: string;     // mm:ss.hh  또는 '-'
  rank?: number;
  status?: 'DNS' | 'DQ' | 'DSQ';
}

// ─── 조(Heat) ─────────────────────────────────────────────────────────────────
export interface Heat {
  id: string;
  eventNo: number;
  eventName: string;   // 예: 남자 자유형 50m
  heatNo: number;
  category: string;    // 예: 일반부
  lanes: Lane[];
  status: 'pending' | 'active' | 'completed';
}

// ─── 전광판 모드 ────────────────────────────────────────────────────────────────
export type DisplayMode =
  | 'results'    // 현재 경기 결과
  | 'waiting'    // 대기자 명단
  | 'ready'      // 출발대 이동 안내
  | 'ceremony'   // 시상
  | 'standby';   // 대기 화면

// ─── Socket 이벤트 페이로드 ───────────────────────────────────────────────────
export interface RecordUpdatePayload {
  lane: number;
  record: string;
  rank?: number;
  status?: 'DNS' | 'DQ' | 'DSQ';
}

export interface SocketEvents {
  // 조작부 → 전광판
  'heat:activate': (heat: Heat) => void;
  'record:update': (payload: RecordUpdatePayload) => void;
  'display:mode': (mode: DisplayMode) => void;
  'announcer:play': (text: string) => void;
  // 전광판 → 조작부
  'display:ready': () => void;
}

// ─── API 응답 래퍼 ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

// ─── 엑셀 업로드 행 ───────────────────────────────────────────────────────────
export interface ExcelRow {
  event_no: number;
  event_name: string;
  heat_no: number;
  category: string;
  lane: number;
  name: string;
  team: string;
  region?: string;
}
