# CYBER DEFENSE 3D

Game **Tower Defense 3D** futuristik berbasis PC/Desktop dan Web yang dikembangkan menggunakan **Godot Engine 4.7.2 Stable (Vulkan `Forward+`)** serta versi interaktif web **React + Three.js** untuk proyek mata kuliah **Komputer Grafis (CIF65116)**.

---

## 🎯 Gambaran Umum Proyek

Pemain bertugas melindungi **Energy Core** dari gelombang serangan musuh cyber (*Goblin*, *Orc*, *Harpy*, dan Boss *Demon King*) dengan membangun, meng-upgrade, dan mengatur strategi target 4 jenis menara pertahanan (*Laser*, *Cannon*, *Freeze*, dan *Armor Pen Tower*) di sepanjang jalur grid arena.

---

## 👥 Pembagian Tim

| Anggota | Peran | Fokus Modul |
| :--- | :--- | :--- |
| **Zulfan** | Project Manager & UI/UX | Desain antarmuka, Main Menu, HUD, Radial Menu, aset visual |
| **Abiyu** | Core Game Logic | Alur permainan, peta, pergerakan waypoint musuh, wave spawner |
| **Yusuf (Ucup)** | Tower & Combat System | 4 jenis Tower 3D, targeting, proyektil, damage/armor, procedural mesh & custom shaders |
| **Nur** | Economy & Supporting System | Sistem Gold, pembelian/upgrade/sell menara, audio SFX, penyimpanan |

---

## 🚀 Panduan Memulai Game (Quick Start)

### 1. Menjalankan Versi Desktop (Godot Engine 4.7.2 Stable) — *Target Utama Kuliah*

#### A. Melalui Godot Editor UI:
1. Buka Godot Engine 4.7.2 dan import folder project ini.
2. Pada panel **FileSystem**, navigasi ke folder:
   - `res://src/combat/game_3d/cyber_defense_3d.tscn` (Game 3D Utama).
3. Klik kanan lalu pilih **Run** atau tekan tombol **F6** (*Run Current Scene*).
4. Klik tombol **"MULAI OPERASI PERTAHANAN"** pada Title Screen untuk masuk ke arena permainan.

#### B. Melalui Terminal / Command Line:
```bash
# Menjalankan Game 3D Utama:
godot res://src/combat/game_3d/cyber_defense_3d.tscn

# Menjalankan Arena Uji Sandbox Combat (Uji Tower, Damage Math, & Shader):
godot res://src/combat/sandbox/combat_sandbox.tscn

# Menjalankan Peta Arena 3D Nur:
godot res://src/nur/node_3d.tscn

# Menjalankan 259 Unit & E2E Automated Tests (Headless):
godot --headless -s res://tests/combat/test_combat_system.gd
```

---

### 2. Menjalankan Versi Web (React + Three.js)

```bash
# 1. Pasang dependensi
npm install

# 2. Jalankan development server
npm run dev

# 3. Buka URL di browser (biasanya http://localhost:3000)
```

---

## 🕹️ Panduan Kontrol & Cara Bermain (Gameplay Guide)

| Aksi | Kontrol | Penjelasan Gameplay |
| :--- | :--- | :--- |
| **Mulai Wave Serangan** | Klik Tombol **"KIRIM GELOMBANG SEKARANG"** | Memulai invasi musuh lebih awal untuk mendapatkan bonus gold taktis. |
| **Pilih Slot Menara** | **Klik Kiri** pada Pad/Slot Grid | Membuka Radial Menu untuk memilih menara yang ingin dibangun. |
| **Membangun Menara** | **Klik Icon Tower** pada Menu Pilihan | - **Laser Tower (100G):** Serangan laser konstan (*single-target*).<br>- **Cannon Tower (125G):** Proyektil balistik ledakan area (*AOE splash*).<br>- **Freeze Tower (150G):** Memperlambat (*slow debuff*) kecepatan musuh.<br>- **Armor Pen Tower (175G):** Menembus pertahanan armor musuh tebal. |
| **Inspect / Upgrade / Sell** | **Klik Kiri** pada Menara yang sudah berdiri | Membuka panel detail stats. Tekan **Upgrade** untuk menaikkan jangkauan & damage, atau **Sell** untuk refund 70% gold. |
| **Ubah Target Mode** | Tombol Targeting di Panel Tower | Ubah prioritas tembakan: `FRONT_MOST` (terdepan), `LOWEST_HP` (darah terendah), atau `CLOSEST` (paling dekat dengan menara). |
| **Rotasi Kamera 3D** | **Klik Kanan + Drag** mouse | Memutar sudut pandang kamera di sekitar arena grid. |
| **Zoom Kamera 3D** | **Scroll Wheel** mouse | Memperbesar (*zoom in*) atau memperkecil (*zoom out*) pandangan. |
| **Jeda / Lanjut** | Tombol **Space** atau Icon **Pause** di HUD | Menghentikan sementara simulasi tanpa menutup sesi. |

---

## 📂 Struktur Direktori Utama

```text
cyber_defense/
├── project.godot            # Konfigurasi Godot 4.7.2 Forward+ (Vulkan)
├── package.json             # Konfigurasi Web App (React 19, Three.js, Tailwind v4)
├── komputer grafis.md       # Game Design Document (GDD) utama tim
├── docs/                    # Dokumentasi kurikulum, kontrak tim, modul, & panduan
│   ├── 00_YUSUF_MASTER_PLAN.md                  # Master Plan pengerjaan modul Yusuf
│   ├── 01_CODING_RULES_AND_ANTI_AI_SLOP.md      # Standar coding & anti-slop
│   ├── 06_PANDUAN_DEMO_DAN_LAPORAN_KULIAH.md    # Panduan demo & RPS CIF65116
│   └── 07_PANDUAN_RUNNING_DAN_ANALISIS_REPO.md  # Analisis arsitektur & panduan running
├── src/combat/              # Modul Tower & Combat 3D + Standalone Game 3D Godot
│   ├── game_3d/             # Game 3D mandiri lengkap (HUD, Spawner, Economy, Camera)
│   ├── towers/              # Class & logic 4 menara 3D
│   ├── shaders/             # Custom Godot Shaders (Phong, UV Scroll, Range Ring)
│   └── tools/               # Procedural asset generator
├── src/nur/                 # Folder isolasi scene & peta 3D pengerjaan Nur
├── src/engine/              # Implementasi WebGL / Three.js Engine
└── tests/combat/            # 259 Automated Tests (Combat Math, Tower, & E2E Game 3D)
```

---

## 📚 Dokumentasi Pendukung Lengkap

- [`docs/07_PANDUAN_RUNNING_DAN_ANALISIS_REPO.md`](./docs/07_PANDUAN_RUNNING_DAN_ANALISIS_REPO.md) — Panduan mendalam analisis teknis & eksekusi repositori.
- [`docs/06_PANDUAN_DEMO_DAN_LAPORAN_KULIAH.md`](./docs/06_PANDUAN_DEMO_DAN_LAPORAN_KULIAH.md) — Panduan demo presentasi kuliah Komputer Grafis & keterkaitan materi OpenGL/Vulkan.
- [`docs/05_MODULE_OVERVIEW_READABLE.md`](./docs/05_MODULE_OVERVIEW_READABLE.md) — Ringkasan modul Tower, Combat, dan integrasi game 3D.
- [`docs/03_TEAM_INTEGRATION_CONTRACTS.md`](./docs/03_TEAM_INTEGRATION_CONTRACTS.md) — Kontrak integrasi sinyal dan fungsi antar anggota tim.
