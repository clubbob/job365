import { redirect } from 'next/navigation';

export default function AdminCrawlerRedirectPage() {
  redirect('/admin/jobs/crawl-runs');
}
