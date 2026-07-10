import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import {
  Monitor, Cpu, HardDrive, Activity, ChevronLeft, Circle,
  RefreshCw, Power, Server, PlayCircle, StopCircle, Cog, Play, Trash2, XCircle, X,
  FileUp, FolderDown, Send, Lock, Unlock, ArrowUpRight, Package, File as FileIcon, UploadCloud, LayoutGrid
} from 'lucide-react';

const API_URL = window.location.port === '5173' ? 'http://localhost:8000' : '';
const WS_URL = window.location.port === '5173' ? 'ws://localhost:8000' : (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;
const HISTORY_LENGTH = 20;

function App() {
  const [agents, setAgents] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [lockedAgents, setLockedAgents] = useState(new Set());
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
              <button 
                className={`nav-btn ${view === 'filemanager' ? 'active' : ''}`}
                onClick={() => { setSelectedAgent(null); setView('filemanager'); }}
              >
                File Manager
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
            isLocked={lockedAgents.has(selectedAgent)}
            setLocked={(val) => {
              setLockedAgents(prev => {
                const next = new Set(prev);
                if (val) next.add(selectedAgent);
                else next.delete(selectedAgent);
                return next;
              });
            }}
          />
        ) : view === 'multiscreen' ? (
          <MultiScreenMonitor 
            agents={onlineAgents} 
            lockedAgents={lockedAgents}
            setLockedAgents={setLockedAgents}
          />
        ) : view === 'filemanager' ? (
          <FileManager agents={onlineAgents} />
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
function AgentDetail({ agent, agentId, onBack, isLocked, setLocked }) {
  const [activeTab, setActiveTab] = useState('screen');

  if (!agent) {
    return (
      <div className="empty-state">
        <Monitor size={32} strokeWidth={1.5} />
        <p className="empty-title">Agent tidak ditemukan</p>
      </div>
    );
  }

  const handleLock = async () => {
    const { value: message } = await Swal.fire({
      title: 'Kunci PC',
      input: 'text',
      inputLabel: 'Pesan untuk ditampilkan di layar siswa:',
      inputValue: 'Harap perhatikan instruktur di depan kelas.',
      showCancelButton: true,
      confirmButtonText: 'Kunci Sekarang'
    });

    if (message) {
      try {
        await axios.post(`${API_URL}/commands/send`, {
          agent_id: agentId,
          command: "lock_screen",
          payload: { message }
        });
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Perintah Kunci berhasil dikirim', showConfirmButton: false, timer: 3000 });
        setLocked(true);
      } catch (e) {
        Swal.fire('Gagal!', 'Tidak dapat mengirim perintah: ' + e.message, 'error');
      }
    }
  };

  const handleUnlock = async () => {
    try {
      await axios.post(`${API_URL}/commands/send`, {
        agent_id: agentId,
        command: "unlock_screen",
        payload: {}
      });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Perintah Buka Kunci berhasil dikirim', showConfirmButton: false, timer: 3000 });
      setLocked(false);
    } catch (e) {
      Swal.fire('Gagal!', 'Tidak dapat mengirim perintah: ' + e.message, 'error');
    }
  };

  return (
    <div className="detail-view">
      <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="detail-title">{agent.pc_name}</h2>
          <span className="detail-agent-id">{agentId}</span>
          <span className={`conn-tag ${agent.status === 'online' ? 'conn-live' : 'conn-wait'}`} style={{ marginLeft: '10px' }}>
            {agent.status === 'online' && <span className="live-dot" />}
            {agent.status === 'online' ? 'Online' : 'Offline'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="view-btn" onClick={handleLock} disabled={agent.status !== 'online' || isLocked} style={{ background: '#d33', color: 'white', borderColor: '#d33' }}>
            <Lock size={14} />
            Kunci PC
          </button>
          <button className="view-btn" onClick={handleUnlock} disabled={agent.status !== 'online' || !isLocked} style={{ background: '#3085d6', color: 'white', borderColor: '#3085d6' }}>
            <Unlock size={14} />
            Buka Kunci
          </button>
        </div>
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
          <AppsTable apps={agent.apps || []} agentId={agentId} />
        )}
        {activeTab === 'services' && (
          <ServicesTable services={agent.processes || []} agentId={agentId} />
        )}
      </div>
    </div>
  );
}

/* ---- Apps Table ---- */
function AppsTable({ apps, agentId }) {
  const [filter, setFilter] = useState('');
  const filtered = apps.filter(app => {
    const name = (app.name || app).toString().toLowerCase();
    return name.includes(filter.toLowerCase());
  });

  const handleUninstall = async (appName) => {
    const result = await Swal.fire({
      title: 'Hapus Aplikasi?',
      text: `Apakah Anda yakin ingin menghapus aplikasi "${appName}" di komputer ini?\n\nPerhatian: Proses ini berjalan di latar belakang dan tidak dapat dibatalkan.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Uninstall!',
      cancelButtonText: 'Batal'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      await axios.post(`${API_URL}/commands/send`, {
        agent_id: agentId,
        command: "uninstall_app",
        payload: { app_name: appName }
      });
      Swal.fire('Berhasil!', `Perintah uninstall dikirim untuk ${appName}.`, 'success');
    } catch (e) {
      Swal.fire('Gagal!', "Gagal mengirim perintah: " + e.message, 'error');
    }
  };

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
              <th style={{width: '60px'}}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="table-empty">Tidak ada data</td></tr>
            ) : (
              filtered.map((app, i) => {
                const appName = typeof app === 'string' ? app : (app.name || '—');
                return (
                  <tr key={i}>
                    <td className="table-num">{i + 1}</td>
                    <td>{appName}</td>
                    <td className="table-dim">{typeof app === 'string' ? '—' : (app.version || '—')}</td>
                    <td>
                      <button 
                        className="action-btn btn-danger" 
                        title="Uninstall"
                        onClick={() => handleUninstall(appName)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---- Services / Processes Table ---- */
function ServicesTable({ services, agentId }) {
  const [filter, setFilter] = useState('');
  const filtered = services.filter(svc => {
    const name = (svc.name || svc).toString().toLowerCase();
    return name.includes(filter.toLowerCase());
  });

  const handleKill = async (pid, name) => {
    const result = await Swal.fire({
      title: 'Hentikan Proses?',
      text: `Apakah Anda yakin ingin menghentikan proses ${name} (PID: ${pid})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, Hentikan!',
      cancelButtonText: 'Batal'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      await axios.post(`${API_URL}/commands/send`, {
        agent_id: agentId,
        command: "kill_process",
        payload: { pid: pid }
      });
      Swal.fire('Berhasil!', `Perintah stop dikirim untuk proses ${name}.`, 'success');
    } catch (e) {
      Swal.fire('Gagal!', "Gagal mengirim perintah: " + e.message, 'error');
    }
  };

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
              <th style={{width: '60px'}}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="table-empty">Tidak ada data</td></tr>
            ) : (
              filtered.map((svc, i) => {
                const pid = typeof svc === 'string' ? null : svc.pid;
                const name = typeof svc === 'string' ? svc : (svc.name || '—');
                return (
                  <tr key={i}>
                    <td className="table-mono">{pid || '—'}</td>
                    <td>{name}</td>
                    <td>
                      <span className={`process-status ${(svc.status || '') === 'running' ? 'ps-running' : 'ps-other'}`}>
                        {typeof svc === 'string' ? '—' : (svc.status || '—')}
                      </span>
                    </td>
                    <td>
                      {pid && (
                        <button 
                          className="action-btn btn-danger" 
                          title="Hentikan Proses"
                          onClick={() => handleKill(pid, name)}
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
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
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
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

    const wsUrl = WS_URL + `/screen/ws/dashboard/${agentId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      setStatus('Negosiasi...');
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
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun.cloudflare.com:3478' }
      ]
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

    const wsUrl = WS_URL + `/screen/ws/dashboard/${agentId}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = async () => {
      setStatus('Negosiasi...');
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
function MultiScreenMonitor({ agents, lockedAgents, setLockedAgents }) {
  if (agents.length === 0) {
    return (
      <div className="empty-state">
        <Monitor size={32} strokeWidth={1.5} />
        <p className="empty-title">Tidak ada agent online</p>
        <p className="empty-desc">Semua komputer sedang offline.</p>
      </div>
    );
  }

  const handleLockAll = async () => {
    const { value: message } = await Swal.fire({
      title: 'Kunci Semua PC',
      input: 'text',
      inputLabel: 'Pesan untuk ditampilkan di layar siswa:',
      inputValue: 'Harap perhatikan instruktur di depan kelas.',
      showCancelButton: true,
      confirmButtonText: 'Kunci Semua',
      confirmButtonColor: '#f59e0b'
    });

    if (message) {
      try {
        await axios.post(`${API_URL}/commands/broadcast`, {
          command: "lock_screen",
          payload: { message }
        });
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Perintah Kunci berhasil di-broadcast', showConfirmButton: false, timer: 3000 });
        setLockedAgents(new Set(agents.map(a => a.agent_id)));
      } catch (e) {
        Swal.fire('Gagal!', 'Tidak dapat mengirim perintah: ' + e.message, 'error');
      }
    }
  };

  const handleUnlockAll = async () => {
    try {
      await axios.post(`${API_URL}/commands/broadcast`, {
        command: "unlock_screen",
        payload: {}
      });
      Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Perintah Buka Kunci berhasil di-broadcast', showConfirmButton: false, timer: 3000 });
      setLockedAgents(new Set());
    } catch (e) {
      Swal.fire('Gagal!', 'Tidak dapat mengirim perintah: ' + e.message, 'error');
    }
  };

  const onlineCount = agents.length;
  const allLocked = onlineCount > 0 && agents.every(a => lockedAgents.has(a.agent_id));
  const noneLocked = onlineCount === 0 || agents.every(a => !lockedAgents.has(a.agent_id));

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="page-title">Monitor Semua Layar</h2>
          <p className="page-subtitle">{agents.length} komputer aktif</p>
        </div>
        <div className="bulk-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn btn-warning" 
            onClick={handleLockAll} 
            disabled={onlineCount === 0 || allLocked}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            <Lock size={14} /> Kunci Semua
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleUnlockAll} 
            disabled={onlineCount === 0 || noneLocked}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
          >
            <Unlock size={14} /> Buka Semua
          </button>
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

/* ---- File Manager Page ---- */
function FileManager({ agents }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState({});
  const fileInputRef = useRef(null);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_URL}/files/`);
      setFiles(res.data.files);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      await axios.post(`${API_URL}/files/upload`, formData);
      fetchFiles();
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        icon: 'success',
        title: `File ${file.name} berhasil diunggah.`
      });
    } catch (err) {
      Swal.fire('Gagal!', "Gagal mengunggah file: " + err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (filename) => {
    const result = await Swal.fire({
      title: 'Hapus File?',
      text: `Hapus file ${filename} dari server?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });
    
    if (!result.isConfirmed) return;
    
    try {
      await axios.delete(`${API_URL}/files/${encodeURIComponent(filename)}`);
      fetchFiles();
    } catch (e) {
      Swal.fire('Gagal!', "Gagal menghapus file: " + e.message, 'error');
    }
  };

  const handleSendToAgents = async (filename) => {
    const targetAgents = Object.keys(selectedAgents).filter(id => selectedAgents[id]);
    
    if (targetAgents.length === 0) {
      Swal.fire('Perhatian', "Pilih minimal satu agent untuk dikirimi file.", 'warning');
      return;
    }

    const url = `${window.location.protocol}//${window.location.hostname}:8000/files/download/${encodeURIComponent(filename)}`;
    let successCount = 0;

    for (const agentId of targetAgents) {
      try {
        await axios.post(`${API_URL}/commands/send`, {
          agent_id: agentId,
          command: "download_file",
          payload: { filename, url }
        });
        successCount++;
      } catch (e) {
        console.error(`Gagal kirim ke ${agentId}:`, e);
      }
    }

    Swal.fire('Berhasil!', `Perintah download dikirim ke ${successCount} agent.`, 'success');
  };

  const toggleSelectAll = (e) => {
    const checked = e.target.checked;
    const newSelected = {};
    agents.forEach(a => newSelected[a.agent_id] = checked);
    setSelectedAgents(newSelected);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">File Manager</h2>
          <p className="page-subtitle">Kelola dan distribusikan file ke komputer lab.</p>
        </div>
        <div className="status-pills">
          <button 
            className="action-btn"
            style={{ width: 'auto', padding: '0 12px', background: 'var(--accent)', color: 'white' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <UploadCloud size={16} style={{marginRight: '6px'}} />
            {uploading ? 'Mengunggah...' : 'Upload File Baru'}
          </button>
          <input 
            type="file" 
            style={{display: 'none'}} 
            ref={fileInputRef}
            onChange={handleUpload}
          />
        </div>
      </div>

      <div className="multi-screen-grid" style={{gridTemplateColumns: '1fr', gap: '20px'}}>
        <div className="data-table-wrap">
          <div className="table-toolbar">
            <span style={{fontWeight: 600, fontSize: '14px', color: 'var(--text)'}}>Target Distribusi File</span>
          </div>
          <div style={{padding: '12px 16px', background: 'var(--bg)', borderBottom: '1px solid var(--border-light)'}}>
            <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px'}}>
              <input type="checkbox" onChange={toggleSelectAll} />
              <strong>Pilih Semua Agent Aktif ({agents.length})</strong>
            </label>
          </div>
          <div style={{padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
            {agents.length === 0 && <span className="table-dim">Tidak ada agent aktif.</span>}
            {agents.map(a => (
              <label key={a.agent_id} style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', background: 'var(--bg-muted)', padding: '4px 10px', borderRadius: '20px'}}>
                <input 
                  type="checkbox" 
                  checked={!!selectedAgents[a.agent_id]}
                  onChange={(e) => setSelectedAgents({...selectedAgents, [a.agent_id]: e.target.checked})}
                />
                {a.pc_name}
              </label>
            ))}
          </div>
        </div>

        <div className="data-table-wrap">
          <div className="table-toolbar" style={{justifyContent: 'space-between'}}>
            <span style={{fontWeight: 600, fontSize: '14px', color: 'var(--text)'}}>File di Server</span>
            <button className="table-clear" onClick={fetchFiles} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama File</th>
                <th>Ukuran</th>
                <th style={{width: '120px'}}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {files.length === 0 ? (
                <tr><td colSpan={3} className="table-empty">Belum ada file di server.</td></tr>
              ) : (
                files.map((file, i) => (
                  <tr key={i}>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                        <FileIcon size={16} className="table-dim" />
                        {file.name}
                      </div>
                    </td>
                    <td className="table-dim">{(file.size / 1024).toFixed(1)} KB</td>
                    <td>
                      <div style={{display: 'flex', gap: '4px'}}>
                        <button 
                          className="action-btn" 
                          title="Kirim ke Agent Terpilih"
                          style={{color: 'var(--accent)'}}
                          onClick={() => handleSendToAgents(file.name)}
                        >
                          <Send size={16} />
                        </button>
                        <button 
                          className="action-btn btn-danger" 
                          title="Hapus File"
                          onClick={() => handleDelete(file.name)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
