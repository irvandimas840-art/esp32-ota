"""
ESP32 OTA Backend — FastAPI
Jalankan: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import paho.mqtt.publish as publish
import os, shutil, json
from datetime import datetime

app = FastAPI()

# ── CORS (izinkan semua origin untuk development) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Konfigurasi ──
FIRMWARE_DIR  = "firmware"
FIRMWARE_FILE = os.path.join(FIRMWARE_DIR, "firmware.bin")
META_FILE     = os.path.join(FIRMWARE_DIR, "meta.json")
SERVER_IP     = "172.28.135.37"   # ganti dengan IP server kamu
SERVER_PORT   = 8000
MQTT_BROKER   = "localhost"       # ganti dengan IP broker MQTT kamu
MQTT_TOPIC    = "esp32/ota"

os.makedirs(FIRMWARE_DIR, exist_ok=True)

# ── Serve file firmware via HTTP ──
app.mount("/firmware/files", StaticFiles(directory=FIRMWARE_DIR), name="firmware_files")

# ── In-memory device status (diupdate oleh ESP32) ──
device_status_store = {}


# ══════════════════════════════════════════════
#  Models
# ══════════════════════════════════════════════

class DeviceStatus(BaseModel):
    battery:     float
    temperature: float
    rssi:        int
    save_to_ota: bool


# ══════════════════════════════════════════════
#  Endpoints
# ══════════════════════════════════════════════

@app.get("/")
def root():
    return {"status": "ok", "message": "ESP32 OTA API running"}


# ── Upload firmware ──
@app.post("/firmware/upload")
async def upload_firmware(file: UploadFile = File(...)):
    if not file.filename.endswith(".bin"):
        raise HTTPException(status_code=400, detail="Hanya file .bin yang diperbolehkan")

    with open(FIRMWARE_FILE, "wb") as f:
        shutil.copyfileobj(file.file, f)

    size = os.path.getsize(FIRMWARE_FILE)
    meta = {
        "filename":    file.filename,
        "size_bytes":  size,
        "uploaded_at": datetime.utcnow().isoformat(),
        "url":         f"http://{SERVER_IP}:{SERVER_PORT}/firmware/files/firmware.bin",
    }
    with open(META_FILE, "w") as f:
        json.dump(meta, f)

    return {"message": "Upload berhasil", **meta}


# ── Info firmware ──
@app.get("/firmware/info")
def firmware_info():
    if not os.path.exists(META_FILE):
        raise HTTPException(status_code=404, detail="Belum ada firmware yang diupload")
    with open(META_FILE) as f:
        return json.load(f)


# ── Trigger OTA via MQTT ──
@app.post("/firmware/trigger")
def trigger_ota():
    if not os.path.exists(META_FILE):
        raise HTTPException(status_code=404, detail="Upload firmware dulu sebelum trigger OTA")

    with open(META_FILE) as f:
        meta = json.load(f)

    payload = meta["url"]

    try:
        publish.single(
            topic=MQTT_TOPIC,
            payload=payload,
            hostname=MQTT_BROKER,
            port=1883,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal kirim MQTT: {str(e)}")

    return {"message": "OTA trigger dikirim", "topic": MQTT_TOPIC, "payload": payload}


# ── ESP32 POST telemetry setelah OTA ──
@app.post("/device/status")
def post_device_status(status: DeviceStatus):
    """
    Dipanggil oleh ESP32 setelah OTA selesai.
    Contoh payload dari ESP32:
    {
      "battery": 3.82,
      "temperature": 43.5,
      "rssi": -62,
      "save_to_ota": true
    }
    """
    device_status_store.update({
        "battery":     status.battery,
        "temperature": status.temperature,
        "rssi":        status.rssi,
        "save_to_ota": status.save_to_ota,
        "received_at": datetime.utcnow().isoformat(),
    })
    return {"message": "Status diterima"}


# ── Dashboard GET telemetry ──
@app.get("/device/status")
def get_device_status():
    if not device_status_store:
        raise HTTPException(status_code=404, detail="Belum ada data dari device")
    return device_status_store
