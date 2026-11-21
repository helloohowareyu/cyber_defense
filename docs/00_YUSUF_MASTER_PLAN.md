# Cyber Defense — Master Plan & Implementation Plan (Bagian Yusuf: Tower & Combat System)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` + `@karpathy-guidelines` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul **Tower & Combat System** yang mandiri, teruji (TDD), bebas *AI Slop*, mudah diintegrasikan dengan kode *Core Game Logic* milik Abiyu (maupun Ekonomi milik Nur dan UI milik Zulfan), serta secara alami memenuhi seluruh **CPMK-1, CPMK-2 (RPS CIF65116)** dan **9 Topik *Computer Graphics Through OpenGL* (Sumanta Guha)** di atas **Godot Engine 4.7.2 Stable (Vulkan Forward+)**.

**Architecture:** Menggunakan arsitektur **Data-Driven Custom Resource (`.tres`) + Modular Component & Adapter Pattern (`.gd`) + Custom Programmable Shader (`.gdshader`) + Procedural Mesh (`ArrayMesh` / `ImmediateMesh`)**. Seluruh kalkulasi matematika (jarak 3D, rotasi matriks `Basis`, reduksi armor, scaling upgrade, seleksi target) dipisahkan menjadi fungsi murni (*pure functions*) di bawah 40 baris agar dapat diverifikasi secara *headless* tanpa bergantung pada scene anggota tim lain.

**Tech Stack:** Godot Engine 4.7.2 Stable (Vulkan `Forward+`), GDScript 2.0 (Strict Static Typing), Godot Shading Language (`.gdshader` / GLSL-like), `ArrayMesh` & `ImmediateMesh` (OpenGL VAO/VBO & Immediate Primitives equivalent), `gdtoolkit` (`gdlint`/`gdformat`), dan `GdUnit4` / Headless Test Runner.

**Spec:** [`komputer grafis.md`](file:///home/helloohowareyu/Documents/Computer%20Graphics/cyber_defense/komputer%20grafis.md), [`docs/01_CODING_RULES_AND_ANTI_AI_SLOP.md`](file:///home/helloohowareyu/Documents/Computer%20Graphics/cyber_defense/docs/01_CODING_RULES_AND_ANTI_AI_SLOP.md), [`docs/02_CURRICULUM_OPENGL_TO_VULKAN_MAP.md`](file:///home/helloohowareyu/Documents/Computer%20Graphics/cyber_defense/docs/02_CURRICULUM_OPENGL_TO_VULKAN_MAP.md), [`docs/03_TEAM_INTEGRATION_CONTRACTS.md`](file:///home/helloohowareyu/Documents/Computer%20Graphics/cyber_defense/docs/03_TEAM_INTEGRATION_CONTRACTS.md).

---

## 1. Global Constraints & Ketetapan Matematis (Hasil Desain `/grill-me`)

Setiap file dan task yang dikerjakan oleh Yusuf **WAJIB** mematuhi ketetapan berikut tanpa pengecualian:

1. **Batas Ruang Lingkup Surgical (Karpathy Principle 3):**
   - **Area Kerja Yusuf (`res://src/combat/` & `res://tests/combat/`):** Hanya mencakup 4 jenis Tower (`Laser`, `Cannon`, `Freeze`, `ArmorPen`), 3 mode Targeting (`FRONT_MOST`, `LOWEST_HP`, `CLOSEST`), sistem Proyektil 3D & Beam, kalkulasi Damage & Debuff (`CombatMath`), komponen penerima serangan pada Enemy (`CombatTargetComponent` / Adapter), geometri prosedural (`ArrayMesh` & `ImmediateMesh`), dan shader `.gdshader` terkait combat.
   - **Dilarang Menyentuh Porsi Tim Lain:** Jangan menulis ulang sistem Waypoint/Map/Game State (porsi **Abiyu**), sistem dompet Gold/Audio/Save (porsi **Nur**), atau layar Main Menu/HUD/Victory (porsi **Zulfan**). Gunakan `MockEnemy3D` dan `CombatSandbox.tscn` untuk pengujian mandiri sampai kode Abiyu siap diintegrasikan.
2. **Konversi Skala Ruang 3D (`UNIT_SCALE`):**
   - Karena GDD Tabel 5 & 6 mencantumkan Range `120–150 px` dan Speed `35–130 unit`, sedangkan ruang dunia 3D Godot menggunakan satuan meter, seluruh nilai jarak/kecepatan dari GDD dikalikan dengan konstanta kalibrasi:
     $$\text{UNIT\_SCALE} = 0.1 \quad (\text{sehingga } 150\text{ unit GDD} = 15.0\text{ meter di World Coordinates 3D})$$
   - Konstanta ini disimpan di satu tempat (`CombatMath.UNIT_SCALE`) agar saat digabungkan dengan ukuran grid peta Abiyu, penyesuaian skala cukup mengubah **1 angka** saja.
3. **Spesifikasi Eksak 4 Tower (Level 1 Base Stats):**
   | Jenis Tower | ID Enum | Base Damage | Base Range (GDD $\rightarrow$ 3D) | Fire Rate (Cooldown) | Harga Awal | Efek Khusus Combat |
   | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
   | **Laser Tower** | `LASER` | `15.0` | `150` $\rightarrow$ `15.0m` | `0.5s` | `100 Gold` | Serangan tunggal cepat, visual berwujud sinar menggunakan `ImmediateMesh` + `laser_beam.gdshader` |
   | **Cannon Tower** | `CANNON` | `40.0` | `120` $\rightarrow$ `12.0m` | `1.5s` | `150 Gold` | Serangan proyektil parabolik/lurus dengan ledakan **AoE Radius = `35` unit (`3.5m`)** |
   | **Freeze Tower** | `FREEZE` | `5.0` | `130` $\rightarrow$ `13.0m` | `1.0s` | `125 Gold` | Memberikan efek **Slow `40%` (`speed_multiplier = 0.6`) selama `2.5` detik** + visual es (`freeze_debuff.gdshader`) |
   | **Armor Pen Tower** | `ARMOR_PEN` | `25.0` | `140` $\rightarrow$ `14.0m` | `1.0s` | `175 Gold` | Mengabaikan **100% Armor** musuh (`ignore_armor = true`) |
4. **Spesifikasi Eksak 4 Musuh (Data Referensi untuk Komponen Combat/Target):**
   | Jenis Enemy | Base HP (Wave 1) | Speed (GDD $\rightarrow$ 3D) | Armor | Reward | Scaling HP Wave ke-$N$ ($N \ge 1$) |
   | :--- | :---: | :---: | :---: | :---: | :--- |
   | **Goblin** | `100` | `80` $\rightarrow$ `8.0m/s` | `0.0` | `15 Gold` | $\lceil 100 \times 1.25^{(N-1)} \rceil$ |
   | **Orc** | `250` | `45` $\rightarrow$ `4.5m/s` | `10.0` | `25 Gold` | $\lceil 250 \times 1.25^{(N-1)} \rceil$ |
   | **Harpy** | `80` | `130` $\rightarrow$ `13.0m/s` | `0.0` | `20 Gold` | $\lceil 80 \times 1.25^{(N-1)} \rceil$ |
   | **Demon King** | `1500` | `35` $\rightarrow$ `3.5m/s` | `20.0` | `150 Gold` | $\lceil 1500 \times 1.25^{(N-1)} \rceil$ |
5. **Rumus Matematika Wajib di `CombatMath`:**
   - **Jarak Euclidean 3D (GDD Bagian 4.2 & 10.6):**
     $$d = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2 + (z_2 - z_1)^2}$$
   - **Scaling Stat Tower per Level $L \in \{1, 2, 3\}$ (GDD Bagian 5):**
     Setiap kenaikan level meningkatkan damage $+25\%$ dan range $+10\%$ dari stat dasar:
     $$\text{Damage}(L) = \text{BaseDamage} \times (1.0 + 0.25 \times (L - 1))$$
     $$\text{Range}(L) = \text{BaseRange} \times (1.0 + 0.10 \times (L - 1))$$
   - **Reduksi Damage oleh Armor (Flat Reduction dengan Batas Minimum `1.0`):**
     $$\text{EffectiveArmor} = \begin{cases} 0.0 & \text{jika } \text{ignore\_armor} = \text{true} \\ \max(0.0, \text{TargetArmor}) & \text{jika } \text{ignore\_armor} = \text{false} \end{cases}$$
     $$\text{FinalDamage} = \max(1.0, \text{RawDamage} - \text{EffectiveArmor})$$
   - **Rumus Referensi Upgrade & Sell (Untuk Sinkronisasi dengan Modul Nur - GDD Bagian 4.5):**
     $$\text{UpgradeCost}(L) = \lceil \text{BaseCost} \times 1.5^L \rceil, \quad \text{SellRefund} = \lfloor \text{TotalInvestment} \times 0.7 \rfloor$$
6. **Aturan Komentar Wajib:** Setiap file, class, fungsi, dan signal wajib memiliki blok komentar `## [FUNGSI]`, `## [REFERENSI_KURIKULUM]`, dan `## [ARAH_INTERAKSI]` sesuai [`docs/01_CODING_RULES_AND_ANTI_AI_SLOP.md`](file:///home/helloohowareyu/Documents/Computer%20Graphics/cyber_defense/docs/01_CODING_RULES_AND_ANTI_AI_SLOP.md).

---

## 2. Review Focus (5 Edge Cases Kritis yang Wajib Diuji di TDD)

1. **Target Mati/Hilang Saat Proyektil Masih Terbang (`Freed Instance Crash`):** Jika musuh A sudah mati karena serangan tower pertama saat proyektil tower kedua masih di udara menuju A, proyektil kedua tidak boleh memicu error `previously freed instance`, melainkan meledak di posisi terakhir A (`last_known_position`) atau menghilang dengan aman (`queue_free()`).
2. **Damage terhadap Armor Lebih Tinggi dari Serangan (`Laser Lv.1 vs Demon King`):** `Laser Tower` Lv.1 memiliki damage `15`, sedangkan `Demon King` memiliki armor `20`. Fungsi `calculate_final_damage(15.0, 20.0, false)` wajib mengembalikan `1.0` (bukan `-5.0` yang justru menyembuhkan Boss, dan bukan `0.0`).
3. **Penumpukan Efek Freeze (`Slow Stacking Exploit`):** Jika 3 `Freeze Tower` menembak musuh yang sama, kecepatan musuh tidak boleh menjadi $0.6^3 = 21.6\%$ atau negatif/berhenti permanen, melainkan me-*refresh* durasi timer `2.5` detik dan mempertahankan multiplier minimum `0.6` ($40\%$ slow).
4. **Batas Level Maksimum Tower (`Level > 3 Overflow`):** Permintaan upgrade pada tower yang sudah berada di Level `3` wajib ditolak (`can_upgrade() == false`) dan stat tidak boleh berubah melebihi Level `3`.
5. **Kandidat Target Kosong atau Mengandung Node Invalid di Dalam Range:** Fungsi pemilih target (`select_target`) yang menerima array kandidat kosong atau berisi referensi `null` / musuh dengan `current_hp <= 0` wajib mengembalikan `null` dengan aman tanpa *division by zero* atau *null pointer dereference*.

---

## 3. Arsitektur Struktur File (Khusus Bagian Yusuf)

Seluruh file milik Yusuf diisolasi secara rapi di dalam namespace direktori `res://src/combat/` dan `res://tests/combat/` agar tidak pernah bentrok (merge conflict) dengan file milik Zulfan, Abiyu, atau Nur:

```text
res://
├── src/
│   └── combat/                              # [ROOT MODUL YUSUF - TOWER & COMBAT]
│       ├── math/
│       │   └── combat_math.gd               # Pure functions: jarak 3D, matriks rotasi, damage, armor, scaling level
│       ├── resources/
│       │   ├── tower_stats_data.gd          # Class Resource definisi stat Tower (Laser, Cannon, Freeze, ArmorPen)
│       │   ├── enemy_combat_data.gd         # Class Resource definisi HP, Armor, Speed, Reward Enemy
│       │   └── presets/                     # File .tres untuk ke-4 Tower & ke-4 Enemy
│       ├── components/
│       │   ├── combat_target_component.gd   # Komponen/Adapter HP, Armor, Slow Debuff yang ditempel ke Enemy Abiyu
│       │   └── target_selector.gd           # Pure logic pemilihan target: Front Most, Lowest HP, Closest
│       ├── graphics/
│       │   ├── procedural_mesh_builder.gd   # ArrayMesh (VAO/VBO, Triangulasi, Winding Order, Vertex Color) untuk Range Ring & AoE Disc
│       │   └── laser_beam_renderer.gd       # ImmediateMesh (glBegin/glEnd style) untuk garis/pita sinar Laser Tower
│       ├── shaders/
│       │   ├── range_ring_blend.gdshader    # Shader Alpha Blending & Vertex Color Interpolation (Topik 2, 5, RPS 8)
│       │   ├── laser_beam_scroll.gdshader   # Shader UV Texture Scrolling & Additive Blending (Topik 8, 9, RPS 2, 4, 8)
│       │   └── freeze_crystal_phong.gdshader# Shader Phong Specular/Fresnel Lighting untuk efek Freeze & Muzzle (Topik 8, RPS 6)
│       ├── projectiles/
│       │   └── projectile_3d.gd             # Pergerakan vektor 3D proyektil (delta time), deteksi tabrakan, & AoE trigger
│       ├── towers/
│       │   └── tower_3d.gd                  # Controller utama Tower3D (rotasi kepala Basis 3D, cooldown, klik mouse raycast, state level)
│       └── sandbox/
│           ├── mock_enemy_3d.gd             # Dummy enemy pengikut jalur untuk mengetes Tower tanpa menunggu kode Abiyu
│           └── combat_sandbox.tscn          # Scene pengujian mandiri bagian Yusuf (100% terisolasi)
└── tests/
    └── combat/
        └── test_combat_system.gd            # Suite pengujian otomatis (TDD) untuk seluruh matematika & logika combat Yusuf
```

---

## 4. Tahapan Eksekusi Task-by-Task (TDD & Goal-Driven Roadmap)

### Task 1: Fondasi Matematika Grafika & Combat (`CombatMath`)
**Tujuan:** Mengimplementasikan seluruh rumus matematika murni (jarak Euclidean 3D, scaling level tower, kalkulasi damage armor,scaling HP musuh per wave, dan rotasi yaw/pitch matriks `Basis` 3D) beserta unit test-nya.

**Files:**
- Create: `res://src/combat/math/combat_math.gd`
- Test: `res://tests/combat/test_combat_system.gd`

**Interfaces:**
- Consumes: Input numerik (`Vector3`, `float`, `int`, `bool`)
- Produces (`class_name CombatMath`):
  - `const UNIT_SCALE: float = 0.1`
  - `static func distance_3d(a: Vector3, b: Vector3) -> float`
  - `static func is_in_range_3d(tower_pos: Vector3, enemy_pos: Vector3, range_meters: float) -> bool`
  - `static func get_scaled_damage(base_damage: float, level: int) -> float`
  - `static func get_scaled_range_meters(base_range_gdd: float, level: int) -> float`
  - `static func calculate_final_damage(raw_damage: float, target_armor: float, ignore_armor: bool) -> float`
  - `static func calculate_enemy_wave_hp(base_hp: int, wave_number: int) -> int`
  - `static func calculate_upgrade_cost(base_cost: int, current_level: int) -> int`
  - `static func calculate_sell_refund(total_invested: int) -> int`
  - `static func compute_turret_look_basis(turret_pos: Vector3, target_pos: Vector3) -> Basis`

- [ ] **Step 1: Tulis failing test di `res://tests/combat/test_combat_system.gd` untuk seluruh invarian matematika**
  - Uji jarak 3D antara `Vector3(0, 0, 0)` dan `Vector3(3, 4, 12)` menghasilkan `13.0`.
  - Uji `Laser Tower` Lv.1 (`15.0` dmg) vs `Demon King` (`20.0` armor, `ignore_armor = false`) menghasilkan `1.0` dmg.
  - Uji `Armor Pen Tower` Lv.1 (`25.0` dmg) vs `Demon King` (`20.0` armor, `ignore_armor = true`) menghasilkan `25.0` dmg.
  - Uji scaling level 1, 2, 3 (`+25%` damage, `+10%` range) dan penolakan/clamping di atas level 3.
  - Uji scaling HP Wave 5 untuk `Goblin` ($\lceil 100 \times 1.25^4 \rceil = 245$).
- [ ] **Step 2: Jalankan test headless (`godot --headless -s res://tests/combat/test_combat_system.gd`) untuk memverifikasi kegagalan awal (RED)**
- [ ] **Step 3: Implementasikan `CombatMath` di `res://src/combat/math/combat_math.gd` lengkap dengan komentar referensi kurikulum (Topik 1 & 4 Sumanta Guha)**
- [ ] **Step 4: Jalankan test kembali dan pastikan 100% PASS (GREEN) + jalankan `gdlint`**
- [ ] **Step 5: Commit (`feat(combat): add pure 3D graphics & combat math functions with unit tests`)**

---

### Task 2: Data-Driven Resources (`TowerStatsData` & `EnemyCombatData`)
**Tujuan:** Memisahkan data konfigurasi GDD Tabel 5 & Tabel 6 dari script logika menggunakan custom `Resource` Godot 4 agar bersih dari *magic numbers*.

**Files:**
- Create: `res://src/combat/resources/tower_stats_data.gd`
- Create: `res://src/combat/resources/enemy_combat_data.gd`
- Modify: `res://tests/combat/test_combat_system.gd`

**Interfaces:**
- Produces:
  - `class_name TowerStatsData extends Resource` (properti `@export`: `tower_type`, `display_name`, `base_damage`, `base_range_gdd`, `fire_rate_sec`, `base_cost`, `aoe_radius_gdd`, `slow_ratio`, `slow_duration_sec`, `ignores_armor`)
  - `class_name EnemyCombatData extends Resource` (properti `@export`: `enemy_id`, `display_name`, `base_hp`, `speed_gdd`, `armor`, `gold_reward`)

- [ ] **Step 1: Tambahkan test validasi inisialisasi ke-4 preset Tower dan ke-4 preset Enemy di `test_combat_system.gd`**
- [ ] **Step 2: Implementasikan `TowerStatsData` dan `EnemyCombatData` beserta factory helper statis (`create_laser_preset()`, dll.) agar bisa diuji baik lewat `.tres` maupun kode murni**
- [ ] **Step 3: Verifikasi test PASS dan bebas warning static typing**
- [ ] **Step 4: Commit (`feat(combat): add TowerStatsData and EnemyCombatData resource definitions`)**

---

### Task 3: Komponen Target Musuh & Sistem Seleksi Target (`CombatTargetComponent` & `TargetSelector`)
**Tujuan:** Membangun komponen kesehatan, armor, dan status *slow* (`Freeze`) yang dapat ditempel secara *plug-and-play* ke node musuh buatan Abiyu, serta algoritma pemilihan target (`FRONT_MOST`, `LOWEST_HP`, `CLOSEST`).

**Files:**
- Create: `res://src/combat/components/combat_target_component.gd`
- Create: `res://src/combat/components/target_selector.gd`
- Modify: `res://tests/combat/test_combat_system.gd`

**Interfaces:**
- Consumes: `CombatMath`, `EnemyCombatData`
- Produces:
  - `class_name CombatTargetComponent extends Node3D`:
    - `signal health_changed(current_hp: float, max_hp: float)`
    - `signal target_defeated(reward_gold: int, world_position: Vector3)`
    - `signal speed_multiplier_changed(multiplier: float)`
    - `func apply_combat_hit(raw_damage: float, ignore_armor: bool, slow_ratio: float, slow_duration: float) -> float`
    - `func get_effective_speed() -> float`
  - `class_name TargetSelector extends RefCounted`:
    - `enum Mode { FRONT_MOST, LOWEST_HP, CLOSEST }`
    - `static func select_target(tower_pos: Vector3, range_meters: float, candidates: Array[CombatTargetComponent], mode: Mode) -> CombatTargetComponent`

- [ ] **Step 1: Tulis failing test untuk: (a) pemilihan `FRONT_MOST` (progress waypoint tertinggi), `LOWEST_HP`, dan `CLOSEST`; (b) mengabaikan kandidat di luar jangkauan atau yang sudah mati (`current_hp <= 0`); (c) efek `Freeze` (`40%` slow selama `2.5s`) yang tidak menumpuk di bawah `0.6x` dan pulih otomatis setelah durasi habis**
- [ ] **Step 2: Implementasikan `CombatTargetComponent` dan `TargetSelector` dengan komentar referensi kontrak tim (Abiyu & Nur)**
- [ ] **Step 3: Jalankan test dan verifikasi PASS**
- [ ] **Step 4: Commit (`feat(combat): implement CombatTargetComponent and 3-mode TargetSelector`)**

---

### Task 4: Geometri Prosedural OpenGL-Style di Godot 4 (`ArrayMesh` VAO/VBO & `ImmediateMesh` Primitives)
**Tujuan:** Mewujudkan **Topik 2, 3, 5, 6, 7 Sumanta Guha** (*Primitives, Curved Object, Vertex Array/VBO, Convexity & Interpolation, Triangulation & Orientation, Modeling*) secara langsung dan alami pada fitur visual `Tower & Combat System`.

**Files:**
- Create: `res://src/combat/graphics/procedural_mesh_builder.gd`
- Create: `res://src/combat/graphics/laser_beam_renderer.gd`
- Modify: `res://tests/combat/test_combat_system.gd`

**Interfaces:**
- Produces:
  - `class_name ProceduralMeshBuilder`:
    - `static func build_range_ring_mesh(inner_radius: float, outer_radius: float, segments: int, inner_color: Color, outer_color: Color) -> ArrayMesh`
      *(Membangun cincin 3D melingkar di bidang XZ menggunakan **Vertex Array, Normal Array, UV Array, Vertex Color Array untuk Barycentric/Linear Interpolation, dan Index Buffer Triangulasi dengan Winding Order Counter-Clockwise/Clockwise yang konsisten**).*
    - `static func build_aoe_shockwave_disc(radius: float, segments: int, center_color: Color, edge_color: Color) -> ArrayMesh`
  - `class_name LaserBeamRenderer extends MeshInstance3D`:
    - `func draw_beam_from_to(local_start: Vector3, local_end: Vector3, beam_width: float, color: Color) -> void`
      *(Menggunakan `ImmediateMesh` — padanan modern `glBegin(GL_TRIANGLE_STRIP)` / `glEnd()` — untuk menggambar sinar laser dinamis real-time dari moncong menara ke titik pusat musuh).*

- [ ] **Step 1: Tulis test untuk memverifikasi bahwa `build_range_ring_mesh()` menghasilkan `ArrayMesh` dengan jumlah surface `1`, jumlah vertex `(segments + 1) * 2`, dan jumlah indeks segitiga `segments * 6` (2 segitiga per segmen quad)**
- [ ] **Step 2: Implementasikan `ProceduralMeshBuilder` dan `LaserBeamRenderer` lengkap dengan penjelasan teori OpenGL $\leftrightarrow$ Vulkan di blok komentar fungsi**
- [ ] **Step 3: Jalankan test dan pastikan PASS**
- [ ] **Step 4: Commit (`feat(graphics): add ArrayMesh VBO triangulation builder and ImmediateMesh laser renderer`)**

---

### Task 5: Programmable Pipeline Shaders (`.gdshader` untuk Lighting, Texture, & Blending)
**Tujuan:** Mewujudkan **CPMK-2 (Programmable Pipeline / Shader)** serta **Topik 8 & 9 Sumanta Guha + Bahan Kajian RPS 2, 4, 6, 7, 8** (*Shading Language, Color & Light, Texture Mapping, Blending, Shadow Mapping*) melalui 3 custom shader `.gdshader` yang dipakai langsung oleh Tower, Proyektil, dan Efek Freeze.

**Files:**
- Create: `res://src/combat/shaders/range_ring_blend.gdshader`
- Create: `res://src/combat/shaders/laser_beam_scroll.gdshader`
- Create: `res://src/combat/shaders/freeze_crystal_phong.gdshader`

**Interfaces:**
- `range_ring_blend.gdshader`: `shader_type spatial; render_mode blend_mix, depth_draw_opaque, cull_disabled, unshaded;` — membaca `COLOR` hasil interpolasi vertex `ArrayMesh` dan menghasilkan gradasi alpha transparan pada indikator jangkauan menara.
- `laser_beam_scroll.gdshader`: `shader_type spatial; render_mode blend_add, cull_disabled, unshaded;` — menerapkan *UV Texture Mapping & Animasi Pergeseran UV (`TIME * scroll_speed`)* serta *Additive Blending* untuk sinar `Laser Tower`.
- `freeze_crystal_phong.gdshader`: `shader_type spatial;` — menerapkan model pencahayaan *Ambient + Lambertian Diffuse + Blinn-Phong Specular + Fresnel Rim Emission* di fungsi `vertex()`, `fragment()`, dan `light()` untuk efek pembekuan musuh (`Freeze Tower`) dan material inti menara (mendukung *Shadow Mapping* lampu 3D).

- [ ] **Step 1: Tulis ketiga file `.gdshader` dengan komentar tahapan pipeline (`vertex()` $\rightarrow$ rasterisasi/interpolasi $\rightarrow$ `fragment()` $\rightarrow$ `light()`)**
- [ ] **Step 2: Buat test pemuatan shader (`ResourceLoader.load(...)`) di `test_combat_system.gd` untuk memastikan tidak ada syntax error kompilasi GLSL/GDShader di Godot 4.7.2**
- [ ] **Step 3: Commit (`feat(shaders): add custom spatial shaders for blending, UV scrolling, and Phong lighting`)**

---

### Task 6: Sistem Proyektil 3D (`Projectile3D`) & Controller Menara (`Tower3D`)
**Tujuan:** Menggabungkan seluruh komponen matematika, targeting, mesh prosedural, dan shader ke dalam siklus hidup `Projectile3D` dan `Tower3D` (termasuk deteksi klik mouse via *3D Raycasting* untuk membuka menu interaksi menara dan mekanisme *Upgrade Lv. 1–3*).

**Files:**
- Create: `res://src/combat/projectiles/projectile_3d.gd`
- Create: `res://src/combat/towers/tower_3d.gd`
- Modify: `res://tests/combat/test_combat_system.gd`

**Interfaces:**
- `class_name Projectile3D extends Node3D`:
  - `signal projectile_impacted(hit_position: Vector3, is_aoe: bool)`
  - `func launch(start_pos: Vector3, target: CombatTargetComponent, stats: TowerStatsData, scaled_damage: float, all_candidates_provider: Callable) -> void`
  - `func tick_movement(delta: float) -> void` *(Menggerakkan proyektil di World Coordinates berdasarkan `delta` time; menangani kasus target sudah mati di tengah jalan; mengeksekusi single-target hit atau Cannon AoE radius `3.5m`)*
- `class_name Tower3D extends Node3D`:
  - `signal tower_selected(tower: Tower3D)` *(Dipancarkan saat kursor Mouse memilih menara via Raycast/Collision — Topik 3 Mouse & Kontrak UI Zulfan)*
  - `signal tower_fired(tower: Tower3D, target: CombatTargetComponent, scaled_damage: float)`
  - `signal tower_upgraded(tower: Tower3D, new_level: int, total_invested_gold: int)`
  - `func configure(stats: TowerStatsData) -> void`
  - `func set_targeting_mode(new_mode: TargetSelector.Mode) -> void`
  - `func can_upgrade() -> bool`
  - `func get_next_upgrade_cost() -> int`
  - `func apply_upgrade() -> bool`
  - `func get_sell_refund_gold() -> int`
  - `func set_range_indicator_visible(visible_state: bool) -> void`

- [ ] **Step 1: Tulis failing test untuk: (a) siklus tembak `Tower3D` sesuai `fire_rate_sec`; (b) rotasi kepala menara menghadap koordinat target; (c) ledakan AoE `Cannon Tower` yang melukai beberapa musuh dalam radius `3.5m`; (d) proyektil tetap aman bila target dihancurkan sebelum proyektil sampai; (e) perhitungan biaya upgrade dan refund `70%` saat `apply_upgrade()` dipanggil**
- [ ] **Step 2: Implementasikan `Projectile3D` dan `Tower3D` secara surgical dan patuhi batas panjang fungsi Karpathy**
- [ ] **Step 3: Jalankan seluruh suite test dan pastikan 100% PASS**
- [ ] **Step 4: Commit (`feat(combat): implement Projectile3D and Tower3D with AoE, upgrade, and mouse selection`)**

---

### Task 7: Sandbox Pengujian Mandiri (`MockEnemy3D` & `CombatSandbox.tscn`)
**Tujuan:** Menyediakan ruang simulasi 3D mandiri untuk menguji dan mendemonstrasikan ke-4 Tower melawan ke-4 jenis Enemy di atas jalur waypoint sederhana sebelum digabungkan dengan scene utama Abiyu, Nur, dan Zulfan.

**Files:**
- Create: `res://src/combat/sandbox/mock_enemy_3d.gd`
- Create: `res://src/combat/sandbox/combat_sandbox.gd`
- Create: `res://src/combat/sandbox/combat_sandbox.tscn`

- [ ] **Step 1: Buat `MockEnemy3D` yang menggerakkan node sepanjang array titik Waypoint $P_0 \rightarrow P_1 \rightarrow \dots \rightarrow P_k$ dengan rumus jarak 3D & kecepatan efektif dari `CombatTargetComponent`**
- [ ] **Step 2: Rakit `combat_sandbox.tscn` yang menampilkan kamera 3D (Viewing Frustum), pencahayaan `DirectionalLight3D` dengan *Shadow Mapping* aktif, dan ke-4 jenis Tower yang menyerang wave musuh secara otomatis**
- [ ] **Step 3: Verifikasi eksekusi tanpa error/warning di Godot 4.7.2 dan commit (`feat(sandbox): add standalone 3D combat verification sandbox`)**
