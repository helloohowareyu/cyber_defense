# Gambaran Umum Modul Tower & Combat 3D (`CYBER DEFENSE`)

> **Ringkasan Baca:** Dokumen ini berisi deskripsi umum yang mudah dibaca mengenai apa saja yang ada di dalam modul **Tower & Combat System (Bagian Yusuf)** pada proyek game **CYBER DEFENSE** (Godot Engine `4.7.2 Stable`).

---

## 1. Deskripsi Umum

Modul ini menangani seluruh sistem pertarungan 3D di dalam game **CYBER DEFENSE**: mulai dari penembakan menara pertahanan, pemilihan target musuh, pergerakan proyektil, perhitungan damage & armor, hingga efek visual shader dan geometri 3D.

Seluruh kode modul ini dibangun terpisah di dalam folder `res://src/combat/` sehingga aman diuji secara mandiri melalui arena simulasi **Combat Sandbox** ([`combat_sandbox.tscn`](../src/combat/sandbox/combat_sandbox.tscn)) sebelum digabungkan dengan peta, ekonomi, dan antarmuka utama tim.

---

## 2. Daftar Menara Pertahanan (4 Jenis Tower)

Setiap menara dapat ditingkatkan hingga **Level 3** (`+25%` damage dan `+10%` jangkauan per level):

| Jenis Tower | Damage Lv.1 | Jangkauan (3D) | Kecepatan Tembak | Harga | Kemampuan & Visual Khusus |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Laser Tower** | `15` | `150` (`15.0 m`) | `0.5 dtk` | `100 Gold` | Serangan tunggal cepat; menembakkan sinar energi cyan yang mengalir (*UV scrolling*) dan berpendar (*additive glow*). |
| **Cannon Tower** | `40` | `120` (`12.0 m`) | `1.5 dtk` | `150 Gold` | Menembakkan peluru meriam oranye yang meledak dalam **area AoE radius `3.5 m`** disertai gelombang kejut (*shockwave disc*). |
| **Freeze Tower** | `5` | `130` (`13.0 m`) | `1.0 dtk` | `125 Gold` | Memberikan **efek lambat (Slow) `40%` selama `2.5` detik** pada musuh yang terkena serangan, ditandai munculnya cincin kristal es di sekitar musuh. |
| **Armor Pen Tower** | `25` | `140` (`14.0 m`) | `1.0 dtk` | `175 Gold` | Peluru penembus baja berwarna merah yang **mengabaikan 100% Armor musuh**, sangat efektif melawan *Orc* dan *Demon King*. |

---

## 3. Mode Pemilihan Target & Data Musuh

### A. 3 Mode Targeting pada Setiap Menara
Pemain dapat mengubah prioritas target menara kapan saja:
1. **Front Most:** Menyerang musuh yang posisinya paling maju mendekati *Energy Core*.
2. **Lowest HP:** Menyerang musuh dengan sisa HP paling kecil.
3. **Closest:** Menyerang musuh yang jaraknya paling dekat dengan menara.

### B. 4 Jenis Musuh (Data Combat & Wave Scaling)
HP musuh bertambah otomatis tiap wave sesuai rumus `ceil(Base HP × 1.25^(Wave - 1))`:
- **Goblin:** `100 HP`, cepat (`8.0 m/s`), tanpa armor (`0`), reward `15 Gold`.
- **Orc:** `250 HP`, sedang (`4.5 m/s`), ber-armor (`10`), reward `25 Gold`.
- **Harpy:** `80 HP`, sangat cepat (`13.0 m/s`), tanpa armor (`0`), reward `20 Gold`.
- **Demon King (Boss):** `1.500 HP`, lambat (`3.5 m/s`), armor tebal (`20`), reward `150 Gold`.

---

## 4. Fitur Grafika Komputer & Visual yang Sudah Tersedia

Seluruh elemen visual dibangun dengan teknik grafika 3D *programmable pipeline* di Godot 4.7.2 (Vulkan):
1. **Indikator Jangkauan (`Range Ring`):** Cincin melingkar 3D di bawah menara yang dibangun secara prosedural menggunakan `ArrayMesh` (buffer vertex, normal, UV, warna interpolasi, dan indeks segitiga) serta *Alpha Blending*. Cincin otomatis membesar saat menara di-upgrade dan muncul ketika menara diklik mouse.
2. **Sinar Laser Real-Time:** Pita sinar 3D bersilang yang digambar dinamis menggunakan `ImmediateMesh` dengan tekstur pulsa bergerak (*UV Scrolling*).
3. **Pencahayaan & Bayangan 3D:** Material turret, proyektil, dan kristal es menggunakan custom shader **Blinn-Phong** (*Ambient + Diffuse + Specular + Fresnel Rim*) serta mendukung *Shadow Mapping* dari `DirectionalLight3D`.

---

## 5. Peta Isi Folder Modul Yusuf

```text
src/combat/
├── math/         -> combat_math.gd (rumus jarak 3D, rotasi, damage, scaling)
├── resources/    -> tower_stats_data.gd, enemy_combat_data.gd, & 8 file presets/*.tres
├── components/   -> combat_target_component.gd (adapter musuh) & target_selector.gd
├── graphics/     -> procedural_mesh_builder.gd (ArrayMesh) & laser_beam_renderer.gd (ImmediateMesh)
├── shaders/      -> 3 custom shader .gdshader (blending, UV scroll, Blinn-Phong)
├── projectiles/  -> projectile_3d.gd (peluru 3D & ledakan AoE)
├── towers/       -> tower_3d.gd (logika utama menara & klik mouse)
└── sandbox/      -> mock_enemy_3d.gd & combat_sandbox.tscn (arena uji 3D mandiri)

tests/combat/
└── test_combat_system.gd -> 52 pengujian otomatis (headless)
```
