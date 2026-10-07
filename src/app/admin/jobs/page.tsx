import { redirect } from 'next/navigation';

export default function AdminJobsIndexPage() {
  redirect('/admin/jobs/crawled');
}
