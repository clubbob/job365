# JobLink 365

파트타임부터 정규직까지, 100% 무료 이용·매칭 서비스

## 시작하기

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 을 엽니다.

`.env.example`을 복사해 `.env.local`을 만들고, **job365 전용 Firebase 프로젝트** 값을 채웁니다. lumi365 Firebase는 재사용하지 않습니다.

## 문서

- [기획서 v2.5](./docs/기획서.md)
- [개발 로드맵](./docs/ROADMAP.md)

## MVP 단계

1. 프로젝트 세팅 & 공통 레이아웃
2. 인증 (구직자 / 기업)
3. 공고 작성 + 사업자 검증
4. 공고 조회 & 지원
5. 마이페이지 & 알림
6. 애드센스 & 관리자

## 채용 공고 자동 수집

| 항목 | 내용 |
|------|------|
| 일정 | 매일 **06:00 (한국 시간)** GitHub Actions **1회** |
| 대기업·계열 | 매일 **전부** 수집 |
| 중견기업 | 연결된 채용 URL **하루 900곳** 순환 → **약 7일**에 전체 한 바퀴 |
| 실행 시간 | 최대 **2시간** (GitHub). **Vercel**은 사이트만 — 수집 비용 거의 없음 |
| 수동 전체 | 로컬 `pnpm crawl` (Firebase Admin 설정 필요) |
| 중견만 대량 | `pnpm crawl:mid-sized` — **자동 수집과 별도** |

배치 크기는 `src/lib/crawler/schedule.ts`의 `CRAWL_MID_SIZED_SITES_PER_RUN`과 `.github/workflows/crawl-daily.yml`에서 맞춥니다.

Firestore 복합 인덱스 배포: `firebase deploy --only firestore:indexes`
