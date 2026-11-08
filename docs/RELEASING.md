# Publishing source and Windows releases

The current application version is **0.3.1**. Publish one GitHub release named **ModelBrowser v0.3.1**, with independently downloadable source and installer assets. They do not need separate repositories or separate version tags.

## 1. Create the GitHub repository

Create a **public** repository named `ModelBrowser` under your GitHub account. Leave GitHub's initial README, license, and `.gitignore` options unchecked: these files already exist locally.

From the project folder:

```powershell
git status
git add .
git commit -m "Prepare ModelBrowser v0.3.1 open-source release"
git remote add origin https://github.com/YOUR-USERNAME/ModelBrowser.git
git push -u origin main
```

Replace `YOUR-USERNAME`. The project already has a Git repository and a `main` branch. If an `origin` remote already exists, inspect it with `git remote -v` before adding or changing it. Authenticate to GitHub using your normal Git credentials or GitHub CLI; never embed an access token in a remote URL.

Before committing, `git status --short` should show source/documentation changes, not `node_modules/`, `dist/`, `.cache/`, `.test-work/`, signing keys, or private model files. The included ignore rules handle generated directories. If a binary was previously tracked, ignoring it alone is insufficient; remove that specific file from Git's index before pushing.

## 2. Build and verify locally

Use Node.js 24.x or 26.x on Windows x64:

```powershell
npm ci
npm run check
npm test
npm run dist
npm run release:source
npm run release:checksums
```

Expected assets:

| File | Audience |
| --- | --- |
| `dist/ModelBrowser-Setup-0.3.1-x64.exe` | Windows users; installs the app or replaces an older installed version. |
| `dist/ModelBrowser-0.3.1-source.zip` | Developers; source, license, documentation, tests, workflows, and lockfile. Run `npm ci` after extracting. |
| `dist/SHA256SUMS.txt` | SHA-256 hashes of both downloads. |

`dist/win-unpacked/` is the runnable staging build; it is not the installer and should not be committed. `dist/ModelBrowser/`, if present from an earlier build, is the legacy portable app and is not used by the new release pipeline. The obsolete `dist/ModelBrowser-win32-x64/` is no longer used.

The explicit source ZIP contains a `SOURCE_SHA256SUMS.txt` manifest. GitHub also automatically provides **Source code (zip)** and **Source code (tar.gz)** for the release tag. Those GitHub-generated archives are sufficient if you do not want an additional source asset.

## 3A. Recommended: tag and let GitHub Actions prepare a draft

Commit and push all release changes before tagging:

```powershell
git tag -a v0.3.1 -m "ModelBrowser v0.3.1"
git push origin v0.3.1
```

The **Windows release** workflow runs tests, builds the installer, creates the source ZIP and checksums, and creates a **draft** GitHub release with these three assets. The tag must match `package.json` exactly. It does not publish automatically.

Open **Actions** to inspect the build. Then open **Releases**, edit the draft, verify the tag, downloads, and release notes, and click **Publish release**. If the draft-creation step is denied, check repository Actions permissions or download the workflow artifacts and use the manual route below.

The workflow can also be run manually from Actions to produce downloadable build artifacts without creating a release. Publication and actual account setup are still your actions.

## 3B. Manual release with separate downloads

After committing the release source and creating/pushing `v0.3.1`, open the repository's **Releases → Draft a new release** page:

1. Select the existing `v0.3.1` tag.
2. Set the title to `ModelBrowser v0.3.1`.
3. Paste or adapt [the release notes](releases/v0.3.1.md).
4. Attach `ModelBrowser-Setup-0.3.1-x64.exe` as the Windows installer.
5. Attach `ModelBrowser-0.3.1-source.zip` as the separate source download, if desired.
6. Attach `SHA256SUMS.txt`.
7. Save as draft until you have completed the checks, then publish.

Use either the automated tag workflow or manual creation; do not race both to create the same release. If the workflow already created a draft, edit that draft instead.

Optional GitHub CLI equivalent, after the tag is pushed:

```powershell
gh release create v0.3.1 --verify-tag --draft --title "ModelBrowser v0.3.1" --notes-file docs/releases/v0.3.1.md
gh release upload v0.3.1 dist/ModelBrowser-Setup-0.3.1-x64.exe dist/ModelBrowser-0.3.1-source.zip dist/SHA256SUMS.txt
```

## Installer and upgrade behavior

- Install for the current user; no administrator permission is normally needed.
- Close ModelBrowser before installing an update. Running a newer setup executable with the same app identity replaces the installed program.
- Settings and thumbnails live outside the installation folder and are retained across upgrades and uninstall.
- The installer does not patch an arbitrary old portable `dist/ModelBrowser` folder. Existing portable users should install normally and use the new shortcut. Retain the old folder until confirming that their settings/profile are present.
- No in-app update checker or silent background updater is included. Users obtain updates from GitHub Releases and rerun setup.
- This release is unsigned. Windows may show an unknown-publisher or reputation warning. Do not claim a verified publisher; configure signing for future releases if desired.

## Manual release checklist

- Install on a normal Windows x64 account; verify shortcuts, launch, and version in the title.
- Open real STL and 3MF files, including a large folder; rotate, zoom, pan, search, and paginate.
- Save settings, close the app, and verify settings after reopening.
- Change thumbnail resolution/cache policy and exercise cache clearing.
- Test an upgrade from a prior installed build with the same app identity, once one exists. Verify it replaces the prior version and preserves settings.
- Uninstall/reinstall and verify the documented retention behavior.
- Compare `Get-FileHash -Algorithm SHA256` results with `SHA256SUMS.txt`.
- Download the source archive into a fresh folder and confirm `npm ci`, `npm run check`, and `npm test` work.

Automated parser/DOM tests and successful installer compilation do not prove installation, upgrade, or real GPU behavior. Record the manual test outcome in release notes.

## Future versions

Use `npm version patch --no-git-tag-version` (or `minor`/`major`) to update both manifests. Update the changelog and add `docs/releases/vX.Y.Z.md`, commit, and tag the matching version. The runtime title, installer filename, source archive filename, and release workflow read the version from `package.json`. Keep `appId`, package name, and product name stable to preserve upgrades and profiles.

Do not overwrite a published version with different binaries. Publish a new version for fixes.

References: [GitHub release management](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository), [source archives](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives), [electron-builder NSIS](https://www.electron.build/nsis/).
