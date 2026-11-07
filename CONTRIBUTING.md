# Contributing to ModelBrowser

Bug reports, documentation improvements, tests, and pull requests are welcome.

For a bug report, include the application version, Windows version, steps to reproduce, expected/actual behavior, and whether the file is STL or 3MF. Include a minimal model only if you have permission to share it. Do not upload personal paths, confidential models, or settings containing private information unnecessarily.

For changes:

1. Fork the repository and create a focused branch.
2. Follow [the developer guide](docs/DEVELOPMENT.md).
3. Run `npm run check` and `npm test`.
4. Test relevant visual behavior in the desktop app.
5. Explain the change and validation in the pull request.

Keep model access behind the preload/main-process bridge. Dispose GPU resources, preserve bounded thumbnail work, validate settings in the main process, and avoid adding required native compilation steps without discussion.

Do not commit generated builds, dependency directories, caches, credentials, or private models. Contributions are submitted under the repository's [MIT license](LICENSE).
