# Pinescape installer

Wraps the existing packaged build (the same folder you currently zip up as
`pinescapevr-windows.zip`) into a single `PinescapeSetup.exe`. Both are
published as release assets, with the installer as the primary Download
button on `download.html` and the zip offered as a portable alternative.

## One-time setup

1. Install [Inno Setup](https://jrsoftware.org/isinfo.php) (free).

## Building an installer for a release

1. Unzip the build you're about to release somewhere on disk, same as you
   would to test it normally.
2. Open `pinescape.iss` in Inno Setup (or right-click it -> "Compile").
3. Before compiling, update two lines at the top of the script:
   - `SourceDir` -> the full path to that unzipped folder (the one
     containing `Forestry.exe` directly).
   - `MyAppVersion` -> the version you're releasing (e.g. `1.1`), just for
     the installer's own version metadata; doesn't need to match your Git
     release tag exactly.
4. Compile. Inno Setup writes `PinescapeSetup.exe` into an `Output\`
   folder next to the script.
5. Test it: run the installer, confirm it installs, creates shortcuts, and
   launches, then confirm "Uninstall Pinescape" (Start Menu or Windows
   Settings -> Apps) cleanly removes it.
6. Upload `PinescapeSetup.exe` as a release asset, same as the zip today.

## Notes

- `pinescape.ico` (in this folder) brands `PinescapeSetup.exe` itself and the
  Start Menu/desktop shortcuts it creates. It does *not* change the icon
  Windows shows for `Forestry.exe` while the game is running or pinned to
  the taskbar - that's Unreal's default icon, baked into the exe at
  packaging time. Fixing that means setting a custom icon in the Unreal
  project (Project Settings -> Platforms -> Windows -> Icon) before the
  next package build.
- No code signing is set up here, so Windows SmartScreen will still warn on
  first run, the same as the raw exe does today (see the screenshot
  already in `assets/img/screenshots/windows-smartscreen-warning.jpg`).
  Signing removes that warning but requires buying a code-signing
  certificate; this script works fine without one, it's just a fully
  separate decision from "should we have an installer at all."
- `PrivilegesRequired=lowest` means it installs to the current user's own
  folder without asking for admin rights or a UAC prompt, matching how
  simply unzipping and running the exe works today.
