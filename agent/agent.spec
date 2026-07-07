# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_all, collect_dynamic_libs

block_cipher = None

# Collect ALL data/binaries/hiddenimports for native packages
# av (PyAV) = FFmpeg bindings — needs avcodec, avformat, swscale DLLs
# aiortc = WebRTC — needs libvpx, opus codec DLLs
# mss = screen capture
# numpy = array processing (has .pyd/.dll files)

av_datas, av_binaries, av_hiddenimports = collect_all('av')
aiortc_datas, aiortc_binaries, aiortc_hiddenimports = collect_all('aiortc')
mss_datas, mss_binaries, mss_hiddenimports = collect_all('mss')

# Also grab dynamic libs explicitly as a safety net
av_dynlibs = collect_dynamic_libs('av')
aiortc_dynlibs = collect_dynamic_libs('aiortc')

all_binaries = av_binaries + aiortc_binaries + mss_binaries + av_dynlibs + aiortc_dynlibs
all_datas = av_datas + aiortc_datas + mss_datas
all_hiddenimports = av_hiddenimports + aiortc_hiddenimports + mss_hiddenimports

a = Analysis(
    ['main.py'],
    pathex=['..'],
    binaries=all_binaries,
    datas=all_datas,
    hiddenimports=all_hiddenimports + [
        # Agent modules
        'agent.command_handler',
        'agent.collector',
        'agent.screen_share',
        'agent.config',
        'agent.gui',
        # Network
        'websockets',
        'websockets.legacy',
        'websockets.legacy.client',
        # aiortc codec internals (often missed)
        'aiortc.codecs',
        'aiortc.codecs.vpx',
        'aiortc.codecs.h264',
        'aiortc.codecs.opus',
        'aiortc.mediastreams',
        'aiortc.rtcpeerconnection',
        'aiortc.rtcsessiondescription',
        # av internals
        'av.video',
        'av.video.frame',
        'av.video.stream',
        'av.codec',
        'av.codec.context',
        # numpy
        'numpy',
        'numpy.core',
        'numpy.core._multiarray_umath',
        # GUI
        'tkinter',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='agent',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,  # DISABLED — UPX corrupts native DLLs (av, aiortc, numpy)
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,  # Enable console for debugging — can see errors on target PCs
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
