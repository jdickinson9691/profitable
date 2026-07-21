; Inno Setup script for Profitable -- packages the PyInstaller onedir build
; (dist/profitable/, produced by packaging/profitable.spec) into a
; double-clickable Setup.exe wizard.
;
; Build order:
;     pyinstaller packaging/profitable.spec --distpath dist --workpath build
;     iscc packaging/profitable.iss
;
; Output: dist/installer/ProfitableSetup.exe
;
; Per-user install (no admin required) under %LocalAppData%\Programs\Profitable.
; Ships both profitable-gui.exe (the graphical app -- primary Start Menu/
; Desktop shortcut) and profitable.exe (console CLI, reached via a "(Console)"
; shortcut that opens a persistent cmd prompt instead of flashing and closing).

#define MyAppName "Profitable"
#define MyAppVersion "0.1.0"
#define MyAppPublisher "Profitable"
#define MyAppExeName "profitable.exe"
#define MyGuiExeName "profitable-gui.exe"

[Setup]
AppId={{4F1A6E7C-2B7A-4E62-9F2E-6C8B3D2A9E11}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
OutputDir=..\dist\installer
OutputBaseFilename=ProfitableSetup
Compression=lzma
SolidCompression=yes
ArchitecturesInstallIn64BitMode=x64compatible

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "addtopath"; Description: "Add Profitable to PATH (recommended)"; GroupDescription: "Additional options:"
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional options:"; Flags: unchecked

[Files]
Source: "..\dist\profitable\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "profitable-shell.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
; Primary shortcuts launch the graphical app directly -- it's a real
; persistent window, so no flash-and-close concern.
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyGuiExeName}"; WorkingDir: "{app}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyGuiExeName}"; WorkingDir: "{app}"; Tasks: desktopicon
; profitable.exe (console CLI) requires db_path + a subcommand -- a direct
; shortcut to it opens a window that flashes and closes instantly (argparse
; error, no args). This shortcut instead opens a persistent cmd prompt
; (via profitable-shell.bat) in the install dir with --help printed.
Name: "{group}\{#MyAppName} (Console)"; Filename: "{app}\profitable-shell.bat"; WorkingDir: "{app}"; IconFilename: "{app}\{#MyAppExeName}"

[Registry]
Root: HKCU; Subkey: "Environment"; ValueType: expandsz; ValueName: "Path"; \
    ValueData: "{olddata};{app}"; Tasks: addtopath; Check: NeedsAddPath(ExpandConstant('{app}'))

[Run]
Filename: "{app}\{#MyAppExeName}"; Parameters: """{app}\data\local.db"" build-db"; \
    WorkingDir: "{app}"; StatusMsg: "Building starter database..."; Flags: runhidden

[Code]
function NeedsAddPath(Param: string): boolean;
var
  OrigPath: string;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', OrigPath) then
  begin
    Result := True;
    exit;
  end;
  Result := Pos(';' + Param + ';', ';' + OrigPath + ';') = 0;
end;

// Not using Flags: uninsdeletevalue on the [Registry] entry above -- that
// deletes the ENTIRE Path value on uninstall, wiping everything else the
// user has on PATH. This surgically removes just this app's segment.
procedure RemoveFromPath(Param: string);
var
  OrigPath, NewPath: string;
  P: Integer;
begin
  if not RegQueryStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', OrigPath) then
    exit;
  NewPath := ';' + OrigPath + ';';
  P := Pos(';' + Param + ';', NewPath);
  if P = 0 then
    exit;
  Delete(NewPath, P, Length(Param) + 1);
  if (Length(NewPath) > 0) and (NewPath[1] = ';') then
    Delete(NewPath, 1, 1);
  if (Length(NewPath) > 0) and (NewPath[Length(NewPath)] = ';') then
    Delete(NewPath, Length(NewPath), 1);
  RegWriteStringValue(HKEY_CURRENT_USER, 'Environment', 'Path', NewPath);
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
    RemoveFromPath(ExpandConstant('{app}'));
end;
