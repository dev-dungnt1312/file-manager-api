import path from 'node:path';

export function cleanRelativePath(input = '') {
  const normalized = path.posix.normalize(`/${input}`).replace(/^\/+/, '');
  if (normalized.includes('..')) {
    throw new Error('Invalid path traversal');
  }
  return normalized === '.' ? '' : normalized;
}

export function joinPosix(...parts: string[]) {
  return cleanRelativePath(parts.filter(Boolean).join('/'));
}
