/** 채용 공고가 아닌 안내·메뉴 링크 제목 */
const NAV_TITLE_PATTERN =
  /^(홈|home|메뉴|menu|더보기|자세히|이전|다음|로그인|login|회원가입|signup|about|careers?|jobs?|people|culture|marketing|faq|qna|문의|공지|공지사항|채용정보|지원하기|지원현황|인재풀|본문\s*바로가기|컨텐츠\s*바로가기|주\s*내용으로\s*건너뛰기|그룹소개|그룹비전|회사소개|사조소개|합류\s*여정|팀\s*문화|자주\s*묻는\s*질문|아티클|소개|비전|이용약관|개인정보|오케이금융그룹|ok\s*소개|채용\s*중인\s*공고|채용프로세스|인재개발시스템)$/i;

const NAV_TITLE_CONTAINS_PATTERN =
  /바로가기|그룹소개|함께\s*가는\s*친구|인재상|자주\s*묻는\s*질문|팀\s*문화|합류\s*여정|금융그룹↗|지원현황|인재풀\s*등록|사조소개|그룹비전|페이지\s*에러|헤드라인\s*-|채용기관\s*사이트|사이트로\s*이동|홈페이지로\s*이동|(?:으로?\s*)?이동하기$/i;

/** 직원 소개·인터뷰 페이지 (팀 + 이름 + 직급) */
const EMPLOYEE_PROFILE_TITLE_PATTERN =
  /팀\s+[가-힣]{2,5}\s+(대리|과장|차장|부장|사원|팀장|주임|선임|책임|이사|프로)$/;

/** 가이드·아티클 등 채용 공고가 아닌 콘텐츠 제목 */
const NON_JOB_CONTENT_TITLE_PATTERN =
  /포트폴리오\s*(?:양식|예시|작성|템플릿|가이드)|(?:이력서|자소서|면접)\s*(?:양식|예시|팁|가이드|질문)|양식·예시|(?:뭘|무엇을)\s*담(?:아야|을까)|담아야\s*할까|비중\s*\d+\s*%|커리어\s*(?:팁|가이드|인사이트)|채용\s*(?:팁|정보\s*알아보기)|(?:아티클|칼럼|인사이트|에피소드|웨비나|세미나|뉴스레터)\b|이벤트\s*안내/i;

/** 구직자 스펙·합격 후기형 제목 (채용 공고 제목이 아님) */
const CANDIDATE_SPEC_TITLE_PATTERN =
  /학점\s*[\d.]+\s*\/\s*[\d.]+|(?:오픽|opic)\s*[:：]?\s*[A-Z]{1,3}\b|토익\s*[\d]{2,3}|(?:JLPT|TEPS|TOEFL|HSK)\b|대외활동\s*\d+\s*회|(?:직무\s*)?관련\s*인턴\s*\d+\s*회|유관\s*업무\s*경력|스펙\s*평가|합격\s*후기|자소서\s*첨삭/i;

function looksLikeCandidateSpecTitle(title: string): boolean {
  if (CANDIDATE_SPEC_TITLE_PATTERN.test(title)) return true;
  const slashCount = (title.match(/\//g) ?? []).length;
  if (slashCount >= 3 && /학점|오픽|인턴|대외활동|경력\s*\d+\s*년/u.test(title)) return true;
  if (/^\s*\/\s*\S/.test(title) && slashCount >= 2) return true;
  return false;
}

function hasFormalRecruitmentTitle(title: string): boolean {
  return /(?:모집|채용)\s*(?:합니다|공고|안내)|채용\s*공고|모집\s*공고/u.test(title);
}

/** 언론·카드뉴스 헤드라인 (특정 회사 모집 공고 제목이 아님) */
function looksLikeNewsHeadlineTitle(title: string): boolean {
  if (/\[(?:단독|속보|기획|특집|인터뷰|심층|단신|리포트)\]/u.test(title)) return true;
  if (/^\d+\s+\[/u.test(title)) return true;
  if (/(\.\.\.|…)/u.test(title) && !hasFormalRecruitmentTitle(title)) return true;
  if (
    /역대급|창사\s*후\s*최대|뽑는\s*(?:게임사|기업|회사|스타트업)/u.test(title) &&
    !hasFormalRecruitmentTitle(title)
  ) {
    return true;
  }
  return false;
}

/** 칼럼·인사이트형 질문 제목 */
function looksLikeEditorialHeadlineTitle(title: string): boolean {
  if (hasFormalRecruitmentTitle(title)) return false;
  if (/[?？]\s*$/u.test(title)) return true;
  if (
    /(?:할까|알까|일까|인가요?|될까|무엇|뭘|어디|어떻게|왜)\s*[?？]?\s*$/u.test(title) ||
    /집중할\s*곳|채우는\s*지금|지금,\s*[^,]{4,}[?？]?\s*$/u.test(title)
  ) {
    return true;
  }
  if (/트렌드|인사이트|아젠다|시대,\s*[^,]{4,}/u.test(title)) return true;
  return false;
}

/** 공고 제목에 흔히 나오는 채용 관련 표현 (팀명·직무 단어만으로는 통과하지 않음) */
const JOB_TITLE_SIGNAL_PATTERN =
  /채용|모집|공고|채용공고|신입|경력사원|인턴|정규직|계약직|엔지니어|engineer|developer|designer|manager|director|lead|architect|analyst|scientist|researcher|보안|security|legal|HR\s*(?:담당|팀|매니저|채용|분야)|human resources|finance|accountant|product|full\s*stack|\d{4}\s*년|\[[^\]]{2,}\]/i;

/** 공고 상세 URL에 흔한 경로 */
const JOB_URL_PATTERN =
  /\/(?:job-detail|jobs?\/\d|recruit\/\d|notice\/\d|announcement\/\d|position\/\d|opening\/\d|applyView|view\?|detail\/[A-Za-z0-9_-]+|detail\?|jobNoticeId=|noticeId=|recruitId=|jobId=|recuCls=|rtSeq=|\/o\/\d+|\d{4,})|\?no=\d+/i;

/** 안내·목록·인터뷰 페이지 URL */
const NAV_URL_PATTERN =
  /\/(?:faq|culture|joining-guide|joining|article|about|intro|vision|guide|hero|terms|privacy|login|signup|member|qna|interview|notice\/list|recruit\/list|jobs?\/list|career\/jobs\/?$|career\/faq|career\/culture|career\/article|career\/joining|#)/i;

export function isNonJobContentTitle(title: string): boolean {
  const trimmed = title.trim();
  if (!trimmed) return false;
  if (looksLikeCandidateSpecTitle(trimmed)) return true;
  if (looksLikeNewsHeadlineTitle(trimmed)) return true;
  if (looksLikeEditorialHeadlineTitle(trimmed)) return true;
  if (NON_JOB_CONTENT_TITLE_PATTERN.test(trimmed)) return true;
  if (
    /\|\s*[^|]{6,}(?:할까|알아볼까|궁금|정리|추천)\s*$/i.test(trimmed) &&
    !/채용|모집|공고/.test(trimmed)
  ) {
    return true;
  }
  return false;
}

export function isLikelyJobTitle(title: string): boolean {
  const trimmed = title.trim();
  if (trimmed.length < 8 || trimmed.length > 120) return false;
  if (NAV_TITLE_PATTERN.test(trimmed)) return false;
  if (NAV_TITLE_CONTAINS_PATTERN.test(trimmed)) return false;
  if (EMPLOYEE_PROFILE_TITLE_PATTERN.test(trimmed)) return false;
  if (isNonJobContentTitle(trimmed)) return false;
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
