import asyncio
import json
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
import mss
import numpy as np
import av
import fractions
import time
import traceback

class ScreenCaptureTrack(VideoStreamTrack):
    """
    A video stream track that captures the screen using mss.
    """
    def __init__(self):
        super().__init__()
        self.sct = mss.mss()
        # Default to the first monitor
        self.monitor = self.sct.monitors[1] if len(self.sct.monitors) > 1 else self.sct.monitors[0]
        self._frame_count = 0
        print(f"[ScreenCapture] Initialized. Monitor: {self.monitor}")
        
        # Test capture immediately to verify mss works
        try:
            test = self.sct.grab(self.monitor)
            print(f"[ScreenCapture] Test capture OK: {test.width}x{test.height}")
        except Exception as e:
            print(f"[ScreenCapture] Test capture FAILED: {e}")
        
    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        try:
            # Capture screen
            sct_img = self.sct.grab(self.monitor)
            
            # Convert to numpy array
            img = np.array(sct_img)
            # Drop alpha channel (BGRA -> BGR)
            img = img[:, :, :3]
            
            # Create pyav video frame
            frame = av.VideoFrame.from_ndarray(img, format="bgr24")
            frame = frame.reformat(format="yuv420p")
            frame.pts = pts
            frame.time_base = time_base
            
            self._frame_count += 1
            if self._frame_count % 30 == 1:
                print(f"[ScreenCapture] Frame #{self._frame_count} sent ({img.shape[1]}x{img.shape[0]})")
            
            return frame
        except Exception as e:
            print(f"[ScreenCapture] Error capturing frame: {e}")
            traceback.print_exc()
            # Return a black frame on error so the track doesn't die
            black = np.zeros((720, 1280, 3), dtype=np.uint8)
            frame = av.VideoFrame.from_ndarray(black, format="bgr24")
            frame = frame.reformat(format="yuv420p")
            frame.pts = pts
            frame.time_base = time_base
            return frame

async def run_screen_share(server_url: str, agent_id: str):
    ws_url = server_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_url.rstrip('/')}/screen/ws/agent/{agent_id}"
    
    while True:
        try:
            print(f"[ScreenShare] Connecting to {ws_endpoint}...")
            async with websockets.connect(ws_endpoint) as websocket:
                print(f"[ScreenShare] Connected!")
                pc = None
                
                async for message in websocket:
                    data = json.loads(message)
                    
                    if data["type"] == "offer":
                        print("[ScreenShare] Received offer, creating RTCPeerConnection")
                        pc = RTCPeerConnection()
                        
                        # Add screen capture track
                        track = ScreenCaptureTrack()
                        pc.addTrack(track)
                        print("[ScreenShare] Added ScreenCaptureTrack")
                        
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
                            print(f"[ScreenShare] Connection state: {pc.connectionState}")

                        # Set remote description
                        offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                        await pc.setRemoteDescription(offer)
                        print("[ScreenShare] Remote description set")
                        
                        # Create answer
                        answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)
                        print("[ScreenShare] Local description set, sending answer")
                        
                        # Send answer
                        await websocket.send(json.dumps({
                            "type": pc.localDescription.type,
                            "sdp": pc.localDescription.sdp
                        }))
                        print("[ScreenShare] Answer sent!")
                        
                    elif data["type"] == "candidate":
                        # Simplistic candidate handling; aiortc handles most in offer
                        pass
                        
        except Exception as e:
            print(f"[ScreenShare] Error: {e}")
            traceback.print_exc()
            print("[ScreenShare] Retrying in 5s...")
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
