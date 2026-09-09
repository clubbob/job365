import { NextResponse } from 'next/server';
import { lookupNtsBusinessStatus } from '@/lib/nts-business-status';

export async function POST(request: Request) {
  let body: { businessNumber?: unknown };
  try {
    body = (await request.json()) as { businessNumber?: unknown };
  } catch {
    return NextResponse.json(
      { ok: false, error: { code: 'INVALID_BODY', message: '사업자등록번호를 입력해 주세요.' } },
      { status: 400 },
    );
  }

  const businessNumber = typeof body.businessNumber === 'string' ? body.businessNumber : '';
  const result = await lookupNtsBusinessStatus(businessNumber);

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: 'NTS_LOOKUP_FAILED', message: result.message },
        data: result,
      },
      { status: result.message.includes('10자리') ? 400 : 422 },
    );
  }

  return NextResponse.json({ ok: true, data: result });
}
