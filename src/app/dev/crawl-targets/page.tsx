import { redirect } from 'next/navigation';

export default function DevCrawlTargetsRedirectPage() {
  redirect('/admin/jobs/sources');
}
