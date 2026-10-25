import { crawlGenericHtmlCareers } from '@/lib/crawler/adapters/generic-html';
import { crawlGreenhouseCareers } from '@/lib/crawler/adapters/greenhouse';
import type { CompanySize } from '@/lib/job-board/constants';
import type { CrawlerSourceResult } from '@/lib/crawler/types';

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
  const ghFromUrl = isGreenhouseUrl(record.careersUrl);
  const board = record.greenhouseBoard ?? ghFromUrl?.board;

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
}
