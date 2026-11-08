# Developer guide

ModelBrowser is an Electron desktop application with a Three.js renderer. The first supported release target is Windows x64. The renderer and most application logic are portable, but installers for other platforms are not configured or tested.

## Prerequisites

- Node.js **24.x or 26.x** and its bundled npm.
- Git for source control and source-release archives.
- Windows x64 for building the supported installer.

Visual Studio, Rust, Python, and Node's optional native-module toolchain are not required. `npm ci` installs the versions recorded in `package-lock.json`; the Electron and installer tools are downloaded as prebuilt binaries. The first build requires internet access.

## Getting started

```powershell
git clone https://github.com/YOUR-USERNAME/ModelBrowser.git
cd ModelBrowser
npm ci
npm start
```

Replace the example owner with the actual repository owner. `private: true` in `package.json` prevents accidental npm publication; it does not restrict GitHub visibility or the MIT license.

## Commands

| Command | Result |
| --- | --- |
| `npm start` | Run the desktop app from source. |
| `npm run check` | Check JavaScript syntax and manifest version consistency. |
| `npm test` | Generate fixtures and run parser, library, cache, settings, and worker tests. |
| `npm run package` | Build the runnable application in `dist/win-unpacked/`. |
| `npm run dist` | Build the application and Windows setup executable in `dist/`. |
| `npm run release:source` | Create a separate source ZIP from the working tree's nonignored source files. |
| `npm run release:checksums` | Hash the current version's installer and source ZIP into `dist/SHA256SUMS.txt`. |

Source archives include uncommitted nonignored changes. For an official release, commit everything first and build from the release tag. The release workflow checks out the tag before producing archives.

## Structure

| Path | Responsibility |
| --- | --- |
| `main.cjs` | Window lifecycle, settings persistence, folder authorization, file/cache IPC. |
| `preload.cjs` | Narrow renderer-to-main bridge; renderer Node integration is disabled. |
| `renderer.js` | Library, filtering, pagination, selected preview, settings integration. |
| `model-engine.js` | STL/3MF parsing, lighting, camera fitting, rendering, disposal. |
| `scan-files.cjs` | Directory traversal with bounded metadata concurrency and file limits. |
| `thumbnail-service.cjs` | Isolated thumbnail renderer lifecycle, timeout, cancellation, recycling. |
| `thumbnail.html`, `thumbnail-renderer.js`, `thumbnail-preload.cjs` | Background thumbnail rendering and its IPC bridge. |
| `settings-schema.mjs`, `settings-view.js` | Defaults, validation, thumbnail signatures, settings UI. |
| `disk-cache.cjs` | Serialized disk-cache access, expiry, size eviction, clearing. |
| `library-state.mjs` | Pagination and bounded in-memory image cache. |
| `tests/` | Generated fixtures and automated tests; no user models are required. |
| `scripts/` | Repeatable testing, packaging, source archive, and checksum commands. |
| `electron-builder.json` | App identity, packaging allowlist, installer behavior. |
| `.github/workflows/` | Pull-request validation and tag-based draft releases. |

## Data and performance

Models are read from a user-selected folder. File IDs incorporate full path, size, and modification time. Scanning skips symbolic links and uses bounded filesystem concurrency. Only the current page is mounted; visible cards request thumbnails serially. Obsolete work is cancelled when the page or folder changes.

Thumbnail parsing runs in a separate sandboxed renderer process. The main process enforces file-size limits, caches resulting PNGs, and restarts the background renderer periodically. Selected full-resolution models are parsed on the interactive renderer and can still pause it when especially complex.

Settings and thumbnails live in Electron's `userData` directory, outside the installation directory. The settings page shows the actual cache path. Settings updates use a temporary file followed by rename. Installer upgrades preserve this data. Do not change the package name, product name, or user-data path casually: changing them can make an existing profile appear lost.

Cache keys incorporate file identity and thumbnail appearance. Changing only pagination does not invalidate disk thumbnails; changing resolution, angle, STL color, or lighting does. The renderer disposes geometries, materials, and textures when models are replaced.

## Adding a setting

1. Add a descriptor and default to `settings-schema.mjs`.
2. Wire the normalized setting to its consumer; do not trust renderer input in the main process.
3. Include visual thumbnail changes in `thumbnailSignature`.
4. Add tests for normalization, persistence, and behavior.
5. Update user documentation when behavior changes.

## Tests and limits of automated coverage

`npm test` generates small original STL/3MF fixtures, including a 600-file synthetic library, under `.test-work/`. Tests cover parsing, counts, bounds, pagination/search, memory limits, settings persistence and validation, cache policies, and thumbnail-worker cancellation/timeouts/crashes.

DOM tests use LinkeDOM and a simulated graphics renderer. They do **not** replace real WebGL testing. Before release, follow the manual checklist in [RELEASING.md](RELEASING.md). Automated tests never require an installed application or alter a user's model folder/profile.

## Dependency updates and packaging

Keep `package-lock.json` committed. Review dependency changes, run `npm run check` and `npm test`, then verify the packaged application. Electron includes Chromium and native prebuilt components; its own license notices must remain in the distributed runtime.

`electron-builder` packages only the allowlisted app files plus production dependencies. Development dependencies, fixtures, repository metadata, and scratch data are excluded. `dist/`, `node_modules/`, `.cache/`, and `.test-work/` are generated and ignored by Git. Never commit the installer or unpacked Electron runtime.

Three.js runtime addons live under `node_modules/three/examples/jsm`. This directory must be copied explicitly: default dependency pruning treats `examples` as non-runtime content. Do not remove the explicit file mapping from `electron-builder.json`. The `afterPack` hook walks both browser import graphs inside `app.asar`, including transitive modules, and verifies the import-map CSP hashes. Packaging fails before installer generation if any required module is missing. Run `node scripts/package-audit.cjs` to inspect an existing unpacked build.

The stable app identity is `org.modelbrowser.desktop`. The NSIS installer uses this identity to upgrade the existing installation. Preserve it across versions. The installer is per-user, offers a destination-directory choice, creates shortcuts, and retains application data on uninstall. Updates currently mean downloading and running a newer installer; an in-app auto-updater is not implemented.

The build deliberately disables executable signing/resource editing and automatic certificate discovery. Current setup files are unsigned. Configure Windows signing and appropriate executable resources before claiming a verified publisher. No signing credentials belong in this repository.

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md). Release instructions are in [RELEASING.md](RELEASING.md).
