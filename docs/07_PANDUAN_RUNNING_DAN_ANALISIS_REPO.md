# 🎮 Panduan Menjalankan & Analisis Arsitektur Proyek Cyber Defense 3D

Dokumen ini berisi rangkuman analisis struktur repositori, sinkronisasi codebase, serta panduan lengkap cara menjalankan game **Cyber Defense 3D** baik versi **Native Godot Engine 4.7.2** maupun versi **Web (React + Three.js)**.

---

## 📊 1. Analisis Arsitektur Repositori Saat Ini

Repositori ini telah berkembang menjadi arsitektur dual-target (Desktop Native & Modern Web) yang terintegrasi:

```text
cyber_defense/
├── project.godot                     # [Target 1] Konfigurasi Engine Godot 4.7.2 Forward+
├── src/combat/                       # Modul Inti Tower, Combat Math, & Standalone Game 3D Godot
│   ├── game_3d/cyber_defense_3d.tscn # Main Standalone Game Scene Godot 3D
│   ├── sandbox/combat_sandbox.tscn   # Arena Sandbox Pengujian Efek Combat & Tower
│   ├── towers/                       # Logika 4 Tower (Laser, Cannon, Freeze, ArmorPen)
│   ├── shaders/                      # Custom Shaders (Phong, UV Scroll, Range Ring)
│   └── tools/asset_generator.gd      # Procedural asset generator mandiri
├── src/nur/                          # Modul Scene & Peta 3D hasil pengerjaan Nur
│   ├── node_3d.tscn                  # Peta arena 3D, jalur musuh, & slot menara Nur
│   ├── base_musuh_static_body_3d.gd  # Spawn base musuh & animasi neon portal
│   ├── base_utama_static_body_3d.gd  # Base utama (Energy Core)
│   ├── sistem_jalur_node_3d.gd       # Path kurva waypoint 3D
│   └── slot_menara_3d.gd             # Penempatan slot menara otomatis di sisi jalan
├── tests/combat/                     # 259 Automated Headless Unit & E2E Tests (100% Pass)
├── package.json                      # [Target 2] Konfigurasi Web App (Vite, React 19, Three.js, Tailwind v4)
├── vite.config.ts                    # Bundler config Vite
├── src/engine/                       # Engine 3D WebGL (Three.js reimplementation)
│   ├── CyberDefenseEngine.ts         # Game loop, scene, camera, Raycaster, tower placement
│   ├── nurArenaBuilder.ts            # Peta arena 3D adaptasi langsung dari peta Nur
│   ├── proceduralMeshes.ts           # Geometri prosedural menara & musuh
│   └── shaders.ts                    # GLSL Custom Shaders (Blinn-Phong, Laser, Ring)
└── docs/                             # Dokumentasi kurikulum, GDD, modul, dan RPS CIF65116
```

---

## 🚀 2. Petunjuk Menjalankan Game

### Opsi A: Menjalankan Game Native Godot Engine (Target Utama Kuliah)

Versi Godot menggunakan Vulkan Forward+ dengan shader custom dan mesh prosedural native.

#### 1. Menjalankan Game Lengkap (Standalone 3D):
Buka terminal di root project atau gunakan Godot Editor:
```bash
# Menggunakan command line langsung:
godot res://src/combat/game_3d/cyber_defense_3d.tscn

# Atau dari dalam Godot Editor (v4.7.2):
# 1. Buka FileSystem panel -> buka folder res://src/combat/game_3d/
# 2. Klik ganda pada cyber_defense_3d.tscn
# 3. Tekan F6 (Run Current Scene)
```

#### 2. Menjalankan Arena Sandbox Combat (Uji Tower & Damage):
```bash
godot res://src/combat/sandbox/combat_sandbox.tscn
```

#### 3. Menjalankan Scene Peta 3D Nur:
```bash
godot res://src/nur/node_3d.tscn
```

#### 4. Menjalankan Test Suite Otomatis (Headless / Tanpa Window):
```bash
# Menjalankan 259 unit & E2E tests:
godot --headless -s res://tests/combat/test_combat_system.gd
```

---

### Opsi B: Menjalankan Game Versi Web (React + Three.js)

Versi web memanfaatkan Three.js dan React untuk rendering 3D interaktif di browser.

#### Persyaratan:
- Node.js (v18+) dan npm/pnpm/bun.

#### Langkah Menjalankan:
```bash
# 1. Masuk ke root directory project
cd "/home/helloohowareyu/Documents/Computer Graphics/cyber_defense"

# 2. Pasang dependensi
npm install

# 3. Jalankan development server
npm run dev

# 4. Buka di browser:
# http://localhost:3000
```

---

## 🎮 3. Kontrol dan Alur Permainan

| Aksi | Kontrol Mouse / Keyboard | Keterangan |
| :--- | :--- | :--- |
| **Pilih Slot Menara** | Klik Kiri pada Slot Pad Grid | Membuka menu pilihan pembangunan menara |
| **Bangun Menara** | Klik Icon Tower pada Menu | Pilihan: Laser (100G), Cannon (125G), Freeze (150G), Armor Pen (175G) |
| **Inspect / Upgrade / Sell** | Klik Kiri pada Menara yang ada | Menampilkan panel status, upgrade level, dan refund gold |
| **Ubah Target Mode** | Tombol Mode di HUD / Panel | Mode: `FRONT_MOST` (terdepan), `LOWEST_HP` (darah tersedikit), `CLOSEST` (terdekat) |
| **Navigasi Kamera** | Klik Kanan Drag / Scroll Wheel | Memutar orientasi pandang atau memperbesar/memperkecil zoom |
| **Pause / Resume** | Tombol Spasi / Tombol Pause di HUD | Menghentikan sementara pergerakan musuh dan tembakan |

---

## 🧹 4. Status Kebersihan Repositori (Repo Hygiene)
- Remote GitHub (`origin/main`) dan branch lokal `main` telah **100% sinkron** (`up to date`).
- Branch `nur` terisolasi rapi dan aman di commit `20b0eb2` (juga tersedia di worktree lokal `../cyber_defense_nur`).
- File dokumentasi penting (`AGENTS.md`, `00_YUSUF_MASTER_PLAN.md`, `01_CODING_RULES_AND_ANTI_AI_SLOP.md`) telah resmi tercatat di Git tracking.
- Seluruh direktori kerja bersih (`working tree clean`), tidak ada temporary files atau file sampah yang tertinggal.
- Seluruh 259 unit & E2E automated test Godot terverifikasi **100% PASS (0 FAIL)**.
