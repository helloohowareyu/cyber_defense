# CYBER DEFENSE

Game *tower defense* 3D bertema keamanan siber. Pemain menjaga **Energy Core** dari 15 gelombang malware dengan membangun, meng-upgrade, dan mengatur enam jenis menara pertahanan di sekitar jalur musuh.

Dibuat untuk mata kuliah **Komputer Grafis (CIF65116)**, Fakultas Ilmu Komputer, Universitas Brawijaya.

- **Versi utama:** web, dibangun dengan React 19, Three.js, TypeScript, dan Vite. Bisa dimainkan langsung di browser.
- **Versi prototipe:** Godot Engine 4.7.2 (Vulkan Forward+), masih tersimpan di repo ini.

Main langsung di browser: **[link Vercel]**

---

## Tim

**Easy Run 5k Sub 20**

| Anggota | Peran | Fokus |
| :--- | :--- | :--- |
| **Zulfan** | Project Manager, Economy & Supporting System | Sistem gold, beli/upgrade/jual menara, Overclock pad, audio & musik, simpan rekor, UI |
| **Nur** | UI/UX & Peta Arena | Peta dan jalur 3D, tata letak arena, aset visual |
| **Abiyu** | Core Game Logic | Alur permainan, gelombang musuh, pergerakan musuh di jalur |
| **Yusuf (Ucup)** | Tower & Combat System | Enam menara, targeting, proyektil, damage/armor, mesh prosedural & shader |

---

## Menjalankan versi web

Butuh **Node.js 20** ke atas.

```bash
npm install     # pasang dependensi (wajib diulang setelah pull kalau package.json berubah)
npm run dev     # buka http://localhost:3000
```

Perintah lain:

```bash
npm run build                      # build produksi ke folder dist/
npm run preview                    # jalankan hasil build secara lokal
npm run lint                       # cek tipe TypeScript
npx tsx src/game/gameLogic.test.ts # unit test logika game
```

### Deploy ke Vercel

Vercel otomatis mengenali projek ini sebagai Vite (build `vite build`, output `dist`).

```bash
npx vercel login
npx vercel --prod
```

---

## Cara bermain

1. Di menu utama, pilih tingkat kesulitan lalu tekan **START**.
2. Pilih menara di **Toko menara** (panel kanan), lalu klik area kosong di dek arena untuk memasangnya.
3. Tekan **Mulai wave** saat siap. Musuh berjalan di jalur menuju Energy Core.
4. Klik menara untuk melihat statistiknya, mengganti prioritas target, upgrade, atau menjualnya.
5. Bertahanlah sampai wave 15 dan kalahkan **OMEGA-0 Rootkit**. Kalau HP Energy Core habis, permainan berakhir.

### Tingkat kesulitan

| Mode | Gold awal | HP core | HP musuh | Harga menara |
| :--- | :---: | :---: | :---: | :---: |
| Mudah | 320 | 50 | 80% | 90% |
| Sedang | 240 | 35 | 100% | 100% |
| Sulit | 190 | 20 | 128% | 112% |

### Menara

Harga di bawah adalah harga mode Sedang. Setiap menara bisa di-upgrade sampai **Lv.4**, dan di level itu membuka kemampuan ultimate.

| Menara | Harga | Peran | Ultimate (tombol) |
| :--- | :---: | :--- | :--- |
| Laser Prism | 100G | Laser cepat satu target | Prism Overdrive (Q) |
| Plasma Cannon | 140G | Ledakan area | Orbital EMP Barrage (E) |
| Cryo Emitter | 120G | Memperlambat musuh | Absolute Zero (R) |
| Railgun Sniper | 175G | Menembus armor 100% | Hyper-Rail Lance (T) |
| Tesla Arc Relay | 150G | Petir berantai ke beberapa musuh | Ion Overload Storm (Y) |
| Quantum Farm | 240G | Menghasilkan gold | Quantum Jackpot (F) |

- **Jual menara:** uang kembali 70% dari total yang sudah dikeluarkan.
- **Overclock pad:** pad terkunci di arena bisa dibeli (90G/120G/150G sesuai mode). Menara di atasnya mendapat +12% jangkauan dan kecepatan tembak.
- **Prioritas target:** First (paling depan), Strong (HP terbanyak), Last (paling belakang), Close (paling dekat).

### Musuh

| Musuh | Ciri |
| :--- | :--- |
| Bit-Crawler | Drone malware dasar |
| Zero-Day Worm | Kecil, cepat, datang bergerombol |
| Packet Phantom | Melayang, sedikit berarmor |
| Trojan Juggernaut | Mech berarmor tebal |
| Firewall Breaker | Mid-boss (wave 10 dan 13) |
| OMEGA-0 Rootkit | Boss akhir (wave 15) |

Gelombang dibagi menjadi Stage 1 (wave 1–5), Stage 2 (wave 6–10), Stage 3 (wave 11–14), dan Final Stage (wave 15).

### Kontrol

| Aksi | Kontrol |
| :--- | :--- |
| Pilih menara dari toko | Klik di toko, atau tombol **1–6** |
| Pasang menara | Klik kiri di dek arena |
| Pilih menara yang sudah ada | Klik kiri pada menara |
| Mulai wave berikutnya | Tombol **Mulai wave** atau **Spasi** |
| Upgrade / jual menara terpilih | **U** / **X** atau **Delete** |
| Ultimate menara Lv.4 | **Q, E, R, T, Y, F** |
| Putar kamera | Klik kanan + geser |
| Geser kamera | Tombol panah |
| Zoom | Scroll mouse |
| Batal / tutup panel / jeda | **Esc** |
| Jeda | **P** |
| Buka/tutup toko | **H** |
| Lab Grafika | **G** |
| Proyeksi perspektif ↔ ortografik | **O** |
| Efek suara / musik on-off | **M** / **N** |

---

## Materi Komputer Grafis yang diterapkan

Tekan **G** saat bermain untuk membuka **Lab Grafika**, panel untuk demo materi kuliah:

- Proyeksi kamera perspektif dan ortografik, serta beberapa sudut pandang kamera
- Mode wireframe
- Shadow mapping (PCF Soft)
- Shader GLSL kustom: Blinn-Phong untuk kristal es, UV bergulir pada laser, cincin jangkauan dengan alpha blending
- Additive blending dan bloom selektif untuk tembakan, ledakan, dan efek kena musuh
- Model menara dan musuh dibuat secara prosedural (ExtrudeGeometry, LatheGeometry, TubeGeometry)

---

## Struktur folder

```text
cyber_defense/
├── index.html, vite.config.ts, package.json   # Konfigurasi versi web
├── src/
│   ├── App.tsx            # Penghubung React dengan engine game
│   ├── components/        # UI: menu utama, HUD, toko, modal, Lab Grafika
│   ├── engine/            # Engine Three.js: render, kamera, menara, musuh, efek visual
│   ├── game/              # Data & logika: preset menara/musuh/wave, audio, simpan rekor, test
│   ├── audio/             # Musik latar (menu & saat wave)
│   ├── combat/            # Versi prototipe Godot: menara, combat, shader, game 3D
│   └── nur/               # Versi prototipe Godot: peta & jalur 3D
├── project.godot          # Konfigurasi projek Godot
├── tests/combat/          # Test otomatis versi Godot
├── docs/                  # Dokumentasi tim dan panduan demo
└── komputer grafis.md     # Game Design Document (GDD)
```

---

## Versi prototipe Godot

Buka folder ini di **Godot Engine 4.7.2**, lalu jalankan scene `res://src/combat/game_3d/cyber_defense_3d.tscn` dengan **F6**. Lewat terminal:

```bash
godot res://src/combat/game_3d/cyber_defense_3d.tscn              # game 3D
godot res://src/combat/sandbox/combat_sandbox.tscn                # arena uji combat
godot res://src/nur/node_3d.tscn                                  # peta arena Nur
godot --headless -s res://tests/combat/test_combat_system.gd      # test otomatis
```

---

## Dokumentasi pendukung

- [`docs/07_PANDUAN_RUNNING_DAN_ANALISIS_REPO.md`](./docs/07_PANDUAN_RUNNING_DAN_ANALISIS_REPO.md): analisis repo dan cara menjalankan
- [`docs/06_PANDUAN_DEMO_DAN_LAPORAN_KULIAH.md`](./docs/06_PANDUAN_DEMO_DAN_LAPORAN_KULIAH.md): panduan demo dan laporan kuliah
- [`docs/05_MODULE_OVERVIEW_READABLE.md`](./docs/05_MODULE_OVERVIEW_READABLE.md): ringkasan modul
- [`docs/03_TEAM_INTEGRATION_CONTRACTS.md`](./docs/03_TEAM_INTEGRATION_CONTRACTS.md): kontrak integrasi antar anggota
