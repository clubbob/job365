import { companyCrawlTimeoutMs, withCrawlTimeout } from '@/lib/crawler/crawl-timeout';
import { crawlGenericHtmlCareers } from '@/lib/crawler/adapters/generic-html';
import { crawlGreenhouseCareers } from '@/lib/crawler/adapters/greenhouse';
import type { CompanySize } from '@/lib/job-board/constants';
import type { CrawlerSourceResult } from '@/lib/crawler/types';
import { isPortalCareersUrl, isStorableCareersUrl } from '@/lib/mid-sized-companies/careers-url-policy';

function isGreenhouseUrl(url: string): { board: string } | null {
  const match = url.match(/boards\.greenhouse\.io\/([^/?#]+)/i);
  if (match?.[1]) return { board: match[1] };
  return null;
}

export async function crawlRegistryCareersRecord(record: {
  companyName: string;
  careersUrl: string;
  crawlSourceId: string;
  careersAdapter?: 'generic' | 'greenhouse';
  greenhouseBoard?: string | null;
  companySize: CompanySize;
}): Promise<CrawlerSourceResult> {
  const sourceId = `${record.crawlSourceId}-careers`;
  const sourceName = `${record.companyName} 채용`;

  if (isPortalCareersUrl(record.careersUrl) || !isStorableCareersUrl(record.careersUrl)) {
    return {
      sourceId,
      sourceName,
      jobs: [],
      errors: ['수집할 수 없는 채용 URL입니다.'],
    };
  }

  const ghFromUrl = isGreenhouseUrl(record.careersUrl);
  const board = record.greenhouseBoard ?? ghFromUrl?.board;
  const companyMs = companyCrawlTimeoutMs();

  const run = async (): Promise<CrawlerSourceResult> => {
    if (record.careersAdapter === 'greenhouse' && board) {
      return crawlGreenhouseCareers({
        sourceId,
        sourceName,
        companyName: record.companyName,
        boardToken: board,
        careersUrl: record.careersUrl,
        koreaOnly: true,
        companySize: record.companySize,
      });
    }

    if (ghFromUrl) {
      return crawlGreenhouseCareers({
        sourceId,
        sourceName,
        companyName: record.companyName,
        boardToken: ghFromUrl.board,
        careersUrl: record.careersUrl,
        koreaOnly: true,
        companySize: record.companySize,
      });
    }

    return crawlGenericHtmlCareers({
      sourceId,
      sourceName,
      companyName: record.companyName,
      careersUrl: record.careersUrl,
      companySize: record.companySize,
    });
  };

  try {
    return await withCrawlTimeout(sourceName, companyMs, run);
  } catch (error) {
    const message = error instanceof Error ? error.message : '수집 실패';
    return {
      sourceId,
      sourceName,
      jobs: [],
      errors: [message],
    };
  }
}
