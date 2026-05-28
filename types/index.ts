// ─── 레인 ────────────────────────────────────────────────────────────────────
export interface Lane {
  lane: number;        // 1~8
  name: string;        // 계영(릴레이)은 쉼표 구분: "배민준, 배연지"
  region: string;      // 등급: S14, S7, 비장애 등
  team: string;        // 소속 팀
  notes?: string;      // 비고: 중등, 고등 등
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
  event_no: number;     // 종목번호 (예: 101, 102)
  event_name: string;   // 종목명 (예: 계영 100M S14/비장애 중등,고등 통합)
  heat_no: number;      // 조 번호
  category: string;     // 부문 (예: 일반부, 중등,고등 통합)
  lane: number;         // 레인 (1~8)
  name: string;         // 성명 (계영은 "이름1, 이름2")
  team: string;         // 소속
  region?: string;      // 등급 (S14, S7, 비장애 등)
  notes?: string;       // 비고 (중등, 고등 등)
}
