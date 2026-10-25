/** 관리자 대시보드 카드·상단 메뉴(대시보드 제외) 공통 항목 */
export type AdminSectionMenuItem = {
  href: string;
  label: string;
};

/** 대시보드 카드 하단 링크 버튼 문구 */
export const ADMIN_DASHBOARD_CARD_ACTION_LABEL = '바로 가기';

export const ADMIN_SECTION_MENU: AdminSectionMenuItem[] = [
  {
    href: '/admin/users',
    label: '회원',
  },
  {
    href: '/admin/jobs/crawl-runs',
    label: '채용 정보',
  },
  {
    href: '/admin/inquiries',
    label: '문의',
  },
  {
    href: '/admin/withdrawals',
    label: '회원 탈퇴',
  },
  {
    href: '/admin/notices',
    label: '공지사항',
  },
];

export const ADMIN_DASHBOARD_TITLE = '대시보드';

export const ADMIN_DASHBOARD_DESCRIPTION = '서비스 운영 현황을 한눈에 확인합니다.';

export const ADMIN_HEADER_NAV = [
  { href: '/admin', label: '대시보드', exact: true as const },
  ...ADMIN_SECTION_MENU.map((item) => ({
    href: item.href,
    label: item.label,
    exact: false as const,
  })),
];
