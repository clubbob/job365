'use client';

/** 조회는 비로그인 허용. 등록 화면에서만 로그인을 검사합니다. */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  return children;
}
