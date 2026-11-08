# Third-party notices

ModelBrowser's own source is provided under the MIT license in `LICENSE`. Dependencies retain their own copyright and license terms.

## Distributed application

- **Electron** — MIT; bundles Chromium, Node.js, and other components with their own notices. Keep the packaged runtime's `LICENSE.electron.txt` and `LICENSES.chromium.html` files. See <https://github.com/electron/electron>.
- **Three.js** — MIT. Its package includes the applicable license and addon sources, including STL/3MF loaders and the embedded fflate ZIP implementation. See <https://github.com/mrdoob/three.js> and <https://github.com/101arrowz/fflate>.

## Build and test tools

- **electron-builder** — MIT; downloads NSIS and related prebuilt packaging tools. Those tools carry their own licenses. See <https://github.com/electron-userland/electron-builder>.
- **LinkeDOM** — ISC; used only for automated DOM tests. See <https://github.com/WebReflection/linkedom>.
- **ES Module Lexer** — MIT; used only to verify browser imports during packaging and tests. See <https://github.com/guybedford/es-module-lexer>.

The exact dependency tree is recorded in `package-lock.json`; inspect the installed packages for the complete license texts of transitive dependencies. Development dependencies are not bundled as application runtime dependencies. Preserve dependency licenses when redistributing or repackaging the application.
