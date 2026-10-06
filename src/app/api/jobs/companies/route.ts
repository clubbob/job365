import { NextResponse } from 'next/server';
import {
  buildEnterpriseGroupRows,
  summarizeEnterpriseGroupRows,
} from '@/lib/crawler/enterprise-group-rows';
import { getCrawledJobSourceStats } from '@/lib/crawled-jobs-server';

export async function GET() {
  try {
    const { discoveredBySource, jobCountsBySource } = await getCrawledJobSourceStats();
    const rows = buildEnterpriseGroupRows(discoveredBySource, jobCountsBySource);

    return NextResponse.json({
      ok: true,
      data: {
        summary: summarizeEnterpriseGroupRows(rows),
        rows,
      },
    });
  } catch (error) {
    console.error('[api/jobs/companies] load failed', error);
    const rows = buildEnterpriseGroupRows({}, {});

    return NextResponse.json({
      ok: true,
      data: {
        summary: summarizeEnterpriseGroupRows(rows),
        rows,
      },
    });
  }
}
