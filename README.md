# ModelBrowser

**An offline desktop library browser for STL and 3MF models.** Browse a folder of 3D-printing files as thumbnails, select a model, and inspect it in an interactive preview.

ModelBrowser is free and open source under the [MIT license](LICENSE). The current version is **0.3.1**. Windows x64 is the supported packaged platform.

## Features

- Browse local folders and optional subfolders without importing or moving files.
- Search filenames and paths, filter STL/3MF, sort, and page through large libraries.
- Generate thumbnails in a separate background process, with cancellation and configurable limits.
- Rotate, zoom, and pan the selected model; use camera presets or wireframe mode.
- View triangle counts, dimensions, and file sizes; reveal a model in Explorer.
- Customize 29 settings, including thumbnail size/resolution, page size, colors, camera controls, cache policy, and performance limits.
- Keep settings between launches. Inspect and clear the thumbnail cache from Settings.

The app operates locally. It does not upload models, require an account, or use a hosted backend.

## Install on Windows

1. Open this repository's **Releases** page.
2. Download **`ModelBrowser-Setup-0.3.1-x64.exe`** for Windows x64.
3. Run setup and choose an installation folder.
4. Launch **ModelBrowser** from the Start menu or desktop shortcut.

Node.js and development tools are **not** required to run the installed app. The installer is currently unsigned, so Windows may identify it as an unknown publisher. Release assets include SHA-256 checksums for verifying downloads.

To update, close ModelBrowser and run the newer version's setup executable. It replaces the installed program while preserving settings and cached thumbnails. Updates are downloaded manually from Releases; an in-app automatic updater is not included.

If you used an earlier portable build, install the new version normally and use its shortcut. Setup does not patch an arbitrary old portable folder. Keep that folder until you have verified the installed app and your settings.

## Use

Click **Open folder**, choose a directory containing `.stl` or `.3mf` files, then select a thumbnail.

| Control | Action |
| --- | --- |
| Left mouse drag | Rotate the preview |
| Right mouse drag | Pan |
| Mouse wheel | Zoom |
| Fit view | Reframe the model |
| Front / Top / Right | Set a standard camera angle |
| Wireframe | Show mesh edges |
| Divider drag | Resize the preview panel |
| Refresh | Rescan changed files |
| Settings | Adjust layout, rendering, caching, and limits |

Search covers the entire scanned folder, not just the current page. Thumbnail generation begins with visible cards; cached previews make later visits faster.

## Settings and cache

Open **Settings**, adjust values, and choose **Save changes**. **Cancel** discards edits. **Restore defaults** loads defaults into the form; save to apply them.

| Area | Examples |
| --- | --- |
| Library | Card width, models per page, sort order, subfolders, reopen last folder |
| Thumbnails | Render resolution, camera angle, automatic generation |
| Cache | Memory-and-disk, memory-only, or no-cache mode; size and expiry limits |
| Preview | Background/STL colors, lighting, panel width, default view, wireframe |
| Interaction | Rotation, zoom, pan, automatic rotation |
| Performance | File size, scan limit, thumbnail timeout, worker recycling |

Default limits are **60 models per page**, **120 cached images in memory**, **512 MB disk cache**, **30 days without use**, **150 MB per model**, and **20,000 files per scan**. Most limits can be adjusted in Settings. Increasing them can increase resource use.

Settings and thumbnails are stored in the user's application-data directory, separate from the installed program. Settings shows the actual cache location and usage. Cache clearing deletes generated images only; it does not modify model files. Installer upgrades and uninstall retain the user profile.

## Limitations

- STL files do not define units. Dimensions are shown in model coordinates.
- Some slicer-specific 3MF extensions and materials are not supported by the Three.js loader.
- A particularly complex selected model can pause its full-resolution preview while parsing.
- Folder changes require **Refresh**; live filesystem watching is not implemented.
- The packaged target is Windows x64. Other desktop platforms require additional packaging and testing.

## Run from source

Install Node.js **24.x or 26.x** and Git, then clone or extract the source:

```powershell
npm ci
npm start
```

No Visual Studio, Rust, or optional Node native-module build tools are required. The first dependency/runtime download requires internet access.

```powershell
npm run check       # Syntax and manifest checks
npm test            # Parser, library, settings, cache, and worker tests
npm run package     # Runnable build: dist/win-unpacked/
npm run dist        # Windows setup executable: dist/
```

Read the [developer guide](docs/DEVELOPMENT.md) for architecture, tests, and implementation details. Read the [release guide](docs/RELEASING.md) for publishing the source ZIP and Windows installer as separate GitHub downloads.

## Contributing and licensing

See [CONTRIBUTING.md](CONTRIBUTING.md), the [changelog](CHANGELOG.md), and [third-party notices](THIRD_PARTY_NOTICES.md). Include the app version and reproducible steps when reporting an issue; share model files only when you have permission to do so.

Copyright © 2026 ModelBrowser contributors. Licensed under [MIT](LICENSE). Dependencies retain their own licenses.
