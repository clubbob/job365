import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const groupsPath = resolve(root, 'src/lib/enterprise-groups/groups-data.ts');
const configsPath = resolve(root, 'src/lib/crawler/enterprise-careers-urls.ts');

const configsText = readFileSync(configsPath, 'utf8');
const idByName = new Map();
for (const match of configsText.matchAll(/ftcName:\s*'([^']+)',\s*crawlSourceId:\s*'([^']+)'/g)) {
  idByName.set(match[1], match[2]);
}

let groupsText = readFileSync(groupsPath, 'utf8');
groupsText = groupsText.replace(
  /\{\s*rank:\s*(\d+),\s*name:\s*'([^']+)',\s*owner:\s*'([^']+)',\s*affiliateCount:\s*(\d+)(?:,\s*crawlSourceId:\s*'[^']+')?\s*\}/g,
  (full, rank, name, owner, affiliateCount) => {
    const crawlSourceId = idByName.get(name);
    if (!crawlSourceId) {
      throw new Error(`Missing crawlSourceId for ${name}`);
    }
    return `{ rank: ${rank}, name: '${name}', owner: '${owner}', affiliateCount: ${affiliateCount}, crawlSourceId: '${crawlSourceId}' }`;
  },
);

writeFileSync(groupsPath, groupsText);
console.log(`Updated ${idByName.size} FTC groups with crawlSourceId.`);
