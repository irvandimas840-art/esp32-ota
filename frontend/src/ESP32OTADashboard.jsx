import { useState, useEffect, useRef, useCallback } from "react";
import { THEMES, DEFAULT_THEME, getThemeCSS } from "./themes.js";

const API = "http://192.168.12.214:8000/ota";
const OFFLINE_SEC = 30;
const HIDE_MIN    = 5;

function ts() { return new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit",second:"2-digit"}); }
function formatBytes(b) {
  if (!b||b===0) return "0 B";
  if (b<1024) return b+" B";
  if (b<1048576) return (b/1024).toFixed(1)+" KB";
  return (b/1048576).toFixed(2)+" MB";
}
const getTempColor  = t    => t<50?"var(--success)":t<70?"var(--warning)":"var(--danger)";
const getRSSIBars   = rssi => rssi>=-50?4:rssi>=-60?3:rssi>=-70?2:rssi>=-80?1:0;
const getRSSIColor  = rssi => rssi>=-50?"var(--success)":rssi>=-60?"var(--accent)":rssi>=-70?"var(--warning)":"var(--danger)";
const getRSSILabel  = rssi => rssi>=-50?"Excellent":rssi>=-60?"Good":rssi>=-70?"Fair":rssi>=-80?"Weak":"Very Weak";
const getAge        = ra   => Math.floor((Date.now()-new Date(ra+"Z").getTime())/1000);

// ─── Theme Switcher ───────────────────────────────────────────────────────────
function ThemeSwitcher({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const theme = THEMES[current];
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(o=>!o)} style={{
        background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,
        color:"var(--text)",fontFamily:"var(--mono)",fontSize:"0.7rem",
        padding:"0.4rem 0.8rem",cursor:"pointer",display:"flex",alignItems:"center",gap:"0.5rem"
      }}>
        <span>{theme.icon}</span>
        <span>{theme.name}</span>
        <span style={{color:"var(--muted)",fontSize:"0.6rem"}}>▼</span>
      </button>
      {open && (
        <div style={{
          position:"absolute",top:"calc(100% + 6px)",right:0,
          background:"var(--surface)",border:"1px solid var(--border)",
          borderRadius:10,padding:"0.5rem",zIndex:300,minWidth:160,
          boxShadow:"0 8px 32px rgba(0,0,0,0.4)",animation:"fadeIn 0.15s ease both"
        }}>
          {Object.entries(THEMES).map(([key,t])=>(
            <button key={key} onClick={()=>{onChange(key);setOpen(false);}} style={{
              width:"100%",display:"flex",alignItems:"center",gap:"0.6rem",
              padding:"0.45rem 0.6rem",borderRadius:6,border:"none",cursor:"pointer",
              background:current===key?"rgba(0,212,255,0.12)":"transparent",
              color:current===key?"var(--accent)":"var(--text)",
              fontFamily:"var(--mono)",fontSize:"0.72rem",textAlign:"left",
              transition:"background 0.15s"
            }}>
              <span>{t.icon}</span><span>{t.name}</span>
              {current===key&&<span style={{marginLeft:"auto",fontSize:"0.6rem"}}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Spinner({ visible }) {
  if (!visible) return null;
  return <span style={{display:"inline-block",width:14,height:14,border:"2px solid rgba(255,255,255,0.15)",borderTopColor:"var(--accent)",borderRadius:"50%",animation:"spin 0.7s linear infinite"}} />;
}

function StatusBar({ status }) {
  const colors = {online:"var(--success)",error:"var(--danger)",checking:"var(--muted)"};
  const labels = {online:`API online · ${API}`,error:`API tidak dapat dijangkau · ${API}`,checking:"Memeriksa koneksi API..."};
  const color  = colors[status]||colors.checking;
  return (
    <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,padding:"0.65rem 1.2rem",display:"flex",alignItems:"center",gap:"0.6rem",fontFamily:"var(--mono)",fontSize:"0.72rem",marginBottom:"1rem"}}>
      <div style={{width:7,height:7,borderRadius:"50%",flexShrink:0,background:color,boxShadow:status==="online"?`0 0 7px ${color}`:"none",animation:status==="online"?"pulse 2s infinite":"none"}} />
      <span style={{color}}>{labels[status]||labels.checking}</span>
    </div>
  );
}

function Card({ children, style: s }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div onMouseEnter={()=>setHovered(true)} onMouseLeave={()=>setHovered(false)}
      style={{background:"var(--surface)",border:`1px solid ${hovered?"var(--accent)":"var(--border)"}`,opacity:hovered?1:0.95,borderRadius:12,padding:"1.25rem",position:"relative",overflow:"hidden",transition:"border-color 0.2s, opacity 0.2s",...s}}>
      <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg, var(--accent), var(--accent2))",opacity:hovered?1:0,transition:"opacity 0.3s"}} />
      {children}
    </div>
  );
}

function CardLabel({ children }) {
  return (
    <div style={{fontFamily:"var(--mono)",fontSize:"0.62rem",color:"var(--accent)",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:"0.9rem",display:"flex",alignItems:"center",gap:"0.4rem"}}>
      <span style={{display:"inline-block",width:14,height:1,background:"var(--accent)"}} />{children}
    </div>
  );
}

function Btn({ children, onClick, disabled, variant="primary", style: s }) {
  const base = {width:"100%",padding:"0.75rem 1rem",border:"none",borderRadius:8,fontFamily:"var(--sans)",fontSize:"0.85rem",fontWeight:600,cursor:disabled?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem",marginTop:"0.65rem",transition:"all 0.2s",opacity:disabled?0.4:1,...s};
  const v = {
    primary:{background:"linear-gradient(135deg, var(--accent), #0099bb)",color:"#000"},
    trigger:{background:"linear-gradient(135deg, var(--accent2), #5b21b6)",color:"#fff"},
    danger: {background:"linear-gradient(135deg, var(--danger), #b91c1c)",color:"#fff"},
  };
  return <button onClick={disabled?undefined:onClick} disabled={disabled} style={{...base,...v[variant]}}>{children}</button>;
}

function InfoRow({ label, value, accent }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:"1px solid var(--border)"}}>
      <span style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:"0.7rem",flexShrink:0}}>{label}</span>
      <span style={{fontFamily:"var(--mono)",fontSize:"0.7rem",color:accent?"var(--accent)":"var(--text)",maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginLeft:"1rem"}}>{value}</span>
    </div>
  );
}

function LogEntry({ entry }) {
  const colors = {success:"var(--success)",error:"var(--danger)",info:"var(--accent)",warn:"var(--warning)"};
  return (
    <div style={{display:"flex",gap:"0.6rem"}}>
      <span style={{color:"var(--muted)",flexShrink:0,fontFamily:"var(--mono)",fontSize:"0.68rem"}}>{entry.ts}</span>
      <span style={{color:colors[entry.type]||"var(--accent)",fontFamily:"var(--mono)",fontSize:"0.68rem"}}>{entry.msg}</span>
    </div>
  );
}

function Toast({ toast }) {
  if (!toast) return null;
  const bc = toast.type==="success"?"var(--success)":toast.type==="warn"?"var(--warning)":"var(--danger)";
  return (
    <div style={{position:"fixed",bottom:"1.5rem",right:"1.5rem",background:"var(--surface)",border:`1px solid ${bc}`,borderRadius:10,padding:"0.75rem 1.2rem",fontSize:"0.82rem",display:"flex",alignItems:"center",gap:"0.6rem",zIndex:100,maxWidth:340,animation:"toast-in 0.3s ease forwards"}}>
      <span>{toast.type==="success"?"✅":toast.type==="warn"?"⚠️":"❌"}</span><span>{toast.msg}</span>
    </div>
  );
}

function ConfirmModal({ visible, title, message, onConfirm, onCancel, confirmLabel="Ya", variant="trigger" }) {
  if (!visible) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(4px)"}}>
      <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"2rem",maxWidth:420,width:"90%",animation:"fadeIn 0.2s ease both"}}>
        <div style={{fontSize:"1.4rem",marginBottom:"0.75rem"}}>{variant==="danger"?"⚠️":"🚀"}</div>
        <h3 style={{fontWeight:700,marginBottom:"0.5rem",color:"var(--text)"}}>{title}</h3>
        <p style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:"0.75rem",lineHeight:1.6,marginBottom:"1.5rem",whiteSpace:"pre-line"}}>{message}</p>
        <div style={{display:"flex",gap:"0.75rem"}}>
          <button onClick={onCancel} style={{flex:1,padding:"0.7rem",border:"1px solid var(--border)",borderRadius:8,background:"transparent",color:"var(--muted)",fontFamily:"var(--sans)",fontSize:"0.85rem",cursor:"pointer"}}>Batal</button>
          <Btn onClick={onConfirm} variant={variant} style={{flex:1,marginTop:0}}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Device Detail ────────────────────────────────────────────────────────────
function StatBox({ label, icon, children }) {
  return (
    <div style={{background:"var(--card-bg)",borderRadius:10,padding:"0.9rem"}}>
      <div style={{fontFamily:"var(--mono)",fontSize:"0.55rem",color:"var(--muted)",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:5}}>{icon} {label}</div>
      {children}
    </div>
  );
}

function DeviceDetail({ device }) {
  const tempColor  = getTempColor(device.temperature);
  const rssiColor  = getRSSIColor(device.rssi);
  const age        = getAge(device.received_at);
  const isOnline   = age < OFFLINE_SEC;
  const timeLabel  = age<60?`${age}s ago`:age<3600?`${Math.floor(age/60)}m ago`:`${Math.floor(age/3600)}h ago`;

  return (
    <div style={{animation:"fadeIn 0.3s ease both"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1rem",padding:"0.75rem 1rem",background:"var(--card-bg)",borderRadius:10,border:`1px solid ${isOnline?"rgba(16,185,129,0.25)":"rgba(239,68,68,0.2)"}`}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.75rem"}}>
          <div style={{width:9,height:9,borderRadius:"50%",background:isOnline?"var(--success)":"var(--danger)",boxShadow:isOnline?"0 0 7px var(--success)":"0 0 7px var(--danger)",animation:isOnline?"pulse 2s infinite":"none"}} />
          <div>
            <div style={{fontFamily:"var(--mono)",fontSize:"0.82rem",fontWeight:700,color:"var(--accent)"}}>{device.device_id}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--muted)",marginTop:2}}>Last seen: {timeLabel}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap",justifyContent:"flex-end"}}>
          {[
            {label:isOnline?"● Online":"● Offline",color:isOnline?"var(--success)":"var(--danger)"},
            {label:device.save_to_ota?"OTA ✓":"OTA ✗",color:device.save_to_ota?"var(--success)":"var(--danger)"},
            {label:`📡 ${device.mqtt_topic}`,color:"var(--accent)"},
          ].map((b,i)=>(
            <span key={i} style={{background:`color-mix(in srgb, ${b.color} 12%, transparent)`,color:b.color,borderRadius:20,padding:"0.18rem 0.65rem",fontFamily:"var(--mono)",fontSize:"0.6rem",border:`1px solid color-mix(in srgb, ${b.color} 25%, transparent)`}}>{b.label}</span>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.65rem",marginBottom:"0.65rem"}}>
        <StatBox label="Temperature" icon="🌡️">
          <div style={{fontFamily:"var(--mono)",fontSize:"1.3rem",fontWeight:700,color:tempColor}}>{device.temperature.toFixed(1)}°C</div>
          <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--muted)",marginTop:2}}>{device.temperature<50?"Normal":device.temperature<70?"Warm":"🔥 Hot!"}</div>
          <div style={{height:3,background:"var(--border)",borderRadius:2,overflow:"hidden",marginTop:7}}>
            <div style={{height:"100%",width:`${Math.min(100,(device.temperature/100)*100)}%`,background:tempColor,borderRadius:2,transition:"width 1s"}} />
          </div>
        </StatBox>
        <StatBox label="WiFi RSSI" icon="📶">
          <div style={{fontFamily:"var(--mono)",fontSize:"1.3rem",fontWeight:700,color:rssiColor}}>{device.rssi} dBm</div>
          <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--muted)",marginTop:2}}>{getRSSILabel(device.rssi)}</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:3,marginTop:7}}>
            {[5,8,11,14].map((h,i)=><div key={i} style={{width:5,height:h,borderRadius:1,background:i<getRSSIBars(device.rssi)?rssiColor:"var(--border)",transition:"background 0.4s"}} />)}
          </div>
        </StatBox>
        <StatBox label="OTA Status" icon="💾">
          <div style={{fontFamily:"var(--mono)",fontSize:"0.95rem",fontWeight:700,color:device.save_to_ota?"var(--success)":"var(--danger)",marginTop:4}}>{device.save_to_ota?"Saved ✓":"Not Saved ✗"}</div>
          <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--muted)",marginTop:4}}>{device.save_to_ota?"Firmware tersimpan":"Belum tersimpan"}</div>
        </StatBox>
      </div>

      <div style={{background:"var(--card-bg)",borderRadius:10,padding:"0.75rem 1rem"}}>
        <InfoRow label="device_id"   value={device.device_id} accent />
        <InfoRow label="mqtt_topic"  value={device.mqtt_topic} accent />
        <InfoRow label="last update" value={new Date(device.received_at+"Z").toLocaleString("id-ID")} />
      </div>
    </div>
  );
}

// ─── Device List ──────────────────────────────────────────────────────────────
function DeviceList({ devices, selectedId, onSelect, onDelete, selectedForTrigger, onToggle }) {
  const online  = devices.filter(d=>getAge(d.received_at)<OFFLINE_SEC);
  const offline = devices.filter(d=>getAge(d.received_at)>=OFFLINE_SEC);

  const Row = ({device}) => {
    const age        = getAge(device.received_at);
    const isOnline   = age < OFFLINE_SEC;
    const isSelected = device.device_id === selectedId;
    const isChecked  = selectedForTrigger.includes(device.device_id);
    const timeLabel  = age<60?`${age}s`:age<3600?`${Math.floor(age/60)}m`:`${Math.floor(age/3600)}h`;
    return (
      <div style={{display:"flex",alignItems:"center",gap:"0.5rem",padding:"0.5rem 0.65rem",borderRadius:7,background:isSelected?"rgba(0,212,255,0.07)":"var(--card-bg)",border:`1px solid ${isSelected?"var(--accent)":isOnline?"rgba(16,185,129,0.12)":"rgba(239,68,68,0.1)"}`,marginBottom:"0.35rem",transition:"all 0.15s"}}>
        <input type="checkbox" checked={isChecked} onChange={()=>onToggle(device.device_id)} onClick={e=>e.stopPropagation()} style={{width:13,height:13,cursor:"pointer",accentColor:"var(--accent2)",flexShrink:0}} />
        <div style={{width:6,height:6,borderRadius:"50%",background:isOnline?"var(--success)":"var(--danger)",boxShadow:isOnline?"0 0 4px var(--success)":"none",animation:isOnline?"pulse 2s infinite":"none",flexShrink:0}} />
        <div style={{flex:1,minWidth:0,cursor:"pointer"}} onClick={()=>onSelect(device.device_id)}>
          <div style={{fontFamily:"var(--mono)",fontSize:"0.72rem",fontWeight:700,color:isSelected?"var(--accent)":"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{device.device_id}</div>
          <div style={{fontFamily:"var(--mono)",fontSize:"0.57rem",color:"var(--muted)",marginTop:1}}>{device.temperature.toFixed(1)}°C · {device.rssi}dBm</div>
        </div>
        <span style={{fontFamily:"var(--mono)",fontSize:"0.57rem",color:isOnline?"var(--success)":"var(--danger)",flexShrink:0}}>{isOnline?`${timeLabel} ago`:"Offline"}</span>
        <button onClick={e=>{e.stopPropagation();onDelete(device.device_id);}} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:4,color:"var(--danger)",fontFamily:"var(--mono)",fontSize:"0.57rem",padding:"0.12rem 0.35rem",cursor:"pointer",flexShrink:0}}>✕</button>
      </div>
    );
  };

  return (
    <div style={{maxHeight:320,overflowY:"auto",paddingRight:2}}>
      {online.length>0&&<>
        <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--success)",marginBottom:"0.3rem",letterSpacing:"0.1em"}}>● ONLINE ({online.length})</div>
        {online.map(d=><Row key={d.device_id} device={d} />)}
      </>}
      {offline.length>0&&<>
        <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--danger)",marginTop:"0.6rem",marginBottom:"0.3rem",letterSpacing:"0.1em"}}>● OFFLINE ({offline.length})</div>
        {offline.map(d=><Row key={d.device_id} device={d} />)}
      </>}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ESP32OTADashboard() {
  const [themeKey,       setThemeKey]       = useState(()=>localStorage.getItem("ota_theme")||DEFAULT_THEME);
  const [apiStatus,      setApiStatus]      = useState("checking");
  const [file,           setFile]           = useState(null);
  const [dragOver,       setDragOver]       = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [progressLabel,  setProgressLabel]  = useState("Uploading...");
  const [firmwareInfo,   setFirmwareInfo]   = useState(null);
  const [firmwareError,  setFirmwareError]  = useState(null);
  const [logs,           setLogs]           = useState([{ts:"--:--:--",msg:"Dashboard siap.",type:"info"}]);
  const [toast,          setToast]          = useState(null);
  const [triggering,     setTriggering]     = useState(false);
  const [devices,        setDevices]        = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedForTrigger, setSelectedForTrigger] = useState([]);
  const [loadingStatus,  setLoadingStatus]  = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState(null);
  const [confirmTrigger,   setConfirmTrigger]   = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [pendingFile,      setPendingFile]      = useState(null);
  const [logFilter,        setLogFilter]        = useState("all");

  const logBoxRef    = useRef(null);
  const fileInputRef = useRef(null);
  const theme        = THEMES[themeKey] || THEMES[DEFAULT_THEME];

  const changeTheme = (key) => { setThemeKey(key); localStorage.setItem("ota_theme", key); };

  const addLog    = useCallback((msg,type="info")=>setLogs(p=>[...p,{ts:ts(),msg,type}]),[]);
  const showToast = useCallback((msg,type="success")=>{setToast({msg,type});setTimeout(()=>setToast(null),3500);},[]);

  useEffect(()=>{if(logBoxRef.current)logBoxRef.current.scrollTop=logBoxRef.current.scrollHeight;},[logs]);

  const checkApiStatus = useCallback(async()=>{
    setApiStatus("checking");
    try{const r=await fetch(`${API}/firmware/info`,{signal:AbortSignal.timeout(4000)});if(r.ok||r.status===404){setApiStatus("online");addLog("Koneksi API berhasil","success");}else throw new Error(`HTTP ${r.status}`);}
    catch(e){setApiStatus("error");addLog(`Gagal konek: ${e.message}`,"error");}
  },[addLog]);

  const loadFirmwareInfo = useCallback(async()=>{
    setFirmwareError(null);
    try{
      const r=await fetch(`${API}/firmware/info`);
      if(r.status===404){setFirmwareInfo(null);setFirmwareError("Belum ada firmware.");addLog("Belum ada firmware","warn");return;}
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const d=await r.json();setFirmwareInfo(d);addLog(`Firmware: ${d.filename} (${formatBytes(d.size_bytes)})`,"success");
    }catch(e){setFirmwareInfo(null);setFirmwareError("Gagal load firmware.");addLog(`Gagal firmware info: ${e.message}`,"error");}
  },[addLog]);

  const fetchDevices = useCallback(async()=>{
    setLoadingStatus(true);
    try{
      const r=await fetch(`${API}/device/status`,{signal:AbortSignal.timeout(5000)});
      if(r.status===404){setDevices([]);setLoadingStatus(false);return;}
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const d=await r.json();
      const list=(d.devices||[]).filter(dev=>getAge(dev.received_at)<HIDE_MIN*60);
      setDevices(list);setLastUpdated(new Date());
      setSelectedDevice(p=>{
        if(!p&&list.length>0)return list[0].device_id;
        if(p&&!list.find(x=>x.device_id===p)&&list.length>0)return list[0].device_id;
        return p;
      });
    }catch(e){addLog(`Gagal fetch devices: ${e.message}`,"warn");}
    finally{setLoadingStatus(false);}
  },[addLog]);

  const deleteDevice = useCallback(async(id)=>{
    try{
      await fetch(`${API}/device/${id}`,{method:"DELETE"});
      setDevices(p=>p.filter(d=>d.device_id!==id));
      setSelectedDevice(p=>p===id?null:p);
      setSelectedForTrigger(p=>p.filter(x=>x!==id));
      addLog(`Device ${id} dihapus`,"warn");showToast(`Device ${id} dihapus`);
    }catch{showToast("Gagal hapus device","error");}
  },[addLog,showToast]);

  useEffect(()=>{checkApiStatus();loadFirmwareInfo();fetchDevices();},[checkApiStatus,loadFirmwareInfo,fetchDevices]);
  useEffect(()=>{const id=setInterval(()=>fetchDevices().catch(()=>{}),10000);return()=>clearInterval(id);},[fetchDevices]);

  const toggleTrigger   = id=>setSelectedForTrigger(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const selectAll       = ()=>setSelectedForTrigger(devices.map(d=>d.device_id));
  const clearSelection  = ()=>setSelectedForTrigger([]);

  const handleFileChange = f=>{
    if(!f)return;
    if(!f.name.endsWith(".bin")){showToast("Hanya file .bin","error");return;}
    if(firmwareInfo){setPendingFile(f);setConfirmOverwrite(true);}
    else{setFile(f);addLog(`File: ${f.name} (${formatBytes(f.size)})`,"info");}
  };

  const confirmOverwriteFn = ()=>{setFile(pendingFile);addLog(`File: ${pendingFile.name} — timpa firmware lama`,"warn");setPendingFile(null);setConfirmOverwrite(false);};

  const handleUpload = ()=>{
    if(!file)return;
    setUploading(true);setProgress(0);setProgressLabel("Uploading...");addLog(`Upload ${file.name}...`,"info");
    const xhr=new XMLHttpRequest();xhr.open("POST",`${API}/firmware/upload`);
    xhr.upload.onprogress=e=>{if(e.lengthComputable){const p=Math.round((e.loaded/e.total)*100);setProgress(p);setProgressLabel(`Uploading... ${p}%`);}};
    xhr.onload=async()=>{
      setUploading(false);
      if(xhr.status===200){setProgress(100);setProgressLabel("Selesai ✓");addLog(`Upload berhasil: ${file.name}`,"success");showToast("Firmware berhasil diupload!");setFile(null);await loadFirmwareInfo();}
      else{setProgressLabel("Gagal");addLog(`Upload gagal (${xhr.status})`,"error");showToast("Upload gagal","error");}
    };
    xhr.onerror=()=>{setUploading(false);addLog("Upload error","error");showToast("Tidak dapat konek","error");};
    const fd=new FormData();fd.append("file",file);xhr.send(fd);
  };

  const handleTrigger = async()=>{
    if(!firmwareInfo?.url){showToast("URL firmware tidak valid","error");return;}
    const targets=selectedForTrigger.length>0?selectedForTrigger:null;
    const label=targets?`${targets.length} device terpilih`:`semua (${devices.length})`;
    setTriggering(true);addLog(`Mengirim OTA ke ${label}...`,"info");
    try{
      const r=await fetch(`${API}/firmware/trigger`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({device_ids:targets})});
      const d=await r.json();
      if(r.ok){
        addLog(`OTA dikirim ke ${d.sent?.length||0} device`,"success");
        d.sent?.forEach(s=>addLog(`  → ${s.device_id} (${s.topic})`,"success"));
        d.failed?.forEach(f=>addLog(`  ✗ ${f.device_id}: ${f.error}`,"error"));
        showToast(`OTA dikirim ke ${d.sent?.length||0} device 🚀`);
      }else{addLog(`Gagal: ${d.detail}`,"error");showToast(d.detail||"Trigger gagal","error");}
    }catch(e){addLog(`Error: ${e.message}`,"error");showToast("Tidak dapat konek","error");}
    setTriggering(false);
  };

  const exportLogs=()=>{
    const c=logs.map(e=>`[${e.ts}] [${e.type.toUpperCase()}] ${e.msg}`).join("\n");
    const u=URL.createObjectURL(new Blob([c],{type:"text/plain"}));
    const a=document.createElement("a");a.href=u;a.download=`ota-log-${Date.now()}.txt`;a.click();URL.revokeObjectURL(u);
    showToast("Log diekspor");
  };

  const filteredLogs   = logFilter==="all"?logs:logs.filter(e=>e.type===logFilter);
  const onlineCount    = devices.filter(d=>getAge(d.received_at)<OFFLINE_SEC).length;
  const selectedDev    = devices.find(d=>d.device_id===selectedDevice);
  const triggerTargets = selectedForTrigger.length>0?selectedForTrigger:devices.map(d=>d.device_id);

  return (
    <>
      <style>{getThemeCSS(theme)}</style>

      {/* Header */}
      <div style={{maxWidth:"100%",marginBottom:"1rem",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 0.25rem"}}>
        <div style={{display:"flex",alignItems:"center",gap:"0.9rem"}}>
          <div style={{width:38,height:38,flexShrink:0,background:"linear-gradient(135deg, var(--accent), var(--accent2))",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem"}}>⚡</div>
          <div>
            <h1 style={{fontSize:"1.25rem",fontWeight:800,letterSpacing:"-0.02em",color:"var(--text)"}}>ESP32 <span style={{color:"var(--accent)"}}>OTA</span> Dashboard</h1>
            <p style={{fontFamily:"var(--mono)",fontSize:"0.65rem",color:"var(--muted)",marginTop:1}}>firmware management · mqtt trigger · multi-device</p>
          </div>
        </div>
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
          <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:7,padding:"0.35rem 0.7rem",fontFamily:"var(--mono)",fontSize:"0.68rem"}}>
            <span style={{color:"var(--muted)"}}>online </span><span style={{color:"var(--success)",fontWeight:700}}>{onlineCount}/{devices.length}</span>
          </div>
          <div style={{background:firmwareInfo?"rgba(0,212,255,0.1)":"rgba(100,116,139,0.1)",border:`1px solid ${firmwareInfo?"rgba(0,212,255,0.2)":"rgba(100,116,139,0.2)"}`,borderRadius:7,padding:"0.35rem 0.7rem",fontFamily:"var(--mono)",fontSize:"0.68rem"}}>
            <span style={{color:"var(--muted)"}}>fw </span><span style={{color:firmwareInfo?"var(--accent)":"var(--muted)",fontWeight:700}}>{firmwareInfo?firmwareInfo.filename:"–"}</span>
          </div>
          <ThemeSwitcher current={themeKey} onChange={changeTheme} />
        </div>
      </div>

      <StatusBar status={apiStatus} />

      {/* Grid layout — 4 kolom */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:"0.85rem"}}>

        {/* 01 Upload */}
        <Card>
          <CardLabel>01 Upload Firmware</CardLabel>
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            onDrop={e=>{e.preventDefault();setDragOver(false);handleFileChange(e.dataTransfer.files[0]);}}
            onClick={()=>fileInputRef.current?.click()}
            style={{border:`2px dashed ${dragOver?"var(--accent)":"var(--border)"}`,borderRadius:9,padding:"1.5rem 0.5rem",textAlign:"center",cursor:"pointer",transition:"all 0.2s",background:dragOver?"rgba(0,212,255,0.04)":"transparent"}}>
            <input ref={fileInputRef} type="file" accept=".bin" style={{display:"none"}} onChange={e=>handleFileChange(e.target.files[0])} />
            <span style={{fontSize:"1.6rem",display:"block",marginBottom:"0.5rem"}}>📦</span>
            <h3 style={{fontSize:"0.82rem",fontWeight:600,marginBottom:"0.25rem",color:"var(--text)"}}>Drop file .bin</h3>
            <p style={{fontFamily:"var(--mono)",fontSize:"0.65rem",color:"var(--muted)"}}>atau klik pilih file</p>
          </div>
          {file&&<div style={{marginTop:"0.75rem",fontFamily:"var(--mono)",fontSize:"0.7rem",color:"var(--accent)",background:"rgba(0,212,255,0.08)",padding:"0.35rem 0.7rem",borderRadius:5,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:150}}>📄 {file.name}</span>
            <button onClick={()=>setFile(null)} style={{background:"none",border:"none",color:"var(--muted)",cursor:"pointer",flexShrink:0}}>✕</button>
          </div>}
          {uploading&&<div style={{marginTop:"0.6rem"}}>
            <div style={{height:3,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${progress}%`,background:"linear-gradient(90deg, var(--accent), var(--accent2))",transition:"width 0.3s",borderRadius:2}} />
            </div>
            <div style={{fontFamily:"var(--mono)",fontSize:"0.65rem",color:"var(--muted)",marginTop:"0.3rem"}}>{progressLabel}</div>
          </div>}
          <Btn onClick={handleUpload} disabled={!file||uploading} variant="primary"><Spinner visible={uploading} /> Upload</Btn>
        </Card>

        {/* 02 Trigger */}
        <Card>
          <CardLabel>02 Trigger OTA</CardLabel>
          <div style={{marginBottom:"0.75rem",padding:"0.55rem 0.7rem",borderRadius:7,background:"var(--card-bg)",border:"1px solid var(--border)"}}>
            <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--muted)",marginBottom:"0.35rem",textTransform:"uppercase",letterSpacing:"0.08em"}}>Target</div>
            {selectedForTrigger.length===0
              ? <div style={{fontFamily:"var(--mono)",fontSize:"0.68rem",color:"var(--warning)"}}>⚡ Semua ({devices.length})</div>
              : <div style={{display:"flex",flexWrap:"wrap",gap:"0.25rem"}}>
                  {selectedForTrigger.map(id=><span key={id} style={{background:"rgba(124,58,237,0.15)",color:"var(--accent2)",borderRadius:20,padding:"0.12rem 0.5rem",fontFamily:"var(--mono)",fontSize:"0.58rem",border:"1px solid rgba(124,58,237,0.3)"}}>{id}</span>)}
                </div>
            }
          </div>
          {firmwareInfo
            ?<div style={{marginBottom:"0.5rem"}}>
              <InfoRow label="firmware" value={firmwareInfo.filename} accent />
              <InfoRow label="size"     value={formatBytes(firmwareInfo.size_bytes)} />
              <InfoRow label="topic"    value={selectedForTrigger.length===1?`esp32/ota/${selectedForTrigger[0]}`:"esp32/ota/{id}"} accent />
            </div>
            :<div style={{padding:"0.45rem 0.65rem",borderRadius:5,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",fontFamily:"var(--mono)",fontSize:"0.65rem",color:"var(--danger)",marginBottom:"0.5rem"}}>✗ {firmwareError||"Upload firmware dulu"}</div>
          }
          <Btn onClick={()=>setConfirmTrigger(true)} disabled={!firmwareInfo||triggering||devices.length===0} variant="trigger">
            <Spinner visible={triggering} />
            🚀 {selectedForTrigger.length===0?`Trigger Semua (${devices.length})`:`Trigger ${selectedForTrigger.length}`}
          </Btn>
        </Card>

        {/* 03 Firmware Info */}
        <Card>
          <CardLabel>03 Firmware Info</CardLabel>
          {firmwareInfo
            ?<div>
              <InfoRow label="filename" value={firmwareInfo.filename} accent />
              <InfoRow label="size"     value={formatBytes(firmwareInfo.size_bytes)} />
              <InfoRow label="uploaded" value={new Date(firmwareInfo.uploaded_at).toLocaleString("id-ID")} />
              <InfoRow label="url"      value={firmwareInfo.url} accent />
            </div>
            :<div style={{padding:"2rem 0",textAlign:"center",color:"var(--muted)",fontFamily:"var(--mono)",fontSize:"0.72rem"}}>{firmwareError||"Belum ada firmware"}</div>
          }
          <Btn onClick={loadFirmwareInfo} variant="primary">🔄 Refresh</Btn>
        </Card>

        {/* 04 Activity Log */}
        <Card>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.9rem"}}>
            <CardLabel>04 Activity Log</CardLabel>
            <div style={{display:"flex",gap:"0.3rem",marginTop:"-0.9rem"}}>
              <select value={logFilter} onChange={e=>setLogFilter(e.target.value)} style={{background:"var(--bg)",border:"1px solid var(--border)",color:"var(--muted)",borderRadius:5,fontFamily:"var(--mono)",fontSize:"0.58rem",padding:"0.2rem 0.35rem",cursor:"pointer"}}>
                {["all","info","success","warn","error"].map(f=><option key={f} value={f}>{f}</option>)}
              </select>
              <button onClick={exportLogs} style={{background:"rgba(0,212,255,0.1)",border:"1px solid rgba(0,212,255,0.2)",borderRadius:5,color:"var(--accent)",fontFamily:"var(--mono)",fontSize:"0.58rem",padding:"0.2rem 0.4rem",cursor:"pointer"}}>↓</button>
              <button onClick={()=>setLogs([{ts:ts(),msg:"Log dibersihkan.",type:"info"}])} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:5,color:"var(--danger)",fontFamily:"var(--mono)",fontSize:"0.58rem",padding:"0.2rem 0.4rem",cursor:"pointer"}}>✕</button>
            </div>
          </div>
          <div ref={logBoxRef} style={{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:7,padding:"0.75rem",height:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:2}}>
            {filteredLogs.length===0
              ?<span style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:"0.68rem"}}>Tidak ada log.</span>
              :filteredLogs.map((e,i)=><LogEntry key={i} entry={e} />)}
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--muted)",marginTop:"0.3rem",textAlign:"right"}}>{filteredLogs.length} entri</div>
        </Card>

        {/* 05 Device Status — full width */}
        <Card style={{gridColumn:"1 / -1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1rem"}}>
            <div style={{display:"flex",alignItems:"center",gap:"0.65rem"}}>
              <CardLabel>05 Device Status</CardLabel>
              {devices.length>0&&<span style={{background:"rgba(0,212,255,0.12)",color:"var(--accent)",borderRadius:20,padding:"0.1rem 0.55rem",fontFamily:"var(--mono)",fontSize:"0.58rem",marginTop:"-0.9rem"}}>{onlineCount} online / {devices.length} total</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
              {devices.length>0&&<>
                <button onClick={selectAll} style={{background:"rgba(124,58,237,0.1)",border:"1px solid rgba(124,58,237,0.2)",borderRadius:6,color:"var(--accent2)",fontFamily:"var(--mono)",fontSize:"0.58rem",padding:"0.22rem 0.55rem",cursor:"pointer"}}>☑ Semua</button>
                <button onClick={clearSelection} style={{background:"rgba(100,116,139,0.1)",border:"1px solid var(--border)",borderRadius:6,color:"var(--muted)",fontFamily:"var(--mono)",fontSize:"0.58rem",padding:"0.22rem 0.55rem",cursor:"pointer"}}>☐ Clear</button>
              </>}
              <span style={{fontFamily:"var(--mono)",fontSize:"0.6rem",color:"var(--muted)"}}>{lastUpdated?`Updated ${lastUpdated.toLocaleTimeString("id-ID")}`:"--"}</span>
              <Btn onClick={fetchDevices} disabled={loadingStatus} variant="primary" style={{width:"auto",marginTop:0,padding:"0.28rem 0.7rem",fontSize:"0.68rem"}}><Spinner visible={loadingStatus} /> ↻</Btn>
            </div>
          </div>

          {devices.length===0
            ?<div style={{fontFamily:"var(--mono)",fontSize:"0.72rem",color:"var(--muted)",textAlign:"center",padding:"2.5rem 0"}}>Belum ada device terhubung.<br/>Tunggu ESP32 mengirim telemetry...</div>
            :<div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:"1rem"}}>
              <div>
                <div style={{fontFamily:"var(--mono)",fontSize:"0.58rem",color:"var(--muted)",marginBottom:"0.5rem"}}>
                  {selectedForTrigger.length>0?`${selectedForTrigger.length} dipilih untuk trigger`:"Centang = trigger · Klik = detail"}
                </div>
                <DeviceList devices={devices} selectedId={selectedDevice} onSelect={setSelectedDevice} onDelete={deleteDevice} selectedForTrigger={selectedForTrigger} onToggle={toggleTrigger} />
              </div>
              <div>
                {selectedDev
                  ?<DeviceDetail device={selectedDev} />
                  :<div style={{fontFamily:"var(--mono)",fontSize:"0.72rem",color:"var(--muted)",textAlign:"center",padding:"3rem 0"}}>← Klik device untuk detail</div>
                }
              </div>
            </div>
          }
        </Card>

      </div>

      <ConfirmModal visible={confirmTrigger} title="Kirim OTA?"
        message={`Firmware "${firmwareInfo?.filename}" akan dikirim ke ${triggerTargets.length} device:\n${triggerTargets.slice(0,5).join(", ")}${triggerTargets.length>5?`\n...dan ${triggerTargets.length-5} lainnya`:""}`}
        confirmLabel={`🚀 Kirim ke ${triggerTargets.length} device`} variant="trigger"
        onConfirm={()=>{setConfirmTrigger(false);handleTrigger();}} onCancel={()=>setConfirmTrigger(false)} />

      <ConfirmModal visible={confirmOverwrite} title="Timpa firmware?"
        message={`"${firmwareInfo?.filename}" (${formatBytes(firmwareInfo?.size_bytes)}) akan ditimpa oleh "${pendingFile?.name}".`}
        confirmLabel="✓ Timpa" variant="danger"
        onConfirm={confirmOverwriteFn} onCancel={()=>{setConfirmOverwrite(false);setPendingFile(null);}} />

      <Toast toast={toast} />
    </>
  );
}