const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

async function scanFiles(folder, recursive, limit = 20000) {
  const records = new Map(), warnings = [], directories = [folder];
  let truncated = false;
  while (directories.length && !truncated) {
    const dir = directories.pop();
    let entries;
    try { entries = await fs.readdir(dir, { withFileTypes: true }); }
    catch { warnings.push('Cannot read ' + dir); continue; }
    const candidates = [];
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && recursive) directories.push(full);
      if (entry.isFile() && /\.(stl|3mf)$/i.test(entry.name)) candidates.push(full);
    }
    // Bound filesystem concurrency: faster on large directories without flooding a disk/share.
    for (let offset = 0; offset < candidates.length && !truncated; offset += 16) {
      const batch = await Promise.all(candidates.slice(offset, offset + 16).map(async full => {
        try {
          const stat = await fs.stat(full);
          const id = crypto.createHash('sha256').update(full + '|' + stat.size + '|' + stat.mtimeMs).digest('hex');
          return { id, path: full, name: path.basename(full), relative: path.relative(folder, full), size: stat.size, modified: stat.mtimeMs, type: path.extname(full).slice(1).toUpperCase() };
        } catch { warnings.push('Cannot read ' + full); }
      }));
      for (const file of batch) if (file) {
        if (records.size >= limit) { truncated = true; break; }
        records.set(file.id, file);
      }
    }
  }
  const collator = new Intl.Collator(undefined, { numeric: true });
  return { records, files: [...records.values()].sort((a, b) => collator.compare(a.name, b.name)), warnings, truncated };
}
module.exports = { scanFiles };
