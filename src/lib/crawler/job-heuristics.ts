/** 채용 공고가 아닌 안내·메뉴 링크 제목 */
const NAV_TITLE_PATTERN =
  /^(홈|home|메뉴|menu|더보기|자세히|이전|다음|로그인|login|회원가입|signup|about|careers?|jobs?|people|culture|marketing|faq|qna|문의|공지|공지사항|채용정보|지원하기|지원현황|인재풀|본문\s*바로가기|컨텐츠\s*바로가기|주\s*내용으로\s*건너뛰기|그룹소개|그룹비전|회사소개|사조소개|합류\s*여정|팀\s*문화|자주\s*묻는\s*질문|아티클|소개|비전|이용약관|개인정보|오케이금융그룹|ok\s*소개|채용\s*중인\s*공고|채용프로세스|인재개발시스템)$/i;

const NAV_TITLE_CONTAINS_PATTERN =
  /바로가기|그룹소개|함께\s*가는\s*친구|인재상|자주\s*묻는\s*질문|팀\s*문화|합류\s*여정|금융그룹↗|지원현황|인재풀\s*등록|사조소개|그룹비전|페이지\s*에러|헤드라인\s*-|채용기관\s*사이트|사이트로\s*이동|홈페이지로\s*이동|(?:으로?\s*)?이동하기$/i;

/** 직원 소개·인터뷰 페이지 (팀 + 이름 + 직급) */
const EMPLOYEE_PROFILE_TITLE_PATTERN =
  /팀\s+[가-힣]{2,5}\s+(대리|과장|차장|부장|사원|팀장|주임|선임|책임|이사|프로)$/;

/** 공고 제목에 흔히 나오는 채용 관련 표현 (팀명·직무 단어만으로는 통과하지 않음) */
const JOB_TITLE_SIGNAL_PATTERN =
  /채용|모집|공고|채용공고|신입|경력사원|인턴|정규직|계약직|엔지니어|engineer|developer|designer|manager|director|lead|architect|analyst|scientist|researcher|보안|security|legal|hr|finance|accountant|product|full\s*stack|\d{4}\s*년|\[[^\]]{2,}\]/i;

/** 공고 상세 URL에 흔한 경로 */
const JOB_URL_PATTERN =
  /\/(?:job-detail|jobs?\/\d|recruit\/\d|notice\/\d|announcement\/\d|position\/\d|opening\/\d|applyView|view\?|detail\/[A-Za-z0-9_-]+|detail\?|jobNoticeId=|noticeId=|recruitId=|jobId=|recuCls=|rtSeq=|\/o\/\d+|\d{4,})|\?no=\d+/i;

/** 안내·목록·인터뷰 페이지 URL */
const NAV_URL_PATTERN =
  /\/(?:faq|culture|joining-guide|joining|article|about|intro|vision|guide|hero|terms|privacy|login|signup|member|qna|interview|notice\/list|recruit\/list|jobs?\/list|career\/jobs\/?$|career\/faq|career\/culture|career\/article|career\/joining|#)/i;

export function isLikelyJobTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 8 || trimmed.length > 120) return false;
  if (NAV_TITLE_PATTERN.test(trimmed)) return false;
  if (NAV_TITLE_CONTAINS_PATTERN.test(trimmed)) return false;
  if (EMPLOYEE_PROFILE_TITLE_PATTERN.test(trimmed)) return false;
  return JOB_TITLE_SIGNAL_PATTERN.test(trimmed);
}

export function isLikelyJobUrl(url: string): boolean {
  try {
    const { pathname, search } = new URL(url);
    const path = `${pathname}${search}`;
    if (NAV_URL_PATTERN.test(path)) return false;
    return JOB_URL_PATTERN.test(path);
  } catch {
    return false;
  }
}

export function isListingPageUrl(applyUrl: string, careersUrl: string): boolean {
  try {
    const apply = new URL(applyUrl);
    const careers = new URL(careersUrl);
    if (apply.origin !== careers.origin) return false;
    const applyPath = apply.pathname.replace(/\/$/, '') || '/';
    const careersPath = careers.pathname.replace(/\/$/, '') || '/';
    return applyPath === careersPath;
  } catch {
    return false;
  }
}

export function isLikelyJobPosting(title: string, applyUrl: string, careersUrl?: string): boolean {
  if (!isLikelyJobTitle(title)) return false;
  if (!isLikelyJobUrl(applyUrl)) return false;
  if (careersUrl && isListingPageUrl(applyUrl, careersUrl)) return false;
  return true;
}
