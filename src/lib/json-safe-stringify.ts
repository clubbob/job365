/**
 * 이보다 긴 한 줄은 Cursor 창을 스택 오버플로(0xC00000FD, 코드 -1073741571)로 죽인다.
 * scripts/lib/write-json-atomic.mjs 와 같은 규칙이다.
 */
const MAX_LINE = 4000;

/** 배열·객체가 길면 원소마다 줄을 나눈다. 짧은 값은 한 줄로 둔다. */
export function stringifyJsonSafe(value: unknown): string {
  return `${formatJsonSafe(value, 0)}\n`;
}

function formatJsonSafe(value: unknown, depth: number): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  const compact = JSON.stringify(value);
  if (compact.length <= MAX_LINE) return compact;

  const pad = '  '.repeat(depth);
  const inner = '  '.repeat(depth + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const items = value.map((item) => `${inner}${formatJsonSafe(item, depth + 1)}`);
    return `[\n${items.join(',\n')}\n${pad}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length === 0) return '{}';
  const props = keys.map(
    (key) => `${inner}${JSON.stringify(key)}: ${formatJsonSafe(record[key], depth + 1)}`,
  );
  return `{\n${props.join(',\n')}\n${pad}}`;
}
