import { renameSync, writeFileSync } from 'node:fs';

/**
 * 이보다 긴 한 줄은 Cursor 창을 스택 오버플로(0xC00000FD, 코드 -1073741571)로 죽인다.
 * src/lib/json-safe-stringify.ts 와 같은 규칙이다.
 */
const MAX_LINE = 4000;

/**
 * 배열·객체가 길면 원소마다 줄을 나눈다. 짧은 값은 한 줄로 둔다.
 */
export function stringifyJsonSafe(value) {
  return `${formatJsonSafe(value, 0)}\n`;
}

function formatJsonSafe(value, depth) {
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

  const keys = Object.keys(value);
  if (keys.length === 0) return '{}';
  const props = keys.map((key) => `${inner}${JSON.stringify(key)}: ${formatJsonSafe(value[key], depth + 1)}`);
  return `{\n${props.join(',\n')}\n${pad}}`;
}

/**
 * JSON을 파싱 검증한 뒤 원자적으로 저장합니다. 실패 시 기존 파일은 유지합니다.
 * 한 줄로 붙이지 않습니다. 수백만 자 한 줄을 에디터가 열면 창이 강제 종료됩니다.
 */
export function writeJsonAtomic(filePath, value) {
  const text = stringifyJsonSafe(value);
  JSON.parse(text);
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, text, 'utf8');
  renameSync(tmp, filePath);
}
