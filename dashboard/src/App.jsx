import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Monitor, Cpu, HardDrive, Activity, Server, ChevronLeft } from 'lucide-react';

const API_URL = 'http://localhost:8000';

function App() {
  const [agents, setAgents] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get(`${API_URL}/agents/`);
        setAgents(response.data);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 3000);
    return () => clearInterval(interval);
  }, []);

  const agentList = Object.values(agents);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-blue-500/30">
      <nav className="border-b border-white/10 bg-white/5 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <Server className="w-5 h-5 text-blue-400" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Lab Monitor 17
            </h1>
          </div>
          {selectedAgent && (
            <button 
              onClick={() => setSelectedAgent(null)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors border border-white/10 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Dashboard
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {selectedAgent ? (
          <ScreenMonitor agentId={selectedAgent} />
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Daftar Komputer</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div> Online: {agentList.filter(a => a.status === 'online').length}</span>
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div> Offline: {agentList.filter(a => a.status === 'offline').length}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {agentList.map((agent) => (
                <AgentCard 
                  key={agent.agent_id} 
                  agent={agent} 
                  onSelect={() => setSelectedAgent(agent.agent_id)} 
                />
              ))}
              {agentList.length === 0 && (
                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border border-dashed border-slate-700 rounded-2xl bg-white/5">
                  <Monitor className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg">Belum ada agent yang terhubung</p>
                  <p className="text-sm mt-1">Jalankan agent.exe pada PC Lab untuk memulai monitoring</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function AgentCard({ agent, onSelect }) {
  const isOnline = agent.status === 'online';
  
  return (
    <div 
      className={`relative group overflow-hidden rounded-2xl border transition-all duration-300 ${
        isOnline 
          ? 'bg-white/[0.02] border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5' 
          : 'bg-slate-900/50 border-rose-500/20 opacity-75 grayscale-[0.5]'
      }`}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex gap-4 items-center">
            <div className={`p-3 rounded-xl ${isOnline ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-800 text-slate-500'}`}>
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{agent.pc_name}</h3>
              <p className="text-xs text-slate-400 font-mono">{agent.agent_id.split('-')[0]}</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
            isOnline 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>

        <div className="space-y-4">
          <MetricBar icon={Cpu} label="CPU" value={agent.cpu_percent} color="blue" />
          <MetricBar icon={Activity} label="RAM" value={agent.ram_percent} color="violet" />
          <MetricBar icon={HardDrive} label="Disk" value={agent.disk_percent} color="emerald" />
        </div>

        <button 
          onClick={onSelect}
          disabled={!isOnline}
          className={`mt-6 w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
            isOnline 
              ? 'bg-white/5 hover:bg-blue-500 text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]' 
              : 'bg-white/5 text-slate-500 cursor-not-allowed'
          }`}
        >
          Lihat Layar
        </button>
      </div>
      
      {isOnline && (
        <div className="absolute -inset-px bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500 -z-10" />
      )}
    </div>
  );
}

function MetricBar({ icon: Icon, label, value, color }) {
  const colorMap = {
    blue: 'bg-blue-500 shadow-blue-500/50',
    violet: 'bg-violet-500 shadow-violet-500/50',
    emerald: 'bg-emerald-500 shadow-emerald-500/50',
    rose: 'bg-rose-500 shadow-rose-500/50',
  };
  
  const barColor = value > 90 ? colorMap.rose : colorMap[color];
  
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 text-slate-300">
          <Icon className="w-3.5 h-3.5 opacity-70" /> {label}
        </span>
        <span className="font-medium">{value ? value.toFixed(1) : 0}%</span>
      </div>
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)] ${barColor}`}
          style={{ width: `${value || 0}%` }}
        />
      </div>
    </div>
  );
}

function ScreenMonitor({ agentId }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    const pc = new RTCPeerConnection();
    pcRef.current = pc;

    pc.ontrack = (event) => {
      setStatus('Connected (Live)');
      if (videoRef.current) {
        if (event.streams && event.streams.length > 0) {
          videoRef.current.srcObject = event.streams[0];
        } else {
          videoRef.current.srcObject = new MediaStream([event.track]);
        }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setStatus('Disconnected');
      }
    };

    const wsUrl = API_URL.replace('http', 'ws') + `/screen/ws/dashboard/${agentId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      setStatus('Negotiating...');
      pc.addTransceiver('video', { direction: 'recvonly' });
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      ws.send(JSON.stringify({
        type: pc.localDescription.type,
        sdp: pc.localDescription.sdp
      }));
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.type === 'candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        ws.send(JSON.stringify({
          type: 'candidate',
          candidate: event.candidate
        }));
      }
    };

    return () => {
      pc.close();
      ws.close();
    };
  }, [agentId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-800/50 p-6 rounded-2xl border border-white/5">
        <div>
          <h2 className="text-2xl font-bold">Screen Monitor</h2>
          <p className="text-slate-400 mt-1">Agent ID: {agentId}</p>
        </div>
        <div className={`px-4 py-1.5 rounded-full text-sm font-medium border flex items-center gap-2 ${
          status.includes('Live') 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
        }`}>
          {status.includes('Live') && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
          {status}
        </div>
      </div>

      <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline
          muted
          className="w-full h-full object-contain"
        />
        {status !== 'Connected (Live)' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-900/80 backdrop-blur-sm">
            <Monitor className="w-16 h-16 mb-4 animate-pulse opacity-20" />
            <p className="text-xl font-medium text-slate-400">{status}</p>
            <p className="text-sm mt-2 opacity-70">Membuat koneksi WebRTC (aiortc)...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
