import asyncio
import json
import sys
import os
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
import mss
import numpy as np
import av
import fractions
import traceback

# Fix for PyInstaller: ensure av/aiortc can find codec DLLs in temp directory
if getattr(sys, 'frozen', False):
    bundle_dir = sys._MEIPASS
    os.environ['PATH'] = bundle_dir + os.pathsep + os.environ.get('PATH', '')
    print(f"[ScreenShare] PyInstaller bundle dir: {bundle_dir}")

# Max resolution for screen capture (resize if larger)
MAX_WIDTH = 1280
MAX_HEIGHT = 720


def test_video_pipeline():
    """Test that mss capture + av encoding works before starting WebRTC."""
    print("[ScreenShare] Testing video pipeline...")

    # Test mss
    try:
        sct = mss.mss()
        monitor = sct.monitors[1] if len(sct.monitors) > 1 else sct.monitors[0]
        img = sct.grab(monitor)
        print(f"[ScreenShare]   mss capture OK: {img.width}x{img.height}")
    except Exception as e:
        print(f"[ScreenShare]   mss capture FAILED: {e}")
        return False

    # Test numpy conversion
    try:
        arr = np.array(img)[:, :, :3]
        print(f"[ScreenShare]   numpy conversion OK: shape={arr.shape}")
    except Exception as e:
        print(f"[ScreenShare]   numpy conversion FAILED: {e}")
        return False

    # Test resize
    try:
        h, w = arr.shape[:2]
        if w > MAX_WIDTH or h > MAX_HEIGHT:
            scale = min(MAX_WIDTH / w, MAX_HEIGHT / h)
            new_w = int(w * scale) // 2 * 2  # ensure even
            new_h = int(h * scale) // 2 * 2
            frame = av.VideoFrame.from_ndarray(arr, format="bgr24")
            frame = frame.reformat(width=new_w, height=new_h, format="yuv420p")
            print(f"[ScreenShare]   resize OK: {w}x{h} -> {new_w}x{new_h}")
        else:
            frame = av.VideoFrame.from_ndarray(arr, format="bgr24")
            frame = frame.reformat(format="yuv420p")
            print(f"[ScreenShare]   frame reformat OK: {w}x{h}")
    except Exception as e:
        print(f"[ScreenShare]   av frame FAILED: {e}")
        traceback.print_exc()
        return False

    # Test VP8 encoding
    try:
        codec = av.CodecContext.create('libvpx', 'w')
        codec.width = frame.width
        codec.height = frame.height
        codec.pix_fmt = 'yuv420p'
        codec.time_base = fractions.Fraction(1, 30)
        codec.open()
        packets = codec.encode(frame)
        print(f"[ScreenShare]   VP8 encode OK: {len(packets)} packets")
        codec.close()
    except Exception as e:
        print(f"[ScreenShare]   VP8 encode FAILED: {e}")
        print(f"[ScreenShare]   Available codecs: checking...")
        try:
            for name in ['libvpx', 'libvpx-vp9', 'h264', 'libx264', 'libopenh264']:
                try:
                    c = av.CodecContext.create(name, 'w')
                    print(f"[ScreenShare]     {name}: AVAILABLE")
                except Exception:
                    print(f"[ScreenShare]     {name}: not found")
        except:
            pass
        # Don't return False — aiortc might handle codec differently
        print("[ScreenShare]   WARNING: VP8 test failed, but aiortc may use its own encoder")

    print("[ScreenShare] Pipeline test complete!")
    return True


class ScreenCaptureTrack(VideoStreamTrack):
    """
    A video stream track that captures the screen using mss.
    Resizes to max 1280x720 to reduce encoding load.
    """
    def __init__(self):
        super().__init__()
        self.sct = mss.mss()
        self.monitor = self.sct.monitors[1] if len(self.sct.monitors) > 1 else self.sct.monitors[0]
        self._frame_count = 0
        self._error_count = 0

        # Pre-calculate resize dimensions
        w = self.monitor['width']
        h = self.monitor['height']
        if w > MAX_WIDTH or h > MAX_HEIGHT:
            scale = min(MAX_WIDTH / w, MAX_HEIGHT / h)
            self._target_w = int(w * scale) // 2 * 2  # ensure even dimensions
            self._target_h = int(h * scale) // 2 * 2
            self._needs_resize = True
            print(f"[ScreenCapture] Will resize: {w}x{h} -> {self._target_w}x{self._target_h}")
        else:
            self._target_w = w // 2 * 2
            self._target_h = h // 2 * 2
            self._needs_resize = (self._target_w != w or self._target_h != h)
            print(f"[ScreenCapture] Resolution: {w}x{h} (even: {self._target_w}x{self._target_h})")

    async def recv(self):
        pts, time_base = await self.next_timestamp()

        try:
            sct_img = self.sct.grab(self.monitor)
            img = np.array(sct_img)[:, :, :3]

            frame = av.VideoFrame.from_ndarray(img, format="bgr24")

            if self._needs_resize:
                frame = frame.reformat(
                    width=self._target_w,
                    height=self._target_h,
                    format="yuv420p"
                )
            else:
                frame = frame.reformat(format="yuv420p")

            frame.pts = pts
            frame.time_base = time_base

            self._frame_count += 1
            if self._frame_count <= 3 or self._frame_count % 100 == 0:
                print(f"[ScreenCapture] Frame #{self._frame_count} OK ({frame.width}x{frame.height})")

            return frame

        except Exception as e:
            self._error_count += 1
            if self._error_count <= 5:
                print(f"[ScreenCapture] Frame error #{self._error_count}: {e}")
                traceback.print_exc()

            # Fallback: black frame with correct dimensions
            black = np.zeros((self._target_h, self._target_w, 3), dtype=np.uint8)
            frame = av.VideoFrame.from_ndarray(black, format="bgr24")
            frame = frame.reformat(format="yuv420p")
            frame.pts = pts
            frame.time_base = time_base
            return frame


async def run_screen_share(server_url: str, agent_id: str):
    ws_url = server_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_url.rstrip('/')}/screen/ws/agent/{agent_id}"

    # Test pipeline once at startup
    test_video_pipeline()

    while True:
        try:
            print(f"[ScreenShare] Connecting to {ws_endpoint}...")
            async with websockets.connect(ws_endpoint) as websocket:
                print(f"[ScreenShare] WebSocket connected")
                pc = None

                async for message in websocket:
                    data = json.loads(message)

                    if data["type"] == "offer":
                        # Close previous connection if any
                        if pc:
                            await pc.close()

                        print("[ScreenShare] Received offer")
                        pc = RTCPeerConnection()

                        track = ScreenCaptureTrack()
                        pc.addTrack(track)

                        @pc.on("icecandidate")
                        async def on_icecandidate(candidate):
                            if candidate:
                                msg = {
                                    "type": "candidate",
                                    "candidate": {
                                        "candidate": candidate.candidate,
                                        "sdpMid": candidate.sdpMid,
                                        "sdpMLineIndex": candidate.sdpMLineIndex,
                                    }
                                }
                                await websocket.send(json.dumps(msg))

                        @pc.on("connectionstatechange")
                        async def on_connectionstatechange():
                            print(f"[ScreenShare] WebRTC state: {pc.connectionState}")

                        offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                        await pc.setRemoteDescription(offer)

                        answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)

                        await websocket.send(json.dumps({
                            "type": pc.localDescription.type,
                            "sdp": pc.localDescription.sdp
                        }))
                        print("[ScreenShare] Answer sent")

                    elif data["type"] == "candidate":
                        pass

        except Exception as e:
            print(f"[ScreenShare] Error: {e}")
            traceback.print_exc()
            await asyncio.sleep(5)


def start_screen_share_thread(server_url: str, agent_id: str):
    import threading
    def loop_in_thread():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_screen_share(server_url, agent_id))

    t = threading.Thread(target=loop_in_thread, daemon=True)
    t.start()
    print(f"[ScreenShare] Thread started for agent {agent_id}")
