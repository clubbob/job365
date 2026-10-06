import { fetchTossCareerCandidates } from '../src/lib/crawler/toss-career-api.ts';
import { isLikelyJobTitle } from '../src/lib/crawler/job-heuristics.ts';

const candidates = await fetchTossCareerCandidates('https://toss.im/career/jobs');
console.log('candidates', candidates.length);
console.log(candidates.slice(0, 5));

const groups = await fetch('https://api-public.toss.im/api/v3/ipd-eggnog/career/job-groups').then((r) => r.json());
for (const group of groups.success.slice(0, 15)) {
  console.log(group.title, isLikelyJobTitle(group.title));
}
