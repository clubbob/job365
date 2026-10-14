/**
 * Cursor가 job365를 열 때 예전 편집기/히스토리를 복원하며 크래시할 때 실행합니다.
 * Cursor를 완전히 종료한 뒤: node scripts/clear-cursor-job365-restore.mjs
 */
import { DatabaseSync } from 'node:sqlite';

const dbPath =
  'C:/Users/clubbob/AppData/Roaming/Cursor/User/workspaceStorage/0dee2fee9d48ff27d40f80faa5403a20/state.vscdb';

const db = new DatabaseSync(dbPath);
const emptyEditorMemento = JSON.stringify({ textEditorViewState: [] });
const emptyHistory = JSON.stringify([]);

db.prepare(
  `UPDATE ItemTable SET value = ? WHERE key = 'memento/workbench.editors.files.textFileEditor'`,
).run(emptyEditorMemento);
db.prepare(`UPDATE ItemTable SET value = ? WHERE key = 'history.entries'`).run(emptyHistory);
db.prepare(
  `DELETE FROM ItemTable WHERE key = 'memento/workbench.parts.editor'`,
).run();

console.log('job365 workspace: editor restore state cleared. Reopen Cursor with "편집기를 복원하지 않음" once.');
