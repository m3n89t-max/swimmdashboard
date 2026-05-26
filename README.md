# 🏊 수영대회 전광판 시스템

노트북(조작부) + 대형 TV(전광판) 듀얼 확장 모드를 위한 실시간 수영대회 운영 시스템

---

## 📋 기능

| 화면 | 경로 | 설명 |
|------|------|------|
| **조작부** (노트북) | `/admin` | 대진표 업로드, 기록 입력, 전광판 제어 |
| **전광판** (대형 TV) | `/display` | 실시간 경기 결과, 대기자 명단, 출발대 안내 |

### 전광판 모드
- `results` — 현재 경기 레인별 선수/기록/순위
- `waiting` — 다음 경기 대기자 명단 (최대 3조)
- `ready` — 출발대 이동 안내 + 선수 그리드
- `standby` — 대기 화면 (시계 표시)

---

## 🚀 시작하기

### 1. 설치
```bash
npm install
```

### 2. 환경변수
`.env.local` 파일에 입력:
```env
DATABASE_URL="file:./dev.db"
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_TTS_API_KEY="AIzaSy..."
NEXT_PUBLIC_SOCKET_URL="http://localhost:3000"
ADMIN_PIN="1234"
```

### 3. DB 초기화
```bash
npm run db:migrate
```

### 4. 서버 실행

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
