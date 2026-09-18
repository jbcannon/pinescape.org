; Inno Setup script for Pinescape. Compile with Inno Setup (jrsoftware.org)
; to produce a single PinescapeSetup.exe installer, wrapping the same
; packaged build folder that's currently zipped up for direct download.
; See README.md in this folder for the full walkthrough.

; MyAppName stays plain ASCII: it's used to build the install folder path
; below, and putting a Unicode (TM) symbol directly into a path Unreal
; reads from at runtime is an avoidable risk. MyAppDisplayName carries the
; (TM) instead, used only for on-screen labels (title bar, Add/Remove
; Programs, shortcut names), never in a filesystem path.
#define MyAppName "Pinescape"
#define MyAppDisplayName "Pinescape™"
#define MyAppVersion "1.0"
#define MyAppExeName "Forestry.exe"

; Point this at the root of your unzipped build (the folder that directly
; contains Forestry.exe) before compiling.
#define SourceDir "C:\Users\jeffery.cannon\OneDrive - Joseph W. Jones Ecological Research Center\Desktop\Pinescape\Pinescape 1.0"

[Setup]
AppName={#MyAppDisplayName}
AppVersion={#MyAppVersion}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputBaseFilename=PinescapeSetup
Compression=lzma2
SolidCompression=yes
; No admin rights required: installs to the user's own folder by default,
; matching how the zip works today (no elevation prompt).
PrivilegesRequired=lowest
; Shows EULA.txt as a wizard page the user must accept before Install
; becomes clickable. Silent/very-silent runs auto-accept it (no prompt),
; so this doesn't affect scripted installs.
LicenseFile=EULA.txt

[Files]
; Recursively includes everything in the build folder, so this script never
; needs updating when Unreal's generated files change between builds.
; SavedData/Download and SavedData/Local are excluded: per the Getting
; Started guide, Download populates itself from Google Drive on first
; launch and Local is where users drop their own custom maps, so a fresh
; install shouldn't ship with whatever test data happens to be sitting in
; the source build folder.
Source: "{#SourceDir}\*"; DestDir: "{app}"; Excludes: "Forestry\SavedData\Download\*,Forestry\SavedData\Local\*"; Flags: ignoreversion recursesubdirs createallsubdirs

[Dirs]
; Created explicitly since the exclusions above mean no files would
; otherwise put these folders in place on a fresh install.
Name: "{app}\Forestry\SavedData\Download"
Name: "{app}\Forestry\SavedData\Local"

[Icons]
Name: "{group}\{#MyAppDisplayName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppDisplayName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{group}\Uninstall {#MyAppDisplayName}"; Filename: "{uninstallexe}"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional shortcuts:"

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch {#MyAppDisplayName}"; Flags: nowait postinstall skipifsilent
