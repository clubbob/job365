import type { CrawlerAdapterId } from '@/lib/crawler/companies';

export type EnterpriseCareersConfig = {
  ftcName: string;
  crawlSourceId: string;
  careersUrl: string;
  adapter?: CrawlerAdapterId;
  greenhouseBoard?: string;
  koreaOnly?: boolean;
};

/**
 * 공정거래위원회 2026년 공시대상 기업집단 102개 채용 사이트.
 * adapter를 지정하지 않으면 generic HTML 수집기를 사용합니다.
 */
export const ENTERPRISE_CAREERS_CONFIGS: EnterpriseCareersConfig[] = [
  { ftcName: '삼성', crawlSourceId: 'samsung', careersUrl: 'https://www.samsungcareers.com/hr/?search=' },
  { ftcName: '에스케이', crawlSourceId: 'sk', careersUrl: 'https://www.skcareers.com/Recruit' },
  { ftcName: '현대자동차', crawlSourceId: 'hyundai', careersUrl: 'https://talent.hyundai.com/apply/applyList.hc' },
  { ftcName: '엘지', crawlSourceId: 'lg', careersUrl: 'https://careers.lg.com', adapter: 'lg' },
  {
    ftcName: '한화',
    crawlSourceId: 'hanwha',
    careersUrl: 'https://www.hanwha.co.kr/careers.do',
  },
  { ftcName: '롯데', crawlSourceId: 'lotte', careersUrl: 'https://recruit.lotte.co.kr' },
  { ftcName: '포스코', crawlSourceId: 'posco', careersUrl: 'https://recruit.posco.com' },
  { ftcName: 'HD현대', crawlSourceId: 'hd-hyundai', careersUrl: 'https://recruit.hd.com' },
  { ftcName: '농협', crawlSourceId: 'nonghyup', careersUrl: 'https://nonghyup.recruit.co.kr' },
  { ftcName: '지에스', crawlSourceId: 'gs', careersUrl: 'https://recruit.gs.com' },
  { ftcName: '신세계', crawlSourceId: 'shinsegae', careersUrl: 'https://job.shinsegae.com' },
  { ftcName: '한진', crawlSourceId: 'hanjin', careersUrl: 'https://recruit.hanjin.com' },
  { ftcName: '케이티', crawlSourceId: 'kt', careersUrl: 'https://recruit.kt.com' },
  { ftcName: '엘에스', crawlSourceId: 'ls', careersUrl: 'https://recruit.ls.co.kr' },
  { ftcName: '씨제이', crawlSourceId: 'cj', careersUrl: 'https://recruit.cj.net' },
  { ftcName: '카카오', crawlSourceId: 'kakao', careersUrl: 'https://careers.kakao.com', adapter: 'kakao' },
  { ftcName: '에이치엠엠', crawlSourceId: 'hmm', careersUrl: 'https://recruit.hmm21.com' },
  { ftcName: '두산', crawlSourceId: 'doosan', careersUrl: 'https://www.doosan.com/kr/careers' },
  { ftcName: '셀트리온', crawlSourceId: 'celltrion', careersUrl: 'https://careers.celltrion.com' },
  { ftcName: '네이버', crawlSourceId: 'naver', careersUrl: 'https://recruit.navercorp.com', adapter: 'naver' },
  { ftcName: '중흥건설', crawlSourceId: 'joongheung', careersUrl: 'https://recruit.jhcc.co.kr' },
  {
    ftcName: '쿠팡',
    crawlSourceId: 'coupang',
    careersUrl: 'https://www.coupang.jobs/kr/jobs',
    adapter: 'greenhouse',
    greenhouseBoard: 'coupang',
    koreaOnly: true,
  },
  { ftcName: '에쓰-오일', crawlSourceId: 's-oil', careersUrl: 'https://recruit.s-oil.com' },
  { ftcName: 'DL', crawlSourceId: 'dl', careersUrl: 'https://recruit.dl.co.kr' },
  { ftcName: '영풍', crawlSourceId: 'youngpoong', careersUrl: 'https://recruit.yp.co.kr' },
  { ftcName: '미래에셋', crawlSourceId: 'miraeasset', careersUrl: 'https://recruit.miraeasset.com' },
  { ftcName: '현대백화점', crawlSourceId: 'hyundai-dept', careersUrl: 'https://recruit.ehyundai.com' },
  { ftcName: '효성', crawlSourceId: 'hyosung', careersUrl: 'https://recruit.hyosung.com' },
  { ftcName: '하림', crawlSourceId: 'harim', careersUrl: 'https://recruit.harim.com' },
  { ftcName: '부영', crawlSourceId: 'buyoung', careersUrl: 'https://recruit.booyoung.co.kr' },
  { ftcName: '한국앤컴퍼니그룹', crawlSourceId: 'kh-holdings', careersUrl: 'https://recruit.khholdings.co.kr' },
  { ftcName: '장금상선', crawlSourceId: 'janggeum', careersUrl: 'https://recruit.janggeum.co.kr' },
  { ftcName: '호반', crawlSourceId: 'hoban', careersUrl: 'https://recruit.hoban.co.kr' },
  { ftcName: '케이씨씨', crawlSourceId: 'kcc', careersUrl: 'https://recruit.kccworld.co.kr' },
  { ftcName: '에이치디씨', crawlSourceId: 'hdc', careersUrl: 'https://recruit.hdc-dvp.com' },
  { ftcName: 'SM', crawlSourceId: 'sm', careersUrl: 'https://recruit.smtown.com' },
  { ftcName: 'DB', crawlSourceId: 'db', careersUrl: 'https://recruit.dbg.co.kr' },
  { ftcName: '케이티앤지', crawlSourceId: 'ktng', careersUrl: 'https://recruit.ktng.com' },
  { ftcName: '코오롱', crawlSourceId: 'kolon', careersUrl: 'https://recruit.kolon.com' },
  { ftcName: '넥슨', crawlSourceId: 'nexon', careersUrl: 'https://recruit.nexon.com' },
  { ftcName: '두나무', crawlSourceId: 'dunamu', careersUrl: 'https://careers.dunamu.com' },
  { ftcName: '교보생명보험', crawlSourceId: 'kyobo-life', careersUrl: 'https://recruit.kyobo.com' },
  { ftcName: '엘엑스', crawlSourceId: 'lx', careersUrl: 'https://recruit.lxinternational.com' },
  { ftcName: '오씨아이', crawlSourceId: 'oci', careersUrl: 'https://recruit.oci.co.kr' },
  { ftcName: '넷마블', crawlSourceId: 'netmarble', careersUrl: 'https://careers.netmarble.com' },
  { ftcName: '세아', crawlSourceId: 'seah', careersUrl: 'https://recruit.seah.co.kr' },
  { ftcName: '다우키움', crawlSourceId: 'daoukiwoom', careersUrl: 'https://recruit.daou.co.kr' },
  { ftcName: '태광', crawlSourceId: 'taekwang', careersUrl: 'https://recruit.taekwang.com' },
  { ftcName: '한국지엠', crawlSourceId: 'gm-korea', careersUrl: 'https://careers.gm.com/ko-kr' },
  { ftcName: '이랜드', crawlSourceId: 'eland', careersUrl: 'https://recruit.eland.co.kr' },
  { ftcName: '에코프로', crawlSourceId: 'ecopro', careersUrl: 'https://recruit.ecopro.co.kr' },
  { ftcName: '소노인터내셔널', crawlSourceId: 'sono', careersUrl: 'https://recruit.sonohospitality.com' },
  { ftcName: '한국항공우주산업', crawlSourceId: 'korea-aerospace', careersUrl: 'https://recruit.koreaaero.co.kr' },
  { ftcName: '대방건설', crawlSourceId: 'daebang', careersUrl: 'https://recruit.daebang.com' },
  { ftcName: '금호석유화학', crawlSourceId: 'kumho-petrochemical', careersUrl: 'https://recruit.kkpc.co.kr' },
  { ftcName: '태영', crawlSourceId: 'taeyoung', careersUrl: 'https://recruit.taeyoung.com' },
  { ftcName: '삼천리', crawlSourceId: 'samchully', careersUrl: 'https://recruit.samchully.co.kr' },
  { ftcName: '동원', crawlSourceId: 'dongwon', careersUrl: 'https://recruit.dongwon.com' },
  { ftcName: 'HL', crawlSourceId: 'hl', careersUrl: 'https://recruit.hlcompany.com' },
  { ftcName: 'KG', crawlSourceId: 'kg', careersUrl: 'https://recruit.kg-group.co.kr' },
  { ftcName: '라인', crawlSourceId: 'line', careersUrl: 'https://careers.linecorp.com' },
  {
    ftcName: '크래프톤',
    crawlSourceId: 'krafton',
    careersUrl: 'https://www.krafton.com/careers',
    adapter: 'greenhouse',
    greenhouseBoard: 'krafton',
    koreaOnly: true,
  },
  { ftcName: '엘아이지', crawlSourceId: 'lig', careersUrl: 'https://recruit.lig.co.kr' },
  { ftcName: '아모레퍼시픽', crawlSourceId: 'amorepacific', careersUrl: 'https://careers.apgroup.com' },
  { ftcName: '엠디엠', crawlSourceId: 'mdm', careersUrl: 'https://recruit.mdmplus.co.kr' },
  { ftcName: '글로벌세아', crawlSourceId: 'global-seah', careersUrl: 'https://recruit.global-seah.com' },
  { ftcName: 'BS', crawlSourceId: 'bs', careersUrl: 'https://recruit.bsb.co.kr' },
  { ftcName: '동국제강', crawlSourceId: 'dongkuk', careersUrl: 'https://recruit.dongkuksteel.com' },
  { ftcName: '대신', crawlSourceId: 'daishin', careersUrl: 'https://recruit.daishin.com' },
  { ftcName: '애경', crawlSourceId: 'aekyung', careersUrl: 'https://recruit.aekyung.co.kr' },
  { ftcName: '유진', crawlSourceId: 'yujin', careersUrl: 'https://recruit.yujingroup.com' },
  { ftcName: '삼양', crawlSourceId: 'samyang', careersUrl: 'https://recruit.samyang.com' },
  { ftcName: '중앙', crawlSourceId: 'joongang', careersUrl: 'https://recruit.joongang.co.kr' },
  { ftcName: '한국교직원공제회', crawlSourceId: 'ktcu', careersUrl: 'https://recruit.ktcu.or.kr' },
  { ftcName: '고려에이치씨', crawlSourceId: 'korea-hc', careersUrl: 'https://recruit.khchem.co.kr' },
  { ftcName: '빗썸', crawlSourceId: 'bithumb', careersUrl: 'https://careers.bithumb.com' },
  { ftcName: 'BGF', crawlSourceId: 'bgf', careersUrl: 'https://recruit.bgfretail.com' },
  { ftcName: '웅진', crawlSourceId: 'woongjin', careersUrl: 'https://recruit.woongjin.com' },
  { ftcName: '반도홀딩스', crawlSourceId: 'bando', careersUrl: 'https://recruit.bando.co.kr' },
  { ftcName: '오케이금융그룹', crawlSourceId: 'ok-financial', careersUrl: 'https://recruit.okfngroup.com' },
  { ftcName: '대광', crawlSourceId: 'daekwang', careersUrl: 'https://recruit.daekwang.com' },
  { ftcName: '현대해상화재보험', crawlSourceId: 'hyundai-marine', careersUrl: 'https://recruit.hi.co.kr' },
  { ftcName: '농심', crawlSourceId: 'nongshim', careersUrl: 'https://recruit.nongshim.com' },
  { ftcName: '쉴더스', crawlSourceId: 'sk-shielders', careersUrl: 'https://recruit.skshielders.com' },
  { ftcName: 'DN', crawlSourceId: 'dn', careersUrl: 'https://recruit.dncompany.com' },
  { ftcName: '사조', crawlSourceId: 'sajo', careersUrl: 'https://recruit.sajo.co.kr' },
  { ftcName: '파라다이스', crawlSourceId: 'paradise', careersUrl: 'https://recruit.paradise.co.kr' },
  { ftcName: '하이트진로', crawlSourceId: 'hitejinro', careersUrl: 'https://recruit.hitejinro.com' },
  { ftcName: '하이브', crawlSourceId: 'hybe', careersUrl: 'https://careers.hybe.com' },
  { ftcName: '대명화학', crawlSourceId: 'daemyung', careersUrl: 'https://recruit.daemyungchem.co.kr' },
  { ftcName: '한솔', crawlSourceId: 'hansol', careersUrl: 'https://recruit.hansol.com' },
  { ftcName: '신영', crawlSourceId: 'shinyoung', careersUrl: 'https://recruit.shinyoung.com' },
  { ftcName: '삼표', crawlSourceId: 'sampyo', careersUrl: 'https://recruit.sampyo.co.kr' },
  { ftcName: '토스', crawlSourceId: 'toss', careersUrl: 'https://toss.im/career/jobs' },
  { ftcName: '유코카캐리어스', crawlSourceId: 'eukor', careersUrl: 'https://recruit.eukor.com' },
  { ftcName: '한국콜마', crawlSourceId: 'kolmar', careersUrl: 'https://recruit.kolmar.co.kr' },
  { ftcName: '원익', crawlSourceId: 'wonik', careersUrl: 'https://recruit.wonik.com' },
  { ftcName: '희성', crawlSourceId: 'heesung', careersUrl: 'https://recruit.heesung.com' },
  { ftcName: '오리온', crawlSourceId: 'orion', careersUrl: 'https://recruit.orionworld.com' },
  { ftcName: 'QCP그룹', crawlSourceId: 'qcp', careersUrl: 'https://recruit.qcpgroup.com' },
  { ftcName: '아이에스지주', crawlSourceId: 'isg', careersUrl: 'https://recruit.isgholdings.com' },
  { ftcName: '일진글로벌', crawlSourceId: 'iljin', careersUrl: 'https://recruit.iljin.co.kr' },
];

const CONFIG_BY_FTC_NAME = new Map(ENTERPRISE_CAREERS_CONFIGS.map((item) => [item.ftcName, item]));

export function getEnterpriseCareersConfig(ftcName: string): EnterpriseCareersConfig | undefined {
  return CONFIG_BY_FTC_NAME.get(ftcName);
}

export function getEnterpriseCareersConfigBySourceId(sourceId: string): EnterpriseCareersConfig | undefined {
  return ENTERPRISE_CAREERS_CONFIGS.find((item) => item.crawlSourceId === sourceId);
}
