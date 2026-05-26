# 수영대회 전광판 대시보드 시스템 — CLAUDE.md

## 프로젝트 개요
- **목적**: 수영대회 실시간 전광판 + 운영자 조작부 (듀얼 모니터)
- **Repository**: https://github.com/m3n89t-max/swimmdashboard.git
- **Stack**: Next.js 14 (App Router) · TypeScript · Tailwind CSS · Socket.io · Zustand · SQLite · Anthropic Claude API · Google Cloud TTS

---

## 디렉토리 구조
```
swimmdashboard/
├── app/
│   ├── admin/          # 조작부 (노트북)
│   │   ├── page.tsx        # 대시보드 메인
│   │   ├── upload/page.tsx # 엑셀 업로드
│   │   ├── control/page.tsx# 경기 진행 조작
│   │   └── announcer/page.tsx # AI 아나운서
│   ├── display/        # 전광판 (대형 TV)
│   │   ├── page.tsx        # 전광판 메인
│   │   ├── results/page.tsx# 경기 결과
│   │   └── waiting/page.tsx# 대기자 명단
│   └── api/
│       ├── events/route.ts # 대진표 CRUD
│       ├── records/route.ts# 기록 입력
│       ├── socket/route.ts # 실시간 동기화
│       └── announcer/route.ts # AI 아나운서
├── components/
│   ├── admin/          # 조작부 전용 컴포넌트
│   ├── display/        # 전광판 전용 컴포넌트
│   └── shared/         # 공통 컴포넌트
├── lib/
│   ├── db.ts           # SQLite 연결
│   ├── excel.ts        # SheetJS 엑셀 파싱
│   ├── socket.ts       # Socket.io 클라이언트
│   ├── tts.ts          # TTS API 래퍼
│   └── claude.ts       # Anthropic API 래퍼
├── store/
│   └── useGameStore.ts # Zustand 전역 상태
├── types/
│   └── index.ts        # 공통 TypeScript 타입
├── prisma/
│   └── schema.prisma   # DB 스키마
├── .eslintrc.json
├── .env.local.example
└── package.json
```

---

## 핵심 타입 정의 (`types/index.ts`)
```typescript
export interface Lane {
  lane: number;          // 1~8
  name: string;
  region: string;        // 예: S14
  team: string;
  record?: string;       // 결과 기록 (mm:ss.hh)
  rank?: number;
  status?: 'DNS' | 'DQ' | 'DSQ';
}

export interface Heat {
  id: string;
  eventNo: number;
  eventName: string;
  heatNo: number;
  category: string;
  lanes: Lane[];
  status: 'pending' | 'active' | 'completed';
}

export type DisplayMode =
  | 'results'     // 현재 경기 결과
  | 'waiting'     // 대기자 명단
  | 'ready'       // 출발대 이동 안내
  | 'ceremony'    // 시상
  | 'standby';    // 대기 화면
```

---

## 전광판 UI 규칙 (`app/display/`)
- **배경**: `bg-black` / 텍스트 최소 `text-3xl`
- **색상 체계**: 종목명 `text-cyan-400` · 헤더 `text-yellow-300` · 기록 `text-green-400` · 1위 `text-red-400`
- **레이아웃**: 8레인 균등 grid, 상하 `py-4` 이상
- **폰트**: `font-bold` 필수, 한글 `font-['Noto_Sans_KR']`

---

## 데이터베이스 스키마 (`prisma/schema.prisma`)
```prisma
model Event {
  id        String   @id @default(cuid())
  eventNo   Int
  eventName String
  heatNo    Int
  category  String
  status    String   @default("pending")
  lanes     Lane[]
  createdAt DateTime @default(now())
}

model Lane {
  id      String  @id @default(cuid())
  eventId String
  event   Event   @relation(fields: [eventId], references: [id])
  lane    Int
  name    String
  region  String
  team    String
  record  String?
  rank    Int?
  status  String?
}
```

---

## 엑셀 업로드 규칙 (`lib/excel.ts`)
```typescript
// 필수 컬럼: event_no, event_name, heat_no, lane, name, team, category
// 유효성 검사:
// - lane: 1~8 정수, 같은 heat 내 중복 불가
// - name / team: 빈값 불가
// - record: mm:ss.hh 형식 또는 '-'
const REQUIRED_COLS = ['event_no','event_name','heat_no','lane','name','team','category'];
```

---

## AI 아나운서 구현 (`lib/claude.ts`)
```typescript
// Anthropic Claude API로 방송 멘트 생성
async function generateAnnouncement(heat: Heat, type: 'intro' | 'result'): Promise<string> {
  // type=intro: 경기 시작 전 선수 소개
  // type=result: 결과 발표 (1~3위 낭독)
  // 반환: 자연스러운 한국어 방송 멘트 문자열
}

// TTS 변환 후 오디오 재생
async function speak(text: string): Promise<void> {
  // Google Cloud TTS 또는 CLOVA Voice API 호출
}
```

---

## 실시간 동기화 (`lib/socket.ts`)
```typescript
// 이벤트 목록
// 조작부 → 전광판
emit('heat:activate', heat)      // 경기 조 활성화
emit('record:update', { lane, record, rank }) // 기록 업데이트
emit('display:mode', mode)       // 화면 모드 전환
emit('announcer:play', text)     // 아나운서 방송

// 전광판 → 조작부
emit('display:ready')            // 전광판 연결 확인
```

---

## Zustand 전역 상태 (`store/useGameStore.ts`)
```typescript
interface GameStore {
  currentHeat: Heat | null;
  nextHeats: Heat[];           // 다음 대기 2개 조
  displayMode: DisplayMode;
  announcerEnabled: boolean;
  setCurrentHeat: (heat: Heat) => void;
  updateRecord: (lane: number, record: string) => void;
  setDisplayMode: (mode: DisplayMode) => void;
}
```

---

## 린터 & 포매터 설정

### `.eslintrc.json`
```json
{
  "extends": ["next/core-web-vitals", "plugin:@typescript-eslint/recommended"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "react-hooks/exhaustive-deps": "error"
  }
}
```

### `package.json` 스크립트
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "next lint --fix",
    "type-check": "tsc --noEmit",
    "validate": "npm run lint && npm run type-check && npm run test",
    "test": "jest --passWithNoTests",
    "prepare": "husky install"
  }
}
```

---

## 자동 검증 시스템

### Pre-commit Hook (`.husky/pre-commit`)
```bash
#!/bin/sh
npm run lint        # ESLint 자동 수정
npm run type-check  # TypeScript 타입 오류 확인
npm run test        # 유닛 테스트 실행
```

### GitHub Actions (`.github/workflows/ci.yml`)
```yaml
name: CI
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm run validate
      - run: npm run build
```

---

## GitHub 자동 커밋 규칙

### 커밋 메시지 형식
```
feat: 기능 추가
fix: 버그 수정
ui: 화면 변경
data: 데이터/DB 변경
chore: 설정 변경
```

### 작업 후 항상 실행할 Git 명령
```bash
git add -A
git commit -m "feat: [변경 내용 요약]"
git push origin main
```

> **Claude Code 규칙**: 파일 수정 완료 시마다 위 명령으로 자동 push.  
> Remote: `https://github.com/m3n89t-max/swimmdashboard.git`  
> Branch: `main`

---

## 환경변수 (`.env.local.example`)
```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY=""
GOOGLE_TTS_API_KEY=""
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
ADMIN_PIN="1234"
```

---

## 개발 시작 순서
1. `git clone https://github.com/m3n89t-max/swimmdashboard.git`
2. `npm install`
3. `.env.local.example` → `.env.local` 복사 후 키 입력
4. `npx prisma migrate dev`
5. `npm run dev` → http://localhost:3000/admin (조작부), /display (전광판)
6. 전광판 창을 TV 모니터로 드래그 후 F11 전체화면

---

## 전광판 화면 전환 자동화 로직
```typescript
// 경기 완료 → 30초 대기자 화면 → 10초 준비 안내 → 다음 경기 활성화
async function autoTransition(completedHeat: Heat) {
  setDisplayMode('waiting');       // 대기자 명단 표시
  await delay(30_000);
  setDisplayMode('ready');         // 출발대 이동 안내
  await delay(10_000);
  activateNextHeat();              // 다음 조 자동 활성화
}
```
