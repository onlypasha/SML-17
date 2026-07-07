import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  Monitor, Cpu, HardDrive, Activity, ChevronLeft, Circle,
  ArrowUpRight, LayoutGrid, Package, Cog, X
} from 'lucide-react';

const API_URL = 'http://localhost:8000';
const HISTORY_LENGTH = 20;

function App() {
  const [agents, setAgents] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [view, setView] = useState('grid'); // 'grid' | 'detail' | 'multiscreen'
  const historyRef = useRef({});

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        const response = await axios.get(`${API_URL}/agents/`);
        const data = response.data;

        // Update history for each agent
        const history = historyRef.current;
        Object.values(data).forEach((agent) => {
          const id = agent.agent_id;
          if (!history[id]) history[id] = [];
          const arr = history[id];
          arr.push({
            cpu: agent.cpu_percent || 0,
            ram: agent.ram_percent || 0,
          });
          if (arr.length > HISTORY_LENGTH) arr.shift();
        });

        setAgents(data);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };
    fetchAgents();
    const interval = setInterval(fetchAgents, 3000);
    return () => clearInterval(interval);
  }, []);

  const agentList = Object.values(agents);
  const onlineCount = agentList.filter(a => a.status === 'online').length;
  const offlineCount = agentList.filter(a => a.status === 'offline').length;
  const onlineAgents = agentList.filter(a => a.status === 'online');

  const handleSelectAgent = useCallback((agentId) => {
    setSelectedAgent(agentId);
    setView('detail');
  }, []);

  const handleBack = useCallback(() => {
    setSelectedAgent(null);
    setView('grid');
  }, []);

  const handleMultiScreen = useCallback(() => {
    setSelectedAgent(null);
    setView('multiscreen');
  }, []);

  const getHistory = useCallback((agentId) => {
    return historyRef.current[agentId] || [];
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="topbar-left">
            <span className="brand">Lab Monitor</span>
            <span className="brand-tag">SML-17</span>
            <div className="topbar-nav">
              <button 
                className={`nav-btn ${view === 'grid' || view === 'detail' ? 'active' : ''}`}
                onClick={() => { setSelectedAgent(null); setView('grid'); }}
              >
                Dashboard
              </button>
              <button 
                className={`nav-btn ${view === 'multiscreen' ? 'active' : ''}`}
                onClick={handleMultiScreen}
              >
                Multi-Screen
              </button>
            </div>
          </div>
          <div className="topbar-right">
            {view === 'detail' && (
              <button onClick={handleBack} className="back-btn">
                <ChevronLeft size={16} />
                Kembali
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        {view === 'detail' && selectedAgent ? (
          <AgentDetail
            agent={agents[selectedAgent]}
            agentId={selectedAgent}
            onBack={handleBack}
          />
        ) : view === 'multiscreen' ? (
          <MultiScreenMonitor agents={onlineAgents} />
        ) : (
          <>
            <div className="page-header">
              <div>
                <h2 className="page-title">Komputer Lab</h2>
                <p className="page-subtitle">{agentList.length} unit terdaftar</p>
              </div>
              <div className="status-pills">
                <span className="pill pill-online">
                  <Circle size={8} fill="currentColor" />
                  {onlineCount} aktif
                </span>
                <span className="pill pill-offline">
                  <Circle size={8} fill="currentColor" />
                  {offlineCount} mati
                </span>
              </div>
            </div>

            {agentList.length === 0 ? (
              <div className="empty-state">
                <Monitor size={32} strokeWidth={1.5} />
                <p className="empty-title">Belum ada agent terhubung</p>
                <p className="empty-desc">Jalankan agent.exe pada PC Lab untuk memulai monitoring.</p>
              </div>
            ) : (
              <div className="agent-grid">
                {agentList.map((agent) => (
                  <AgentCard
                    key={agent.agent_id}
                    agent={agent}
                    history={getHistory(agent.agent_id)}
                    onSelect={() => handleSelectAgent(agent.agent_id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---- Agent Card ---- */
function AgentCard({ agent, history, onSelect }) {
  const isOnline = agent.status === 'online';
  const appsCount = agent.apps ? agent.apps.length : 0;
  const servicesCount = agent.processes ? agent.processes.length : 0;

  return (
    <div className={`agent-card ${!isOnline ? 'agent-card--offline' : ''}`}>
      <div className="agent-card-header">
        <div className="agent-identity">
          <span className={`agent-dot ${isOnline ? 'dot-on' : 'dot-off'}`} />
          <div>
            <h3 className="agent-name">{agent.pc_name}</h3>
            <span className="agent-id">{agent.agent_id.split('-')[0]}</span>
          </div>
        </div>
        <span className={`status-tag ${isOnline ? 'tag-on' : 'tag-off'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="metrics">
        <Metric
          icon={Cpu}
          label="CPU"
          value={agent.cpu_percent}
          warn={agent.cpu_percent > 85}
        />
        <Metric
          icon={Activity}
          label="RAM"
          value={agent.ram_percent}
          warn={agent.ram_percent > 85}
        />
        <Metric
          icon={HardDrive}
          label="Disk"
          value={agent.disk_percent}
          warn={agent.disk_percent > 90}
        />
      </div>

      {/* Sparkline chart */}
      {history.length > 1 && (
        <div className="sparkline-container">
          <ResponsiveContainer width="100%" height={56}>
            <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
              <defs>
                <linearGradient id={`cpuGrad-${agent.agent_id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`ramGrad-${agent.agent_id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c6fa0" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7c6fa0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="cpu"
                stroke="var(--accent)"
                strokeWidth={1.5}
                fill={`url(#cpuGrad-${agent.agent_id})`}
                dot={false}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="ram"
                stroke="#7c6fa0"
                strokeWidth={1.5}
                fill={`url(#ramGrad-${agent.agent_id})`}
                dot={false}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="sparkline-legend">
            <span className="sparkline-legend-item">
              <span className="legend-swatch legend-cpu" />CPU
            </span>
            <span className="sparkline-legend-item">
              <span className="legend-swatch legend-ram" />RAM
            </span>
          </div>
        </div>
      )}

      {/* Apps & Services count */}
      <div className="card-counts">
        <span className="card-count-item">
          <Package size={12} />
          {appsCount} apps
        </span>
        <span className="card-count-sep">·</span>
        <span className="card-count-item">
          <Cog size={12} />
          {servicesCount} services
        </span>
      </div>

      <button
        onClick={onSelect}
        disabled={!isOnline}
        className="view-btn"
      >
        Detail
        <ArrowUpRight size={14} />
      </button>
    </div>
  );
}

/* ---- Metric Bar ---- */
function Metric({ icon: Icon, label, value, warn }) {
  const pct = value ? value.toFixed(1) : '0.0';
  return (
    <div className="metric">
      <div className="metric-head">
        <span className="metric-label">
          <Icon size={13} strokeWidth={2} />
          {label}
        </span>
        <span className={`metric-value ${warn ? 'metric-warn' : ''}`}>{pct}%</span>
      </div>
      <div className="metric-track">
        <div
          className={`metric-fill ${warn ? 'fill-warn' : ''}`}
          style={{ width: `${value || 0}%` }}
        />
      </div>
    </div>
  );
}

/* ---- Agent Detail View ---- */
function AgentDetail({ agent, agentId }) {
  const [activeTab, setActiveTab] = useState('screen');

  if (!agent) {
    return (
      <div className="empty-state">
        <Monitor size={32} strokeWidth={1.5} />
        <p className="empty-title">Agent tidak ditemukan</p>
      </div>
    );
  }

  return (
    <div className="detail-view">
      <div className="detail-header">
        <div>
          <h2 className="detail-title">{agent.pc_name}</h2>
          <span className="detail-agent-id">{agentId}</span>
        </div>
        <span className={`conn-tag ${agent.status === 'online' ? 'conn-live' : 'conn-wait'}`}>
          {agent.status === 'online' && <span className="live-dot" />}
          {agent.status === 'online' ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="detail-tabs">
        <button
          className={`detail-tab ${activeTab === 'screen' ? 'detail-tab--active' : ''}`}
          onClick={() => setActiveTab('screen')}
        >
          <Monitor size={14} />
          Layar
        </button>
        <button
          className={`detail-tab ${activeTab === 'apps' ? 'detail-tab--active' : ''}`}
          onClick={() => setActiveTab('apps')}
        >
          <Package size={14} />
          Aplikasi ({agent.apps ? agent.apps.length : 0})
        </button>
        <button
          className={`detail-tab ${activeTab === 'services' ? 'detail-tab--active' : ''}`}
          onClick={() => setActiveTab('services')}
        >
          <Cog size={14} />
          Proses ({agent.processes ? agent.processes.length : 0})
        </button>
      </div>

      <div className="detail-content">
        {activeTab === 'screen' && (
          <ScreenMonitor agentId={agentId} />
        )}
        {activeTab === 'apps' && (
          <AppsTable apps={agent.apps || []} />
        )}
        {activeTab === 'services' && (
          <ServicesTable services={agent.processes || []} />
        )}
      </div>
    </div>
  );
}

/* ---- Apps Table ---- */
function AppsTable({ apps }) {
  const [filter, setFilter] = useState('');
  const filtered = apps.filter(app => {
    const name = (app.name || app).toString().toLowerCase();
    return name.includes(filter.toLowerCase());
  });

  return (
    <div className="data-table-wrap">
      <div className="table-toolbar">
        <input
          type="text"
          className="table-search"
          placeholder="Cari aplikasi..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button className="table-clear" onClick={() => setFilter('')}>
            <X size={14} />
          </button>
        )}
        <span className="table-count">{filtered.length} dari {apps.length}</span>
      </div>
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Aplikasi</th>
              <th>Versi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="table-empty">Tidak ada data</td></tr>
            ) : (
              filtered.map((app, i) => (
                <tr key={i}>
                  <td className="table-num">{i + 1}</td>
                  <td>{typeof app === 'string' ? app : (app.name || '—')}</td>
                  <td className="table-dim">{typeof app === 'string' ? '—' : (app.version || '—')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Services / Processes Table ---- */
function ServicesTable({ services }) {
  const [filter, setFilter] = useState('');
  const filtered = services.filter(svc => {
    const name = (svc.name || svc).toString().toLowerCase();
    return name.includes(filter.toLowerCase());
  });

  return (
    <div className="data-table-wrap">
      <div className="table-toolbar">
        <input
          type="text"
          className="table-search"
          placeholder="Cari proses..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        {filter && (
          <button className="table-clear" onClick={() => setFilter('')}>
            <X size={14} />
          </button>
        )}
        <span className="table-count">{filtered.length} dari {services.length}</span>
      </div>
      <div className="data-table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>PID</th>
              <th>Nama Proses</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="table-empty">Tidak ada data</td></tr>
            ) : (
              filtered.map((svc, i) => (
                <tr key={i}>
                  <td className="table-mono">{typeof svc === 'string' ? '—' : (svc.pid || '—')}</td>
                  <td>{typeof svc === 'string' ? svc : (svc.name || '—')}</td>
                  <td>
                    <span className={`process-status ${(svc.status || '') === 'running' ? 'ps-running' : 'ps-other'}`}>
                      {typeof svc === 'string' ? '—' : (svc.status || '—')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Screen Monitor ---- */
function ScreenMonitor({ agentId }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState('Menghubungkan...');

  useEffect(() => {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      setStatus('Terhubung');
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
        setStatus('Terputus');
      }
    };

    const wsUrl = API_URL.replace('http', 'ws') + `/screen/ws/dashboard/${agentId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      setStatus('Negosiasi...');
      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete before sending SDP
      if (pc.iceGatheringState !== 'complete') {
        await new Promise((resolve) => {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve();
          };
        });
      }

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

  const isLive = status === 'Terhubung';

  return (
    <div className="screen-monitor">
      <div className="screen-header">
        <div>
          <h2 className="screen-title">Screen Monitor</h2>
          <p className="screen-agent-id">{agentId}</p>
        </div>
        <span className={`conn-tag ${isLive ? 'conn-live' : 'conn-wait'}`}>
          {isLive && <span className="live-dot" />}
          {status}
        </span>
      </div>

      <div className="screen-viewport">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="screen-video"
        />
        {!isLive && (
          <div className="screen-placeholder">
            <Monitor size={28} strokeWidth={1.5} />
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Mini Screen Monitor (for multi-screen grid) ---- */
function MiniScreenMonitor({ agentId, pcName }) {
  const videoRef = useRef(null);
  const pcRef = useRef(null);
  const [status, setStatus] = useState('Menghubungkan...');

  useEffect(() => {
    const configuration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    };
    const pc = new RTCPeerConnection(configuration);
    pcRef.current = pc;

    pc.ontrack = (event) => {
      setStatus('Terhubung');
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
        setStatus('Terputus');
      }
    };

    const wsUrl = API_URL.replace('http', 'ws') + `/screen/ws/dashboard/${agentId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      setStatus('Negosiasi...');
      pc.addTransceiver('video', { direction: 'recvonly' });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete before sending SDP
      if (pc.iceGatheringState !== 'complete') {
        await new Promise((resolve) => {
          pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') resolve();
          };
        });
      }

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

  const isLive = status === 'Terhubung';

  return (
    <div className="mini-screen">
      <div className="mini-screen-label">
        <span className={`mini-dot ${isLive ? 'dot-on' : 'dot-off'}`} />
        <span className="mini-name">{pcName}</span>
        <span className={`mini-status ${isLive ? 'mini-live' : ''}`}>{status}</span>
      </div>
      <div className="mini-viewport">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="screen-video"
        />
        {!isLive && (
          <div className="screen-placeholder">
            <Monitor size={20} strokeWidth={1.5} />
            <p>{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- Multi-Screen Monitor Page ---- */
function MultiScreenMonitor({ agents }) {
  if (agents.length === 0) {
    return (
      <div className="empty-state">
        <Monitor size={32} strokeWidth={1.5} />
        <p className="empty-title">Tidak ada agent online</p>
        <p className="empty-desc">Semua komputer sedang offline.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Monitor Semua Layar</h2>
          <p className="page-subtitle">{agents.length} komputer aktif</p>
        </div>
      </div>
      <div className="multi-screen-grid">
        {agents.map((agent) => (
          <MiniScreenMonitor
            key={agent.agent_id}
            agentId={agent.agent_id}
            pcName={agent.pc_name}
          />
        ))}
      </div>
    </div>
  );
}

export default App;
