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

from routers import ota
app.include_router(ota.router, prefix="/ota")

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

