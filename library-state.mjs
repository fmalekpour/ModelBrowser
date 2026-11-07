export const PAGE_SIZE = 60;
export const IMAGE_CACHE_SIZE = 120;
export function pageOf(files, query, type, requestedPage, pageSize = PAGE_SIZE) {
  const matching = files.filter(file => (!type || file.type === type) && file.relative.toLowerCase().includes(query.toLowerCase()));
  const pages = Math.max(1, Math.ceil(matching.length / pageSize));
  const page = Math.max(0, Math.min(requestedPage, pages - 1));
  return { items: matching.slice(page * pageSize, (page + 1) * pageSize), total: matching.length, pages, page };
}
export function rememberImage(cache, id, data, limit = IMAGE_CACHE_SIZE) {
  cache.delete(id); cache.set(id, data);
  while (cache.size > limit) cache.delete(cache.keys().next().value);
}
