# Standar Coding GDScript 2.0, Aturan Komentar Referensi/Interaksi, & Protokol Anti-AI-Slop

> **Tujuan Dokumen:** Menetapkan aturan penulisan kode (*coding rules*) yang ketat, terstruktur, dan mudah dipelihara (*maintainable*) untuk pengerjaan proyek **CYBER DEFENSE** (khususnya modul **Tower & Combat System — Yusuf**) di **Godot Engine 4.7.2 Stable**, dengan menggabungkan **Karpathy Guidelines**, **Superpowers Methodology**, serta **Standar Terverifikasi Komunitas Open-Source IT/Godot**.

---

## 1. Mengapa "AI Slop" Terjadi di Proyek Godot 4 & Cara Mencegahnya

Berdasarkan audit komunitas pengembang Godot Engine (`godotengine/godot-docs`, `GDQuest`, dan forum r/godot), *AI Slop* pada kode GDScript umumnya memiliki 5 gejala fatal yang sering membuat proyek kuliah gagal saat integrasi tim atau saat diuji dosen:

| Gejala AI Slop di Godot 4 | Dampak Buruk pada Proyek Tim | Solusi Terverifikasi yang Wajib Diterapkan |
| :--- | :--- | :--- |
| **1. Mencampur sintaks Godot 3 & Godot 4** (`export var`, `onready var`, `KinematicBody`, `Spatial`, `yield()`) | Kode langsung gagal kompilasi (*parse error*) di Godot 4.7.2. | Wajib menggunakan anotasi **GDScript 2.0 (Godot 4)**: `@export`, `@onready`, `Node3D`, `CharacterBody3D`, `Area3D`, `await`, dan `Callable`. |
| **2. Tanpa Static Typing (*Dynamic Duck-Soup*)** (`var dmg = 15`, `func hit(e):`) | Bug salah tipe data baru ketahuan saat game crash di tengah wave; autocomplete editor mati. | Wajib **100% Strict Static Typing** pada seluruh variabel, argumen parameter, dan nilai balik (`-> void`, `-> float`, `Array[CombatTargetComponent]`). |
| **3. Hardcoded Node Paths (`get_node("../../UI/GoldLabel")`)** | Begitu Zulfan atau Abiyu menggeser struktur node di scene mereka, seluruh kode Tower langsung *Null Instance Crash*. | Wajib mematuhi prinsip **"Call Down, Signal Up"** dan **Adapter Component**. Komunikasi keluar dari Tower **hanya** boleh melalui `signal` atau referensi yang disuntikkan. |
| **4. Over-Engineering & Spekulatif (Pelanggaran Karpathy)** | Membuat 15 class abstrak, factory berlapis, atau melakukan kalkulasi berat di `_process()` setiap frame tanpa alasan. | Terapkan **Karpathy Simplicity First**: fungsi matematika murni (*pure functions*) di bawah 40 baris, pemisahan data di `Resource`, dan deteksi jarak terukur. |
| **5. Komentar Kosong atau Tanpa Konteks Arsitektur** (`# fungsi untuk nembak`) | Anggota tim lain (atau Anda sendiri saat ditanya dosen) bingung fungsi ini dipanggil dari mana, memanggil apa, dan memenuhi materi kuliah yang mana. | Wajib menggunakan **Standar Komentar 3-Lapis (`[FUNGSI]`, `[REFERENSI_KURIKULUM]`, `[ARAH_INTERAKSI]`)** menggunakan sintaks doc-comment resmi GDScript (`##`). |

---

## 2. Aturan Wajib Komentar Kode (Petunjuk Fungsi, Referensi Kurikulum, & Arah Interaksi)

Di Godot 4 (GDScript 2.0), komentar yang diawali dengan **dua tanda pagar (`##`)** adalah **Official GDScript Documentation Comment** yang otomatis muncul di *Inspector Tooltip* dan dokumentasi internal Editor Godot.

Setiap **File/Class**, **Signal**, **Variabel Export/Penting**, dan **Fungsi/Method** pada kode Anda **WAJIB** memiliki blok komentar terstruktur dengan format berikut:

### A. Template Header File / Class
```gdscript
class_name Tower3D
extends Node3D
## Controller utama untuk objek Menara Pertahanan 3D (Laser, Cannon, Freeze, Armor Pen).
##
## [FUNGSI_MODUL]:
##   Mengelola siklus hidup menara di ruang 3D: pemindaian target dalam radius,
##   transformasi rotasi kepala menara menghadap musuh, penembakan proyektil/laser,
##   serta peningkatan level (Level 1 s.d. Level 3).
## [REFERENSI_KURIKULUM]:
##   - Sumanta Guha Bab 2 & 4 (World Coordinates, 3D Transformation & Animation)
##   - Sumanta Guha Bab 3 (Vertex Array/ArrayMesh Range Ring & Mouse Picking)
##   - RPS CIF65116: CPMK-1 (Simulasi Real-Time 3D) & Bahan Kajian 5 (Transformation)
## [ARAH_INTERAKSI_KODE]:
##   - Membaca Data Dari : `TowerStatsData` (`res://src/combat/resources/tower_stats_data.gd`)
##   - Memanggil Fungsi  : `CombatMath` (`res://src/combat/math/combat_math.gd`),
##                         `TargetSelector` (`res://src/combat/components/target_selector.gd`),
##                         `ProceduralMeshBuilder` (`res://src/combat/graphics/procedural_mesh_builder.gd`)
##   - Memancarkan Sinyal: `tower_selected` -> ke UI Radial Menu (Modul Zulfan)
##                         `tower_upgraded` -> ke Economy System (Modul Nur)
##                         `tower_fired`    -> ke Audio/VFX Manager (Modul Nur)
```

### B. Template Komentar Setiap Fungsi / Method
Setiap fungsi atau method **tidak boleh ditulis tanpa blok komentar `##` di atasnya**. Wajib memuat 3 poin (`[FUNGSI]`, `[REFERENSI_KURIKULUM]`, `[ARAH_INTERAKSI]`):

```gdscript
## Menghitung damage bersih yang diterima musuh setelah dikurangi nilai Armor.
## [FUNGSI]:
##   Menerapkan rumus Flat Armor Reduction `max(1.0, raw_damage - effective_armor)`.
##   Jika `ignore_armor == true` (Armor Pen Tower), maka armor musuh dianggap 0.0.
## [REFERENSI_KURIKULUM]:
##   - GDD Bagian 4.4, 5, & 6 (Perhitungan Damage & Interaksi Armor)
##   - RPS CIF65116: CPMK-1 (Model Matematis Simulasi Interaktif)
## [ARAH_INTERAKSI]:
##   - Dipanggil oleh : `CombatTargetComponent.apply_combat_hit()` (`res://src/combat/components/combat_target_component.gd`)
##   - Memanggil ke   : Fungsi bawaan `maxf()` (Pure Function, tanpa efek samping state)
##   - Output ke      : Mengembalikan `float` nilai pengurang `current_hp` musuh.
static func calculate_final_damage(raw_damage: float, target_armor: float, ignore_armor: bool) -> float:
	var effective_armor: float = 0.0 if ignore_armor else maxf(0.0, target_armor)
	return maxf(1.0, raw_damage - effective_armor)
```

### C. Template Komentar Signal & Variabel `@export`
```gdscript
## Dipancarkan ketika pemain mengklik menara ini di ruang 3D (Mouse Picking).
## [ARAH_INTERAKSI]: Didengar oleh `TowerInteractionUI` (Modul Zulfan) untuk membuka menu Upgrade/Sell/Targeting.
signal tower_selected(tower_instance: Tower3D)

## Data spesifikasi dasar menara (Damage, Range, Fire Rate, Cost, Efek Khusus).
## [ARAH_INTERAKSI]: Diisi melalui Inspector (.tres) atau disuntikkan oleh `TowerPlacementSystem` (Modul Abiyu/Nur).
@export var stats_data: TowerStatsData
```

---

## 3. Urutan Baku Penulisan Kode GDScript (Official Godot 4 & GDQuest Standard)

Agar seluruh file `.gd` konsisten dan mudah dibaca dari atas ke bawah, setiap file wajib mengikuti urutan 15 blok berikut (hanya tulis blok yang memang dipakai):

```text
 1. @tool / @icon (jika ada)
 2. class_name <NamaClassPascalCase>
 3. extends <ClassInduk>
 4. ## Blok Doc-Comment Header Class ([FUNGSI_MODUL], [REFERENSI_KURIKULUM], [ARAH_INTERAKSI_KODE])
 5. Signals        (signal nama_signal(arg: Tipe))
 6. Enums          (enum Mode { FRONT_MOST, LOWEST_HP, CLOSEST })
 7. Constants      (const UNIT_SCALE: float = 0.1)
 8. @export Vars   (@export var stats_data: TowerStatsData)
 9. Public Vars    (var current_level: int = 1)
10. Private Vars   (var _cooldown_remaining: float = 0.0)
11. @onready Vars  (@onready var _turret_head: Node3D = $TurretHead)
12. Virtual Methods (_init, _ready, _process, _physics_process, _unhandled_input)
13. Public Methods  (func apply_upgrade() -> bool:)
14. Private Methods (func _acquire_and_fire(delta: float) -> void:)
15. Static Methods  (static func distance_3d(a: Vector3, b: Vector3) -> float:)
```

### Konvensi Penamaan Wajib:
- **Nama File & Folder:** `snake_case.gd`, `snake_case.tscn`, `snake_case.gdshader` (contoh: `combat_math.gd`, `tower_3d.gd`).
- **Nama Class & Node di Scene Tree:** `PascalCase` (contoh: `Tower3D`, `CombatTargetComponent`, `TurretHead`).
- **Nama Fungsi, Variabel Public, & Signal:** `snake_case` (contoh: `calculate_final_damage`, `target_defeated`). Signal selalu menggunakan kata kerja bentuk lampau (*past tense*, misal `tower_upgraded`, `projectile_impacted`).
- **Nama Variabel & Fungsi Private:** Diawali garis bawah `_snake_case` (contoh: `_cooldown_timer`, `_update_turret_rotation()`).
- **Nama Konstanta & Nilai Enum:** `UPPER_SNAKE_CASE` (contoh: `MAX_TOWER_LEVEL`, `UNIT_SCALE`).

---

## 4. Penerapan Disiplin Karpathy Guidelines & Superpowers pada Proyek Ini

### A. Empat Prinsip Karpathy (Konteks Godot 4 Cyber Defense)
1. **Think Before Coding (`[ASUMSI]` Eksplisit):**
   - Bila ada detail dari kode Abiyu, Nur, atau Zulfan yang belum diketahui bentuk pastinya, nyatakan kontrak asumsinya di komentar header dan bungkus di dalam **1 fungsi/komponen adapter**, jangan disebar ke seluruh baris kode.
2. **Simplicity First (Batas Kompleksitas & Baris):**
   - Satu fungsi maksimal **35–40 baris**.
   - Jika logika dapat ditulis sebagai `static func` murni di `CombatMath` atau `TargetSelector` tanpa membutuhkan `Node3D` di dalam SceneTree, **wajib ditulis sebagai fungsi statis murni**.
3. **Surgical Changes (Isolasi Direktori):**
   - Seluruh kode Yusuf berada di `res://src/combat/` dan `res://tests/combat/`.
   - Saat nantinya melakukan integrasi ke repositori tim, setiap baris pada `git diff` harus 100% berkaitan dengan `Tower & Combat System`.
4. **Goal-Driven Execution:**
   - Setiap fitur dianggap ada hanya jika sudah memiliki skenario uji di `res://tests/combat/test_combat_system.gd`.

### B. Tiga "Iron Law" Superpowers & Pemanfaatan AI Lokal (Ollama + Qwen 3.5)
1. **TDD (`@test-driven-development`):** Tulis asersi test untuk rumus/interaksi di `test_combat_system.gd` $\rightarrow$ jalankan untuk melihat gagal $\rightarrow$ tulis implementasi minimal $\rightarrow$ jalankan sampai lulus.
2. **Verification Before Completion (`@verification-before-completion`):** Dilarang mengklaim tugas selesai sebelum menjalankan perintah verifikasi dan melihat output `PASS` serta `0 errors`.
3. **Delegasi AI Lokal (`Qwen 3.5` via `ask_local_karpathy.py` pada `http://127.0.0.1:11434/v1`):**
   - Gunakan **`qwen3.5`** (`--model qwen --mode surgical-code` atau `math-verify`) saat menyusun fungsi matematika vektor 3D, rumus triangulasi vertex `ArrayMesh`, dan unit test GDScript.
   - Gunakan **`qwen3.5`** (`--model qwen --mode code-review`) untuk me-review apakah setiap fungsi sudah memiliki komentar `[FUNGSI]`, `[REFERENSI_KURIKULUM]`, dan `[ARAH_INTERAKSI]` yang lengkap serta bebas dari *AI Slop*.

---

## 5. Daftar Tools & Repositori Open-Source Terverifikasi Komunitas (Anti-AI-Slop Suite)

Berikut adalah solusi dan repositori open-source GitHub yang telah divalidasi oleh komunitas IT/Godot internasional dan dijadikan acuan arsitektur proyek ini:

1. **Official Godot GDScript Style Guide & Best Practices (`godotengine/godot-docs`)**
   - **URL:** `https://github.com/godotengine/godot-docs` (Bagian: * GDScript Style Guide* & *Godot Best Practices*)
   - **Peran Validasi:** Acuan resmi urutan deklarasi script, *static typing*, doc-comments `##`, dan manajemen scene/node.
2. **GDQuest GDScript Guidelines (`GDQuest/GDScript-guidelines`)**
   - **URL:** `https://github.com/GDQuest/GDScript-guidelines`
   - **Peran Validasi:** Standar industri komunitas Godot untuk arsitektur *Component/Resource*, *Signal Up Call Down*, dan pencegahan *spaghetti code*.
3. **GDScript Toolkit — Linter, Parser, & Formatter (`Scony/godot-gdscript-toolkit`)**
   - **URL:** `https://github.com/Scony/godot-gdscript-toolkit` (`pip3 install "gdtoolkit==4.*"`)
   - **Peran Validasi Anti-AI-Slop:** Menyediakan CLI `gdlint` (static analysis pendeteksi kode buruk/terlalu panjang), `gdformat` (pemformat otomatis berstandar resmi), dan `gdradon` (pengukur *cyclomatic complexity*).
4. **GdUnit4 / GUT — Godot 4 Unit Testing Frameworks (`MikeSchulze/gdUnit4` & `bitwes/Gut`)**
   - **URL:** `https://github.com/MikeSchulze/gdUnit4` dan `https://github.com/bitwes/Gut`
   - **Peran Validasi TDD:** Acuan pengujian otomatis untuk node 3D, sinyal, dan fungsi matematika secara *headless* di Godot 4.x.
5. **Referensi Implementasi Open-Source 3D Tower Defense di Godot 4:**
   - **`WideArchShark/godot-tower-defense`** (`https://github.com/WideArchShark/godot-tower-defense`): Referensi validasi 3D Raycasting mouse picking dan penempatan/interaksi menara 3D di Godot 4.
   - **`denise-amiga/godot-tower-defense-tutorial-3d`** (`https://github.com/denise-amiga/godot-tower-defense-tutorial-3d`): Referensi struktur *turret rotation (`look_at`/interpolation)*, *projectile homing*, dan *wave combat* 3D di Godot 4.
   - **`ape1121/Godot-4-Tower-Defense-Template`** (`https://github.com/ape1121/Godot-4-Tower-Defense-Template`): Referensi pemisahan data stat menara menggunakan `Resource` dan upgrade/sell.
