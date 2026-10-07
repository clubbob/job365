const CRAWLER_BOT_NAME = 'JobLink365-Crawler';
const ROBOTS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type RobotsRules = {
  allow: string[];
  disallow: string[];
};

type RobotsCacheEntry = {
  expiresAt: number;
  rules: RobotsRules;
};

const robotsCache = new Map<string, RobotsCacheEntry>();

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function parseRobotsRules(text: string, botName: string): RobotsRules {
  const groups: Array<{ agents: string[]; allow: string[]; disallow: string[] }> = [];
  let current: { agents: string[]; allow: string[]; disallow: string[] } | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split('#')[0]?.trim() ?? '';
    if (!line) continue;

    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const key = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (key === 'user-agent') {
      if (!current || current.allow.length > 0 || current.disallow.length > 0) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) continue;
    if (key === 'allow') current.allow.push(value);
    if (key === 'disallow') current.disallow.push(value);
  }

  const bot = botName.toLowerCase();
  const matched =
    groups.find((group) => group.agents.some((agent) => agent !== '*' && bot.includes(agent))) ??
    groups.find((group) => group.agents.includes('*'));

  return matched ?? { allow: [], disallow: [] };
}

function ruleMatches(pathname: string, rule: string): boolean {
  if (!rule) return false;
  const path = normalizePath(pathname);
  const pattern = normalizePath(rule);

  if (pattern === '/') return true;
  if (!pattern.includes('*') && !pattern.endsWith('$')) {
    return path === pattern || path.startsWith(`${pattern}/`);
  }

  const regex = new RegExp(
    `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')}${pattern.endsWith('$') ? '' : '.*'}$`,
  );
  return regex.test(path);
}

function isPathAllowed(pathname: string, rules: RobotsRules): boolean {
  const path = normalizePath(pathname);
  let bestAllow = -1;
  let bestDisallow = -1;

  for (const rule of rules.allow) {
    if (ruleMatches(path, rule)) bestAllow = Math.max(bestAllow, rule.length);
  }
  for (const rule of rules.disallow) {
    if (ruleMatches(path, rule)) bestDisallow = Math.max(bestDisallow, rule.length);
  }

  if (bestAllow === -1 && bestDisallow === -1) return true;
  return bestAllow >= bestDisallow;
}

async function loadRobotsRules(origin: string): Promise<RobotsRules> {
  const cached = robotsCache.get(origin);
  if (cached && cached.expiresAt > Date.now()) return cached.rules;

  try {
    const res = await fetch(`${origin}/robots.txt`, {
      signal: AbortSignal.timeout(10_000),
      headers: { Accept: 'text/plain,*/*' },
    });
    if (!res.ok) {
      const empty = { allow: [], disallow: [] };
      robotsCache.set(origin, { expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS, rules: empty });
      return empty;
    }

    const rules = parseRobotsRules(await res.text(), CRAWLER_BOT_NAME);
    robotsCache.set(origin, { expiresAt: Date.now() + ROBOTS_CACHE_TTL_MS, rules });
    return rules;
  } catch {
    const empty = { allow: [], disallow: [] };
    robotsCache.set(origin, { expiresAt: Date.now() + 60_000, rules: empty });
    return empty;
  }
}

/** careers URL이 robots.txt 정책상 수집 가능한지 확인합니다. */
export async function isCareersUrlRobotsAllowed(careersUrl: string): Promise<boolean> {
  try {
    const url = new URL(careersUrl);
    const rules = await loadRobotsRules(url.origin);
    return isPathAllowed(url.pathname, rules);
  } catch {
    return false;
  }
}

export { CRAWLER_BOT_NAME };
