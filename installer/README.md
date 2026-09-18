# Pinescape installer

Wraps the existing packaged build (the same folder you currently zip up as
`pinecraftvr-windows.zip`) into a single `PinescapeSetup.exe`. Optional:
the zip download still works fine on its own; this just gives people a
more familiar install path (Start Menu entry, desktop shortcut, a real
uninstaller) if you decide you want one.

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

- No code signing is set up here, so Windows SmartScreen will still warn on
  first run, the same as the raw exe does today (see the screenshot
  already in `assets/img/screenshots/windows-smartscreen-warning.jpg`).
  Signing removes that warning but requires buying a code-signing
  certificate; this script works fine without one, it's just a fully
  separate decision from "should we have an installer at all."
- `PrivilegesRequired=lowest` means it installs to the current user's own
  folder without asking for admin rights or a UAC prompt, matching how
  simply unzipping and running the exe works today.
