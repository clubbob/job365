import { crawlGenericHtmlCareers } from '../src/lib/crawler/adapters/generic-html.ts';

const targets = [
  { crawlSourceId: 'posco', ftcName: '포스코', careersUrl: 'https://recruit.posco.com' },
  { crawlSourceId: 'nonghyup', ftcName: '농협', careersUrl: 'https://nonghyup.recruit.co.kr' },
  { crawlSourceId: 'gs', ftcName: '지에스', careersUrl: 'https://recruit.gs.com' },
  { crawlSourceId: 'shinsegae', ftcName: '신세계', careersUrl: 'https://job.shinsegae.com' },
];

for (const config of targets) {
  const result = await crawlGenericHtmlCareers({
    sourceId: `${config.crawlSourceId}-careers`,
    sourceName: `${config.ftcName} 채용`,
    companyName: config.ftcName,
    careersUrl: config.careersUrl,
  });
  console.log(
    config.crawlSourceId,
    'jobs',
    result.jobs.length,
    'syncEmpty',
    result.syncEmpty,
    'errors',
    result.errors.length > 0 ? result.errors[0] : '-',
  );
}
