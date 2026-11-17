# CYBER DEFENSE

Game **Tower Defense 3D** berbasis PC/Desktop yang dikembangkan menggunakan **Godot Engine 4.7.2 Stable (Vulkan `Forward+`)** dan **GDScript 2.0** untuk proyek mata kuliah **Komputer Grafis (CIF65116)**.

---

## Gambaran Umum Proyek

Pemain bertugas melindungi **Energy Core** dari gelombang serangan pasukan musuh (*Goblin*, *Orc*, *Harpy*, dan Boss *Demon King*) dengan membangun, memilih mode targeting, dan meng-upgrade empat jenis menara pertahanan (*Laser*, *Cannon*, *Freeze*, dan *Armor Pen Tower*) di sekitar jalur musuh.

---

## Pembagian Tim

| Anggota | Peran | Fokus Modul |
| :--- | :--- | :--- |
| **Zulfan** | Project Manager & UI/UX | Desain antarmuka, Main Menu, HUD, Radial Menu, aset visual |
| **Abiyu** | Core Game Logic | Alur permainan, peta, pergerakan waypoint musuh, wave spawner |
| **Yusuf (Ucup)** | Tower & Combat System | 4 jenis Tower 3D, targeting, proyektil, damage/armor, procedural mesh & shader |
| **Nur** | Economy & Supporting System | Sistem Gold, pembelian/upgrade/sell menara, audio SFX, penyimpanan |

---

## Struktur Direktori Utama

```text
cyber_defense/
├── project.godot            # Konfigurasi proyek Godot 4.7.2 (Forward+)
├── komputer grafis.md       # Game Design Document (GDD) utama tim
├── docs/                    # Dokumentasi kurikulum, kontrak tim, handoff, & panduan demo
├── src/combat/              # Modul Tower & Combat 3D + Game 3D Komplit Mandiri (src/combat/game_3d/)
├── tests/combat/            # Suite pengujian otomatis Combat & E2E 3D (259 assertions)
└── Scenes/                  # Base eksperimen awal 2D
```

---

## Cara Menjalankan & Menguji (Modul 3D & Combat)

1. **Jalankan Game 3D Komplit Mandiri (Godot Editor 4.7.2):**
   Buka `res://src/combat/game_3d/cyber_defense_3d.tscn`, lalu tekan **F6** (*Run Current Scene*).
2. **Jalankan Arena Uji Sandbox 3D:**
   Buka `res://src/combat/sandbox/combat_sandbox.tscn`, lalu tekan **F6**.
3. **Bangkitkan Placeholder Aset Lokal (Jika `res://Assets/` Belum Ada) & Jalankan Suite Pengujian Otomatis:**
   ```bash
   godot --headless -s res://src/combat/tools/asset_generator.gd
   godot --headless -s res://tests/combat/test_combat_system.gd
   ```

---

## Dokumentasi Lengkap (`docs/`)

- [`docs/06_PANDUAN_DEMO_DAN_LAPORAN_KULIAH.md`](./docs/06_PANDUAN_DEMO_DAN_LAPORAN_KULIAH.md) — Panduan demo presentasi kuliah Komputer Grafis (`CIF65116`) & pemetaan kode 3D.
- [`docs/05_MODULE_OVERVIEW_READABLE.md`](./docs/05_MODULE_OVERVIEW_READABLE.md) — Ringkasan mudah baca mengenai isi modul Tower, Combat, & Game 3D Komplit.
- [`docs/04_TEAM_HANDOFF_AND_NEXT_STEPS.md`](./docs/04_TEAM_HANDOFF_AND_NEXT_STEPS.md) — Panduan handoff untuk tim: apa yang sudah selesai dan langkah integrasi selanjutnya.
- [`docs/03_TEAM_INTEGRATION_CONTRACTS.md`](./docs/03_TEAM_INTEGRATION_CONTRACTS.md) — Kontrak sinyal dan fungsi lintas modul (Abiyu, Nur, Zulfan).
- [`docs/02_CURRICULUM_OPENGL_TO_VULKAN_MAP.md`](./docs/02_CURRICULUM_OPENGL_TO_VULKAN_MAP.md) — Pemetaan materi Komputer Grafis (*Sumanta Guha* & RPS CIF65116) ke Godot 4.7.2.
