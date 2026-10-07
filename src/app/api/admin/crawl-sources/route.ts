import { NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin-auth';
import { updateCrawlCompanyPolicy } from '@/lib/crawl-company-policy-server';
import { updateCrawlSourcePolicy } from '@/lib/crawl-source-policy-server';
import {
  invalidateCrawledJobsListCache,
  listActiveJobIdsBySource,
  listActiveJobIdsBySourceAndCompany,
  markCrawledJobsClosed,
} from '@/lib/crawled-jobs-server';
import { getCrawlerCompanies } from '@/lib/crawler/companies';
import { buildJobCompaniesPayload } from '@/lib/job-companies-server';
import { firebaseAdminListFields, isFirebaseAdminReady } from '@/lib/firebaseAdmin';

export async function GET() {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json({
      ok: true,
      data: {
        summary: {
          groupCount: 0,
          linkedCount: 0,
          collectedCount: 0,
          emptyCount: 0,
          pendingCount: 0,
          unlinkedCount: 0,
          discoveredAffiliateCount: 0,
          withDiscoveredAffiliates: 0,
          totalActiveJobs: 0,
          visibleGroupCount: 0,
          visibleActiveJobs: 0,
          displayDisabledCount: 0,
          crawlDisabledCount: 0,
          companyDisplayDisabledCount: 0,
        },
        groups: [],
        standaloneSources: [],
        ...firebaseAdminListFields(),
      },
    });
  }

  try {
    const payload = await buildJobCompaniesPayload({ includeDisplayDisabled: true });
    return NextResponse.json({ ok: true, data: { ...payload, ...firebaseAdminListFields() } });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'LOAD_FAILED', message: '수집 소스 목록을 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminSession();
  if (unauthorized) return unauthorized;

  if (!isFirebaseAdminReady()) {
    return NextResponse.json(
      { ok: false, error: { code: 'FIRESTORE_UNAVAILABLE', message: 'Firestore를 사용할 수 없습니다.' } },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      sourceId?: string;
      companyName?: string;
      crawlDisabled?: boolean;
      displayDisabled?: boolean;
      reason?: string | null;
    };

    const sourceId = typeof body.sourceId === 'string' ? body.sourceId.trim() : '';
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';
    if (!sourceId) {
      return NextResponse.json(
        { ok: false, error: { code: 'INVALID_INPUT', message: 'sourceId가 필요합니다.' } },
        { status: 400 },
      );
    }

    const company = getCrawlerCompanies().find((item) => item.sourceId === sourceId);
    if (!company) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '등록되지 않은 수집 소스입니다.' } },
        { status: 404 },
      );
    }

    if (companyName) {
      const { policy, displayJustDisabled } = await updateCrawlCompanyPolicy(sourceId, companyName, {
        crawlDisabled: typeof body.crawlDisabled === 'boolean' ? body.crawlDisabled : undefined,
        displayDisabled: typeof body.displayDisabled === 'boolean' ? body.displayDisabled : undefined,
        reason: body.reason === undefined ? undefined : body.reason,
      });

      if (displayJustDisabled) {
        const activeIds = await listActiveJobIdsBySourceAndCompany(sourceId, companyName);
        await markCrawledJobsClosed(activeIds, new Date().toISOString());
      }
      invalidateCrawledJobsListCache();

      return NextResponse.json({
        ok: true,
        data: {
          company: policy,
        },
      });
    }

    const { policy, displayJustDisabled } = await updateCrawlSourcePolicy(sourceId, {
      crawlDisabled: typeof body.crawlDisabled === 'boolean' ? body.crawlDisabled : undefined,
      displayDisabled: typeof body.displayDisabled === 'boolean' ? body.displayDisabled : undefined,
      reason: body.reason === undefined ? undefined : body.reason,
    });

    if (displayJustDisabled) {
      const activeIds = await listActiveJobIdsBySource(sourceId);
      await markCrawledJobsClosed(activeIds, new Date().toISOString());
    }
    invalidateCrawledJobsListCache();

    return NextResponse.json({
      ok: true,
      data: {
        source: {
          sourceId: company.sourceId,
          sourceName: company.sourceName,
          companyName: company.name,
          careersUrl: company.careersUrl,
          crawlDisabled: policy.crawlDisabled,
          displayDisabled: policy.displayDisabled,
          reason: policy.reason,
          updatedAt: policy.updatedAt,
        },
      },
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'UPDATE_FAILED', message: '수집 소스 설정을 저장하지 못했습니다.' } },
      { status: 500 },
    );
  }
}
