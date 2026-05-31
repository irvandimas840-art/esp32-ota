# ESP32 OTA Dashboard
### Remote Firmware Update System | PT Riau Sakti United Plantations

![Platform](https://img.shields.io/badge/Platform-ESP32-red)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB)
![Backend](https://img.shields.io/badge/Backend-FastAPI-009688)
![Protocol](https://img.shields.io/badge/Protocol-MQTT-orange)
![Database](https://img.shields.io/badge/Database-MongoDB-green)
![Server](https://img.shields.io/badge/Server-WSL%20Ubuntu-orange)

---

## 📋 Deskripsi

ESP32 OTA Dashboard adalah sistem update firmware ESP32 secara **Over-The-Air (OTA)** tanpa perlu koneksi USB. Cukup upload file `.bin` ke dashboard, klik trigger, dan semua ESP32 di jaringan akan otomatis update firmware secara remote. Sistem mendukung **multi-device** — setiap ESP32 teridentifikasi unik dan mengirim data telemetry ke server.

---

## ✨ Fitur Utama

- **Remote OTA Update** — Upload firmware `.bin` dan trigger update ke semua ESP32 via MQTT tanpa USB
- **Multi-Device Support** — Setiap ESP32 punya ID unik, data telemetry tersimpan terpisah per device
- **Real-time Telemetry** — Monitor battery, suhu, RSSI WiFi, dan status OTA tiap device
- **Dashboard React** — UI modern dengan status API, activity log, dan card per device
- **Modular Backend** — Arsitektur router FastAPI yang bisa melayani banyak project sekaligus
- **Persistent Storage** — Data telemetry tersimpan di MongoDB, tidak hilang saat server restart
- **Git Workflow** — Coding di laptop → push GitHub → server auto-pull

---

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | React, Vite, JavaScript |
| Backend | Python, FastAPI, Uvicorn |
| Protokol OTA | MQTT (EMQX Broker) |
| Database | MongoDB (motor/pymongo) |
| Firmware | Arduino C++ (ESP32) |
| Server | WSL Ubuntu 22.04 |
| DevOps | Git, GitHub |

---

## 🏗️ Arsitektur Sistem

```
💻 Laptop (Coding)
        │ git push
        ▼
   GitHub Repository
        │ git pull
        ▼
🖥️ PC Server (WSL Ubuntu)
        ├── FastAPI Backend  :8000
        └── React Frontend  :5173
                │
                │ MQTT Trigger
                ▼
         EMQX Broker :1883
                │
                ▼
        ESP32 Devices
        ├── esp32-device-1
        ├── esp32-device-2
        └── esp32-device-n
                │
                │ HTTP POST Telemetry
                ▼
            MongoDB
```

---

## ⚙️ Alur OTA Update

```
Upload file .bin ke dashboard
        ↓
FastAPI simpan firmware di server
        ↓
Klik "Trigger OTA via MQTT"
        ↓
EMQX kirim URL firmware ke topic esp32/ota
        ↓
ESP32 download & flash firmware baru
        ↓
ESP32 kirim telemetry (battery, suhu, RSSI)
        ↓
Dashboard update status device
```

---

## 📡 Telemetry Data

Setiap ESP32 mengirim data berikut setelah OTA selesai:

```json
{
  "device_id": "esp32-device-1",
  "battery": 3.82,
  "temperature": 43.5,
  "rssi": -62,
  "save_to_ota": true
}
```

---

## 📁 Struktur Project

```
esp32-ota/
├── frontend/               ← React dashboard
│   └── src/
│       ├── main.jsx
│       └── ESP32OTADashboard.jsx
├── firmware/               ← File .bin firmware
├── local-server/           ← Backend FastAPI (repo terpisah)
├── main.py                 ← Entry point backend
└── ESP32_OTA_Cheatsheet.pdf
```

---

## 🚀 Cara Menjalankan

### Prasyarat
- Node.js v20+
- Python 3.10+
- MongoDB
- EMQX MQTT Broker (`192.168.12.226:1883`)
- WSL Ubuntu (untuk server)

### Backend
```bash
pip3 install fastapi uvicorn paho-mqtt python-multipart motor pymongo
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev -- --host
```

### Port Proxy (Windows → WSL)
```bash
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=172.28.135.37
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=172.28.135.37
```

### Akses Dashboard
```
http://192.168.12.214:5173
```

---

## 🔌 ESP32 Firmware Template

Project ini menggunakan struktur 2-file untuk kemudahan pengembangan:

```
ArduinoESP/
├── esp32_ota_firmware.ino  ← Template OTA (jangan diubah)
└── project.ino             ← Kode project (edit di sini)
```

Untuk device baru, cukup ganti bagian ini di `esp32_ota_firmware.ino`:
```cpp
#define MQTT_CLIENT_ID  "esp32-device-baru"
#define WIFI_SSID       "nama-wifi"
#define WIFI_PASSWORD   "password-wifi"
```

---

## 👤 Developer

**Irvana Dimas Saputra**
Automation Engineer — IT Department
PT Riau Sakti United Plantations (Sambu Group)

---

## 📄 Lisensi

Internal use only — PT Riau Sakti United Plantations
