import { NextResponse } from 'next/server';
import { getCrawledJob } from '@/lib/crawled-jobs-server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const job = await getCrawledJob(id);
    if (!job) {
      return NextResponse.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '채용 공고를 찾을 수 없습니다.' } },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, data: { job } });
  } catch (error) {
    console.error('[crawled-jobs] get failed', error);
    return NextResponse.json(
      { ok: false, error: { code: 'GET_FAILED', message: '채용 공고를 불러오지 못했습니다.' } },
      { status: 500 },
    );
  }
}
