import { useState, useEffect, useRef, useCallback } from "react";

const API = "http://192.168.12.214:8000/ota";

// ─── Utils ────────────────────────────────────────────────
function ts() {
    return new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
}

function formatBytes(b) {
    if (b < 1024) return b + " B";
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB";
    return (b / 1024 / 1024).toFixed(2) + " MB";
}

// ─── Telemetry Helpers ────────────────────────────────────
const getBatteryPct = v => Math.min(100, Math.max(0, ((v - 3.0) / 1.2) * 100)).toFixed(0);
const getBatteryColor = v => v >= 3.7 ? "var(--success)" : v >= 3.4 ? "var(--warning)" : "var(--danger)";
const getTempColor = t => t < 50 ? "var(--success)" : t < 70 ? "var(--warning)" : "var(--danger)";
const getRSSIBars = rssi => rssi >= -50 ? 4 : rssi >= -60 ? 3 : rssi >= -70 ? 2 : rssi >= -80 ? 1 : 0;
const getRSSIColor = rssi => rssi >= -50 ? "var(--success)" : rssi >= -60 ? "var(--accent)" : rssi >= -70 ? "var(--warning)" : "var(--danger)";
const getRSSILabel = rssi => rssi >= -50 ? "Excellent" : rssi >= -60 ? "Good" : rssi >= -70 ? "Fair" : rssi >= -80 ? "Weak" : "Very Weak";

// ─── Global CSS ───────────────────────────────────────────
const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&family=Syne:wght@400;600;800&display=swap');
  :root {
    --bg: #0a0e17; --surface: #111827; --border: #1f2d45;
    --accent: #00d4ff; --accent2: #7c3aed;
    --success: #10b981; --warning: #f59e0b; --danger: #ef4444;
    --text: #e2e8f0; --muted: #64748b;
    --mono: 'JetBrains Mono', monospace;
    --sans: 'Syne', sans-serif;
  }
  body {
    background: var(--bg); color: var(--text); font-family: var(--sans);
    min-height: 100vh; padding: 2rem 1rem;
    background-image:
      radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,212,255,0.08) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 80% 80%, rgba(124,58,237,0.06) 0%, transparent 50%);
  }
  @keyframes pulse    { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes toast-in { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
`;

// ─── Subcomponents ────────────────────────────────────────

function Spinner({ visible }) {
    if (!visible) return null;
    return (
        <span style={{
            display: "inline-block", width: 14, height: 14,
            border: "2px solid rgba(0,212,255,0.2)", borderTopColor: "var(--accent)",
            borderRadius: "50%", animation: "spin 0.7s linear infinite",
        }} />
    );
}

function StatusBar({ status }) {
    const dotStyle = {
        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
        background: status === "online" ? "var(--success)" : status === "error" ? "var(--danger)" : "var(--muted)",
        boxShadow: status === "online" ? "0 0 8px var(--success)" : "none",
        animation: status === "online" ? "pulse 2s infinite" : "none",
        transition: "background 0.3s",
    };
    const textColor = status === "online" ? "var(--success)" : status === "error" ? "var(--danger)" : "var(--muted)";
    const textMap = {
        online: `API online · ${API}`,
        error: `API tidak dapat dijangkau · ${API}`,
        checking: "Memeriksa koneksi API...",
    };
    return (
        <div style={{
            maxWidth: 820, margin: "0 auto 1.5rem",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, padding: "0.8rem 1.2rem",
            display: "flex", alignItems: "center", gap: "0.6rem",
            fontFamily: "var(--mono)", fontSize: "0.75rem",
        }}>
            <div style={dotStyle} />
            <span style={{ color: textColor }}>{textMap[status] || textMap.checking}</span>
        </div>
    );
}

function Card({ children, wide }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                background: "var(--surface)",
                border: `1px solid ${hovered ? "rgba(0,212,255,0.3)" : "var(--border)"}`,
                borderRadius: 14, padding: "1.5rem",
                position: "relative", overflow: "hidden",
                gridColumn: wide ? "1 / -1" : undefined,
                transition: "border-color 0.2s",
            }}
        >
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 2,
                background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                opacity: hovered ? 1 : 0, transition: "opacity 0.3s",
            }} />
            {children}
        </div>
    );
}

function CardLabel({ children }) {
    return (
        <div style={{
            fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--accent)",
            letterSpacing: "0.12em", textTransform: "uppercase",
            marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.4rem",
        }}>
            <span style={{ display: "inline-block", width: 16, height: 1, background: "var(--accent)" }} />
            {children}
        </div>
    );
}

function Btn({ children, onClick, disabled, variant = "primary", style: extraStyle }) {
    const base = {
        width: "100%", padding: "0.8rem 1.2rem", border: "none",
        borderRadius: 8, fontFamily: "var(--sans)", fontSize: "0.875rem",
        fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: "0.5rem", marginTop: "0.75rem",
        transition: "all 0.2s", opacity: disabled ? 0.4 : 1,
        ...extraStyle,
    };
    const variants = {
        primary: { background: "linear-gradient(135deg, var(--accent), #0099bb)", color: "#000" },
        trigger: { background: "linear-gradient(135deg, var(--accent2), #5b21b6)", color: "#fff" },
    };
    return (
        <button onClick={disabled ? undefined : onClick} disabled={disabled} style={{ ...base, ...variants[variant] }}>
            {children}
        </button>
    );
}

function InfoRow({ label, value, accent }) {
    return (
        <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "0.55rem 0", borderBottom: "1px solid var(--border)",
        }}>
            <span style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "0.72rem" }}>{label}</span>
            <span style={{
                fontFamily: "var(--mono)", fontSize: "0.72rem",
                color: accent ? "var(--accent)" : "var(--text)",
                maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>{value}</span>
        </div>
    );
}

function LogEntry({ entry }) {
    const colors = { success: "var(--success)", error: "var(--danger)", info: "var(--accent)", warn: "var(--warning)" };
    return (
        <div style={{ display: "flex", gap: "0.75rem" }}>
            <span style={{ color: "var(--muted)", flexShrink: 0, fontFamily: "var(--mono)", fontSize: "0.72rem" }}>{entry.ts}</span>
            <span style={{ color: colors[entry.type] || "var(--accent)", fontFamily: "var(--mono)", fontSize: "0.72rem" }}>{entry.msg}</span>
        </div>
    );
}

function Toast({ toast }) {
    if (!toast) return null;
    return (
        <div style={{
            position: "fixed", bottom: "1.5rem", right: "1.5rem",
            background: "var(--surface)",
            border: `1px solid ${toast.type === "success" ? "var(--success)" : "var(--danger)"}`,
            borderRadius: 10, padding: "0.75rem 1.2rem",
            fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.6rem",
            zIndex: 100, maxWidth: 320,
            animation: "toast-in 0.3s ease forwards",
        }}>
            <span>{toast.type === "success" ? "✅" : "❌"}</span>
            <span>{toast.msg}</span>
        </div>
    );
}

// ─── Metric Block (reusable) ──────────────────────────────
function MetricBlock({ icon, label, value, valueColor, sub, barPct, barColor }) {
    return (
        <div style={{ background: "#0d1520", border: "1px solid var(--border)", borderRadius: 10, padding: "0.9rem 1rem" }}>
            <div style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>{icon}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>{label}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: "1.3rem", fontWeight: 700, color: valueColor }}>{value}</div>
            {sub && <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)", marginTop: "0.2rem" }}>{sub}</div>}
            {barPct !== undefined && (
                <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginTop: "0.5rem" }}>
                    <div style={{ height: "100%", width: `${barPct}%`, background: barColor, borderRadius: 2, transition: "width 1s" }} />
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────
export default function ESP32OTADashboard() {
    const [apiStatus, setApiStatus] = useState("checking");
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressLabel, setProgressLabel] = useState("Uploading...");
    const [firmwareInfo, setFirmwareInfo] = useState(null);
    const [logs, setLogs] = useState([{ ts: "--:--:--", msg: "Dashboard siap.", type: "info" }]);
    const [toast, setToast] = useState(null);
    const [triggering, setTriggering] = useState(false);
    const [deviceStatus, setDeviceStatus] = useState(null);
    const [loadingStatus, setLoadingStatus] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const logBoxRef = useRef(null);
    const fileInputRef = useRef(null);

    // ── Helpers ──
    const addLog = useCallback((msg, type = "info") => {
        setLogs(prev => [...prev, { ts: ts(), msg, type }]);
    }, []);

    const showToast = useCallback((msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // Auto-scroll log
    useEffect(() => {
        if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }, [logs]);

    // ── API Check ──
    const checkApiStatus = useCallback(async () => {
        try {
            const r = await fetch(`${API}/`, { signal: AbortSignal.timeout(3000) });
            if (r.ok) { setApiStatus("online"); addLog("Koneksi API berhasil", "success"); }
            else throw new Error();
        } catch {
            setApiStatus("error");
            addLog("Gagal konek ke API — pastikan FastAPI sudah berjalan", "error");
        }
    }, [addLog]);

    // ── Firmware Info ──
    const loadFirmwareInfo = useCallback(async () => {
        try {
            const r = await fetch(`${API}/firmware/info`);
            if (!r.ok) return;
            const d = await r.json();
            setFirmwareInfo(d);
            addLog(`Firmware info dimuat: ${d.filename} (${formatBytes(d.size_bytes)})`, "success");
        } catch {
            addLog("Gagal memuat firmware info", "warn");
        }
    }, [addLog]);

    // ── Device Status (fetch telemetry) ──
    const fetchDeviceStatus = useCallback(async () => {
        setLoadingStatus(true);
        try {
            const r = await fetch(`${API}/device/status`);
            if (!r.ok) throw new Error();
            const d = await r.json();
            setDeviceStatus(d);
            setLastUpdated(new Date());
            addLog("Device status diterima", "success");
        } catch {
            addLog("Gagal mengambil device status", "warn");
        }
        setLoadingStatus(false);
    }, [addLog]);

    // ── Initial Load ──
    useEffect(() => {
        checkApiStatus();
        loadFirmwareInfo();
        fetchDeviceStatus();
    }, [checkApiStatus, loadFirmwareInfo, fetchDeviceStatus]);

    // ── Auto Polling setiap 10 detik ──
    useEffect(() => {
        const id = setInterval(fetchDeviceStatus, 10000);
        return () => clearInterval(id);
    }, [fetchDeviceStatus]);

    // ── File Select ──
    const handleFileChange = (f) => {
        if (f && f.name.endsWith(".bin")) {
            setFile(f);
            addLog(`File dipilih: ${f.name}`, "info");
        } else if (f) {
            showToast("Hanya file .bin yang diperbolehkan", "error");
        }
    };

    // ── Upload ──
    const handleUpload = () => {
        if (!file) return;
        setUploading(true);
        setProgress(0);
        setProgressLabel("Uploading...");
        addLog(`Mengupload ${file.name}...`, "info");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}/firmware/upload`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                setProgress(pct);
                setProgressLabel(`Uploading... ${pct}%`);
            }
        };

        xhr.onload = async () => {
            setUploading(false);
            if (xhr.status === 200) {
                setProgress(100);
                setProgressLabel("Upload selesai ✓");
                addLog(`Upload berhasil: ${file.name}`, "success");
                showToast("Firmware berhasil diupload!");
                await loadFirmwareInfo();
            } else {
                setProgressLabel("Upload gagal");
                addLog(`Upload gagal: ${xhr.responseText}`, "error");
                showToast("Upload gagal", "error");
            }
        };

        xhr.onerror = () => {
            setUploading(false);
            addLog("Upload error — tidak dapat konek ke API", "error");
            showToast("Tidak dapat konek ke API", "error");
        };

        const fd = new FormData();
        fd.append("file", file);
        xhr.send(fd);
    };

    // ── Trigger OTA ──
    const handleTrigger = async () => {
        setTriggering(true);
        addLog("Mengirim perintah OTA via MQTT...", "info");
        try {
            const r = await fetch(`${API}/firmware/trigger`, { method: "POST" });
            const d = await r.json();
            if (r.ok) {
                addLog(`OTA trigger dikirim → topic: ${d.topic}`, "success");
                addLog(`Payload: ${d.payload}`, "info");
                showToast("OTA trigger berhasil dikirim! 🚀");
            } else {
                addLog(`Gagal trigger: ${d.detail}`, "error");
                showToast(d.detail || "Trigger gagal", "error");
            }
        } catch {
            addLog("Gagal konek ke API saat trigger", "error");
            showToast("Tidak dapat konek ke API", "error");
        }
        setTriggering(false);
    };

    // ─── Render ───────────────────────────────────────────
    return (
        <>
            <style>{globalCSS}</style>

            {/* Header */}
            <header style={{ maxWidth: 820, margin: "0 auto 2.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                <div style={{
                    width: 42, height: 42, flexShrink: 0,
                    background: "linear-gradient(135deg, var(--accent), var(--accent2))",
                    borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "1.1rem",
                }}>⚡</div>
                <div>
                    <h1 style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                        ESP32 <span style={{ color: "var(--accent)" }}>OTA</span> Dashboard
                    </h1>
                    <p style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--muted)", marginTop: 2 }}>
                        firmware management · mqtt trigger · over-the-air update
                    </p>
                </div>
            </header>

            <StatusBar status={apiStatus} />

            {/* Grid */}
            <div style={{
                maxWidth: 820, margin: "0 auto",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem",
            }}>

                {/* ── 01 Upload Card ── */}
                <Card>
                    <CardLabel>01 Upload Firmware</CardLabel>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileChange(e.dataTransfer.files[0]); }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{
                            border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
                            borderRadius: 10, padding: "2.5rem 1rem", textAlign: "center",
                            cursor: "pointer", transition: "all 0.25s",
                            background: dragOver ? "rgba(0,212,255,0.04)" : "transparent",
                        }}
                    >
                        <input ref={fileInputRef} type="file" accept=".bin" style={{ display: "none" }}
                            onChange={(e) => handleFileChange(e.target.files[0])} />
                        <span style={{ fontSize: "2rem", display: "block", marginBottom: "0.75rem" }}>📦</span>
                        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.3rem" }}>Drop file .bin di sini</h3>
                        <p style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--muted)" }}>atau klik untuk pilih file</p>
                    </div>

                    {file && (
                        <div style={{
                            marginTop: "1rem", fontFamily: "var(--mono)", fontSize: "0.75rem",
                            color: "var(--accent)", background: "rgba(0,212,255,0.08)",
                            padding: "0.4rem 0.8rem", borderRadius: 6,
                        }}>
                            📄 {file.name} ({formatBytes(file.size)})
                        </div>
                    )}

                    {uploading && (
                        <div style={{ marginTop: "0.75rem" }}>
                            <div style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", width: `${progress}%`,
                                    background: "linear-gradient(90deg, var(--accent), var(--accent2))",
                                    transition: "width 0.3s", borderRadius: 2,
                                }} />
                            </div>
                            <div style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--muted)", marginTop: "0.4rem" }}>
                                {progressLabel}
                            </div>
                        </div>
                    )}

                    <Btn onClick={handleUpload} disabled={!file || uploading} variant="primary">
                        <Spinner visible={uploading} /> Upload Firmware
                    </Btn>
                </Card>

                {/* ── 02 Trigger Card ── */}
                <Card>
                    <CardLabel>02 Trigger OTA</CardLabel>
                    <div style={{ fontSize: "0.85rem", color: "var(--muted)", lineHeight: 1.6, marginBottom: "1.2rem" }}>
                        Kirim perintah OTA ke semua device ESP32 yang terhubung ke broker MQTT dan subscribe ke topic{" "}
                        <code style={{ color: "var(--accent)", fontFamily: "var(--mono)", fontSize: "0.78rem" }}>esp32/ota</code>.
                    </div>
                    {firmwareInfo && (
                        <div><InfoRow label="payload" value={firmwareInfo.url} accent /></div>
                    )}
                    <Btn onClick={handleTrigger} disabled={!firmwareInfo || triggering} variant="trigger">
                        <Spinner visible={triggering} /> 🚀 Kirim OTA via MQTT
                    </Btn>
                </Card>

                {/* ── 03 Firmware Info Card ── */}
                <Card>
                    <CardLabel>03 Firmware Info</CardLabel>
                    {firmwareInfo ? (
                        <div>
                            <InfoRow label="filename" value={firmwareInfo.filename} accent />
                            <InfoRow label="size" value={formatBytes(firmwareInfo.size_bytes)} />
                            <InfoRow label="uploaded" value={new Date(firmwareInfo.uploaded_at).toLocaleString("id-ID")} />
                            <InfoRow label="url" value={firmwareInfo.url} accent />
                        </div>
                    ) : (
                        <div style={{ color: "var(--muted)", fontFamily: "var(--mono)", fontSize: "0.75rem" }}>
                            Belum ada firmware
                        </div>
                    )}
                    <Btn onClick={loadFirmwareInfo} variant="primary">🔄 Refresh Info</Btn>
                </Card>

                {/* ── 04 Activity Log Card ── */}
                <Card>
                    <CardLabel>04 Activity Log</CardLabel>
                    <div ref={logBoxRef} style={{
                        background: "#070b12", border: "1px solid var(--border)",
                        borderRadius: 8, padding: "1rem", height: 160,
                        overflowY: "auto", display: "flex", flexDirection: "column", gap: 2,
                    }}>
                        {logs.map((entry, i) => <LogEntry key={i} entry={entry} />)}
                    </div>
                </Card>

                {/* ── 05 Device Status Card ── */}
                <Card wide>
                    <CardLabel>05 Device Status</CardLabel>

                    {/* Header baris: timestamp + tombol refresh */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                        <span style={{ fontFamily: "var(--mono)", fontSize: "0.63rem", color: "var(--muted)" }}>
                            {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString("id-ID")}` : "Belum ada data"}
                        </span>
                        <Btn
                            onClick={fetchDeviceStatus}
                            disabled={loadingStatus}
                            variant="primary"
                            style={{ width: "auto", marginTop: 0, padding: "0.3rem 0.8rem", fontSize: "0.7rem" }}
                        >
                            <Spinner visible={loadingStatus} /> ↻ Refresh
                        </Btn>
                    </div>

                    {/* State: belum ada data */}
                    {!deviceStatus ? (
                        <div style={{
                            fontFamily: "var(--mono)", fontSize: "0.72rem", color: "var(--muted)",
                            textAlign: "center", padding: "2rem 0",
                        }}>
                            Belum ada data dari device.<br />Tunggu ESP32 mengirim telemetry setelah OTA selesai...
                        </div>
                    ) : (
                        <>
                            {/* 4 metric cards */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>

                                {/* Battery */}
                                <MetricBlock
                                    icon="🔋"
                                    label="Battery"
                                    value={`${deviceStatus.battery.toFixed(2)} V`}
                                    valueColor={getBatteryColor(deviceStatus.battery)}
                                    sub={`${getBatteryPct(deviceStatus.battery)}% — LiPo estimated`}
                                    barPct={getBatteryPct(deviceStatus.battery)}
                                    barColor={getBatteryColor(deviceStatus.battery)}
                                />

                                {/* Temperature */}
                                <MetricBlock
                                    icon="🌡️"
                                    label="Temperature"
                                    value={`${deviceStatus.temperature.toFixed(1)} °C`}
                                    valueColor={getTempColor(deviceStatus.temperature)}
                                    sub={deviceStatus.temperature < 50 ? "Normal" : deviceStatus.temperature < 70 ? "Warm" : "🔥 Hot!"}
                                    barPct={Math.min(100, (deviceStatus.temperature / 100) * 100).toFixed(0)}
                                    barColor={getTempColor(deviceStatus.temperature)}
                                />

                                {/* WiFi RSSI */}
                                <div style={{ background: "#0d1520", border: "1px solid var(--border)", borderRadius: 10, padding: "0.9rem 1rem" }}>
                                    <div style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>📶</div>
                                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>WiFi RSSI</div>
                                    <div style={{ fontFamily: "var(--mono)", fontSize: "1.3rem", fontWeight: 700, color: getRSSIColor(deviceStatus.rssi) }}>
                                        {deviceStatus.rssi} dBm
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem" }}>
                                        <div style={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
                                            {[6, 10, 14, 18].map((h, i) => (
                                                <div key={i} style={{
                                                    width: 5, height: h, borderRadius: 1,
                                                    background: i < getRSSIBars(deviceStatus.rssi) ? getRSSIColor(deviceStatus.rssi) : "var(--border)",
                                                    transition: "background 0.4s",
                                                }} />
                                            ))}
                                        </div>
                                        <span style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)" }}>
                                            {getRSSILabel(deviceStatus.rssi)}
                                        </span>
                                    </div>
                                </div>

                                {/* Save to OTA */}
                                <div style={{ background: "#0d1520", border: "1px solid var(--border)", borderRadius: 10, padding: "0.9rem 1rem" }}>
                                    <div style={{ fontSize: "1.1rem", marginBottom: "0.35rem" }}>💾</div>
                                    <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.2rem" }}>Save to OTA</div>
                                    <div style={{ fontFamily: "var(--mono)", fontSize: "1.1rem", fontWeight: 700, color: deviceStatus.save_to_ota ? "var(--success)" : "var(--danger)" }}>
                                        {deviceStatus.save_to_ota ? "Saved ✓" : "Not Saved"}
                                    </div>
                                    <div style={{
                                        display: "inline-flex", alignItems: "center", gap: "0.4rem",
                                        padding: "0.3rem 0.7rem", borderRadius: 20, marginTop: "0.5rem",
                                        background: deviceStatus.save_to_ota ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                                        color: deviceStatus.save_to_ota ? "var(--success)" : "var(--danger)",
                                        fontFamily: "var(--mono)", fontSize: "0.68rem",
                                    }}>
                                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: deviceStatus.save_to_ota ? "var(--success)" : "var(--danger)" }} />
                                        {deviceStatus.save_to_ota ? "Firmware tersimpan di flash" : "Firmware belum tersimpan"}
                                    </div>
                                </div>

                            </div>

                            {/* Raw payload */}
                            <div style={{ background: "#070b12", border: "1px solid var(--border)", borderRadius: 8, padding: "0.75rem 1rem" }}>
                                <div style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--muted)", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                                    RAW PAYLOAD
                                </div>
                                <div style={{ fontFamily: "var(--mono)", fontSize: "0.7rem", color: "var(--accent)", wordBreak: "break-all" }}>
                                    {JSON.stringify(deviceStatus)}
                                </div>
                            </div>
                        </>
                    )}
                </Card>

            </div>

            <Toast toast={toast} />
        </>
    );
}
