import { fetchJobDetail } from '../src/lib/crawler/fetch-job-detail.ts';
import { isInvalidJobDescription } from '../src/lib/crawler/job-quality.ts';

const url = 'https://toss.im/career/job-detail?gh_jid=6576715003';
const detail = await fetchJobDetail(url, 'https://toss.im/career/jobs');
console.log('detail', detail);
if (detail) console.log('invalid', isInvalidJobDescription(detail.description), 'len', detail.description.length);
