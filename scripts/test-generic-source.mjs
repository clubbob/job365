import { crawlGenericHtmlCareers } from '../src/lib/crawler/adapters/generic-html.ts';

const sourceId = process.argv[2] ?? 'samsung-careers';
const configs = {
  'samsung-careers': {
    sourceId: 'samsung-careers',
    sourceName: '삼성 채용',
    companyName: '삼성',
    careersUrl: 'https://www.samsungcareers.com/hr/?search=',
  },
  'hyundai-careers': {
    sourceId: 'hyundai-careers',
    sourceName: '현대자동차 채용',
    companyName: '현대자동차',
    careersUrl: 'https://talent.hyundai.com/apply/applyList.hc',
  },
};

const config = configs[sourceId];
if (!config) throw new Error(`unknown source ${sourceId}`);

const result = await crawlGenericHtmlCareers(config);
console.log('jobs', result.jobs.length);
console.log('errors', result.errors);
for (const job of result.jobs.slice(0, 5)) {
  console.log('-', job.title, '|', job.companyName);
}
