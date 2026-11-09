const API = 'https://api.github.com';

export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
  get isConflict() {
    return this.status === 409 || this.status === 422;
  }
  get isAuth() {
    return this.status === 401;
  }
}

export interface RemoteFile {
  text: string;
  sha: string;
}

function b64ToUtf8(b64: string): string {
  const bin = atob(b64.replace(/\n/g, ''));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function utf8ToB64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

const encPath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

async function request(token: string, method: string, url: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method,
    cache: 'no-store',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      detail = (await res.json()).message ?? detail;
    } catch {
      /* ignore */
    }
    const hint =
      res.status === 401
        ? 'Token is invalid or has expired.'
        : res.status === 404
          ? 'Not found, or the token has no access to this repo.'
          : res.status === 403
            ? 'Forbidden (token permissions or rate limit).'
            : detail;
    throw new GitHubError(res.status, hint);
  }
  return res.json();
}

export async function getFile(token: string, repo: string, path: string, ref?: string): Promise<RemoteFile> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const data = await request(token, 'GET', `${API}/repos/${repo}/contents/${encPath(path)}${q}`);
  if (Array.isArray(data) || data.type !== 'file') throw new GitHubError(400, `${path} is not a file.`);
  return { text: b64ToUtf8(data.content), sha: data.sha };
}

export async function putFile(
  token: string,
  repo: string,
  path: string,
  text: string,
  sha: string,
  message: string,
  branch?: string,
): Promise<string> {
  const data = await request(token, 'PUT', `${API}/repos/${repo}/contents/${encPath(path)}`, {
    message,
    content: utf8ToB64(text),
    sha,
    ...(branch ? { branch } : {}),
  });
  return data.content.sha as string;
}

/** Download a file's raw bytes (images/videos) — works for private repos, up to 100 MB. */
export async function getRawBlob(token: string, repo: string, path: string, ref?: string): Promise<Blob> {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const res = await fetch(`${API}/repos/${repo}/contents/${encPath(path)}${q}`, {
    headers: {
      Accept: 'application/vnd.github.raw',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) throw new GitHubError(res.status, res.status === 404 ? `${path} not found` : res.statusText);
  return res.blob();
}
