# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for both `profitable` (console CLI, scripts/cli.py) and
# `profitable-gui` (windowed Tkinter GUI, gui/app.py).
#
# Build from anywhere (paths are resolved relative to this spec file via
# SPECPATH, which PyInstaller injects automatically):
#     pyinstaller packaging/profitable.spec --distpath dist --workpath build
#
# Produces a onedir build at dist/profitable/ containing both profitable.exe
# and profitable-gui.exe side by side, sharing the same bundled db/schema.sql
# + db/seed_data.sql data files (so `build-db`/"New Database" works
# standalone, with no source repo required at runtime -- see
# scripts/build_db.py's frozen-mode resource resolution).
import os

REPO_ROOT = os.path.abspath(os.path.join(SPECPATH, ".."))
DATAS = [
    (os.path.join(REPO_ROOT, "db", "schema.sql"), "db"),
    (os.path.join(REPO_ROOT, "db", "seed_data.sql"), "db"),
]

cli_a = Analysis(
    [os.path.join(REPO_ROOT, "scripts", "cli.py")],
    pathex=[REPO_ROOT],
    binaries=[],
    datas=DATAS,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
cli_pyz = PYZ(cli_a.pure)
cli_exe = EXE(
    cli_pyz,
    cli_a.scripts,
    [],
    exclude_binaries=True,
    name="profitable",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
)

gui_a = Analysis(
    [os.path.join(REPO_ROOT, "gui", "app.py")],
    pathex=[REPO_ROOT],
    binaries=[],
    datas=DATAS,
    hiddenimports=[],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
)
gui_pyz = PYZ(gui_a.pure)
gui_exe = EXE(
    gui_pyz,
    gui_a.scripts,
    [],
    exclude_binaries=True,
    name="profitable-gui",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
)

coll = COLLECT(
    cli_exe,
    cli_a.binaries,
    cli_a.datas,
    gui_exe,
    gui_a.binaries,
    gui_a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="profitable",
)
