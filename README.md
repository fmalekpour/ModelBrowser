# ModelBrowser 0.3.0

A local Windows desktop browser for STL and 3MF models, built with Electron and Three.js. No server or account is required.

## Run

Double-click `dist/ModelBrowser/ModelBrowser.exe` after packaging. Keep the entire folder together; the executable depends on the accompanying files.

For development, open a terminal in this project and run:

```powershell
npm install
npm start
```

Use Node.js LTS. The optional Node native build tools, Visual Studio, and Rust are not needed.

## Use

- Open folder: select your STL/3MF directory.
- Subfolders: include nested directories (symbolic links are skipped).
- Search: filter filenames and relative paths across the entire folder; the format menu filters STL or 3MF. Previous/Next browse pages of 60 models.
- Click a card to load the full 3D preview. Left drag rotates, right drag pans, and the wheel zooms.
- Fit view and Front/Top/Right reposition the camera. Wireframe displays mesh edges.
- Drag the center divider to resize the preview, or focus it and use the arrow keys.
- Refresh rescans the folder after files change. Show in Explorer selects the current file.

Thumbnails are generated for visible cards in a separate background renderer process and cached in the application's user-data directory (`%APPDATA%/model-browser/thumbnails-v1` in development; the packaged app's directory name may differ). Changed files and thumbnail appearance settings receive new cache keys. Default limits are 120 thumbnail images in memory, 512 MB on disk, 30 days without use, 30 seconds per thumbnail, and a worker restart every 50 models. Changing pages, filters, or folders cancels obsolete work. No model files are modified or uploaded.

## Settings

Open **Settings** in the header. Adjust values, then choose **Save changes**. Cancel discards edits; Restore defaults loads defaults into the form until saved. Settings persist between launches, and existing last-folder preferences migrate automatically. The app version appears in the title, header, and settings page.

- Library: card width, 12–240 models per page, sort field and direction, subfolders, reopen-last-folder behavior, automatic thumbnails, and scan limit.
- Thumbnails and cache: render resolution and angle; memory-and-disk, memory-only, or no-cache policy; memory count, disk budget, and expiry. An expiry of 0 disables age-based eviction. Disk eviction removes the least recently used images first.
- Preview: camera angle, panel width, background, STL color, lighting, display pixel ratio, and initial wireframe mode.
- Mouse and motion: rotation, zoom and pan speeds, automatic rotation, and rotation speed.
- Performance: model size limit, thumbnail timeout, and worker recycling interval.
- Cache management: current usage, storage location, and Clear thumbnail cache. This removes only generated images. Memory-only and no-cache policies do not delete existing disk files automatically.

Saved changes apply immediately; changes to scan limits or subfolder behavior rescan the current folder. A selected STL updates its color without reloading. Higher page counts, resolution, file limits, and cache sizes can consume more memory or disk space.

## Package Windows app

```powershell
npm run package
```

This produces a standalone Windows x64 application folder under `dist`. Users running that package do not need Node. This first version is unsigned and has no installer or automatic updater.

## Current limits

- Defaults are 150 MB per model and 20,000 matching files per scan; Settings permits up to 500 MB and 100,000 files.
- Thumbnail parsing runs separately from the interface. Selecting a particularly complex model can still briefly pause the interactive preview during its full-resolution load.
- STL coordinates have no inherent unit. Dimensions display raw model coordinates, in X/Y/Z order, assuming the usual Z-up printing convention.
- Three.js supports core 3MF models and some extensions. Slicer-specific metadata, some materials, and advanced 3MF extensions may not display accurately. Test your actual slicer exports.
- Thumbnails are static 3D renders; the selected model is fully interactive.
- Refresh is manual; filesystem watching and per-object controls are not included yet.
- Only Windows x64 is packaged here. Electron and the app's core code can also target macOS and Linux with platform-specific packaging.

## Files

- `main.cjs`: folder access, settings, thumbnail cache, desktop window.
- `preload.cjs`: restricted bridge between the interface and filesystem operations.
- `renderer.js`: model loading, rendering, controls, and grid.
- `style.css` / `index.html`: interface.
- `build.cjs`: Windows packaging.
- `settings-schema.mjs` / `settings-view.js`: validated preferences and settings interface.
- `disk-cache.cjs`: cache size, expiry, eviction, and clearing.

The renderer has Node integration disabled, context isolation and sandboxing enabled, and a restrictive content policy. Dependencies are pinned by `package-lock.json`.

## Validation

JavaScript syntax checks and direct parser checks passed for ASCII STL, binary STL, and a generated 3MF ZIP, including triangle counts and dimensions. Version 0.2 adds tests for a generated 600-file directory, recursive scanning, scan limits, pagination and search, bounded cache size, DOM interactions, serial thumbnail scheduling, cancellation, timeouts, worker crashes, and renderer recycling. Desktop launch remains blocked by the development agent's restricted Windows environment, so actual background WebGL rendering still needs verification in a normal desktop session. No sandbox-disabling flags are included in the packaged app.

Version 0.3 tests cover all 29 settings, input validation, settings migration and persistence, title version, settings form save/cancel/reset, dynamic layout, cache invalidation, LRU eviction, expiry, memory-only/no-cache behavior, and safe cache clearing. Automated DOM tests use a simulated renderer; visual desktop verification remains subject to the launch limitation above.
