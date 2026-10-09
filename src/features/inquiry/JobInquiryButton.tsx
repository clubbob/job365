'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/auth-context';
import { buildJobInquiryLoginHref } from '@/lib/job-inquiry';
import { cn } from '@/lib/utils';

const buttonClassName =
  'inline-flex rounded-lg border border-border-strong bg-surface px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-neutral-50';

type JobInquiryButtonProps = {
  inquiryHref: string;
  className?: string;
};

export default function JobInquiryButton({ inquiryHref, className }: JobInquiryButtonProps) {
  const { user, loading } = useAuth();
  const href = !loading && !user ? buildJobInquiryLoginHref(inquiryHref) : inquiryHref;

  return (
    <Link href={href} className={cn(buttonClassName, className)}>
      문의하기
    </Link>
  );
}
