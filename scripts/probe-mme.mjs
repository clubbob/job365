import { writeFileSync } from 'node:fs';

const url = 'https://www.mme.or.kr/PGPC0010.do?df_menu_no=6&df_pmenu_no=7&df_program_id=PGPC0010';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 JobLink365' } });
const html = await res.text();
writeFileSync('d:/project/job365/.tmp-mme.html', html, 'utf8');
const hits = [...html.matchAll(/[A-Za-z0-9_./-]+\.do[A-Za-z0-9?&=_./-]*/g)].map((m) => m[0]);
const unique = [...new Set(hits)].filter((u) => /PGPC|list|excel|select|search|data/i.test(u));
console.log(unique.slice(0, 40).join('\n'));
