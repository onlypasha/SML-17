import asyncio
import json
import websockets
from aiortc import RTCPeerConnection, RTCSessionDescription, VideoStreamTrack
import mss
import numpy as np
import av
import fractions
import time

class ScreenCaptureTrack(VideoStreamTrack):
    """
    A video stream track that captures the screen using mss.
    """
    def __init__(self):
        super().__init__()
        self.sct = mss.mss()
        # Default to the first monitor
        self.monitor = self.sct.monitors[1] if len(self.sct.monitors) > 1 else self.sct.monitors[0]
        
    async def recv(self):
        pts, time_base = await self.next_timestamp()
        
        # Capture screen
        sct_img = self.sct.grab(self.monitor)
        
        # Convert to numpy array
        img = np.array(sct_img)
        # Drop alpha channel (BGRA -> BGR)
        img = img[:, :, :3]
        
        # Create pyav video frame
        frame = av.VideoFrame.from_ndarray(img, format="bgr24")
        frame.pts = pts
        frame.time_base = time_base
        
        return frame

async def run_screen_share(server_url: str, agent_id: str):
    ws_url = server_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_endpoint = f"{ws_url.rstrip('/')}/screen/ws/agent/{agent_id}"
    
    while True:
        try:
            async with websockets.connect(ws_endpoint) as websocket:
                print(f"ScreenShare: Connected to {ws_endpoint}")
                pc = None
                
                async for message in websocket:
                    data = json.loads(message)
                    
                    if data["type"] == "offer":
                        print("ScreenShare: Received offer, creating RTCPeerConnection")
                        pc = RTCPeerConnection()
                        
                        # Add screen capture track
                        pc.addTrack(ScreenCaptureTrack())
                        
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

                        # Set remote description
                        offer = RTCSessionDescription(sdp=data["sdp"], type=data["type"])
                        await pc.setRemoteDescription(offer)
                        
                        # Create answer
                        answer = await pc.createAnswer()
                        await pc.setLocalDescription(answer)
                        
                        # Send answer
                        await websocket.send(json.dumps({
                            "type": pc.localDescription.type,
                            "sdp": pc.localDescription.sdp
                        }))
                        
                    elif data["type"] == "candidate":
                        # Simplistic candidate handling; aiortc handles most in offer
                        pass
                        
        except Exception as e:
            print(f"Screen share error: {e}. Retrying in 5s...")
            await asyncio.sleep(5)

def start_screen_share_thread(server_url: str, agent_id: str):
    import threading
    def loop_in_thread():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_screen_share(server_url, agent_id))
    
    t = threading.Thread(target=loop_in_thread, daemon=True)
    t.start()
