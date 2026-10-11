export type Notice = {
  id: string;
  title: string;
  body: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export function normalizeNotice(raw: unknown): Notice | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const id = typeof data.id === 'string' ? data.id.trim() : '';
  const title = typeof data.title === 'string' ? data.title.trim() : '';
  const body = typeof data.body === 'string' ? data.body : '';
  if (!id || !title) return null;

  return {
    id,
    title,
    body,
    published: data.published === true,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : '',
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
    publishedAt: typeof data.publishedAt === 'string' ? data.publishedAt : null,
  };
}
