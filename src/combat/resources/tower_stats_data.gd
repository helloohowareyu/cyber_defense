class_name TowerStatsData
extends Resource
## Data spesifikasi dasar satu jenis menara (GDD Tabel 5), dipisah dari logika node.
##
## [REFERENSI_KURIKULUM]: AGENTS.md §4.3 (Pemisahan Data & Logika); GDD Bagian 5.
## [ARAH_INTERAKSI_KODE]: Dibaca `Tower3D` & `Projectile3D`. Preset: `resources/presets/*.tres`.

## [FUNGSI]: Jenis menara; LASER = hit instan + beam, lainnya = proyektil.
enum TowerType { LASER, CANNON, FREEZE, ARMOR_PEN }

## [FUNGSI]: Jenis menara (menentukan cara serang di `Tower3D._fire()`).
@export var tower_type: TowerType = TowerType.LASER
## [FUNGSI]: Nama tampilan untuk UI Zulfan (`Tower3D.get_ui_summary()`).
@export var display_name: String = ""
## [FUNGSI]: Damage Level 1 sebelum scaling (`CombatMath.get_scaled_damage()`).
@export var base_damage: float = 0.0
## [FUNGSI]: Jangkauan Level 1 dalam satuan GDD (dikali `CombatMath.UNIT_SCALE` -> meter).
@export var base_range_gdd: float = 0.0
## [FUNGSI]: Jeda antar tembakan (detik).
@export var fire_rate_sec: float = 1.0
## [FUNGSI]: Harga beli awal (Gold); basis rumus upgrade & refund.
@export var base_cost: int = 0
## [FUNGSI]: Radius ledakan AoE dalam satuan GDD; 0 = single target.
@export var aoe_radius_gdd: float = 0.0
## [FUNGSI]: Rasio perlambatan (0.4 = 40% slow); 0 = tanpa slow.
@export var slow_ratio: float = 0.0
## [FUNGSI]: Durasi efek slow (detik).
@export var slow_duration_sec: float = 0.0
## [FUNGSI]: True = mengabaikan 100% armor musuh (Armor Pen Tower).
@export var ignores_armor: bool = false
## [FUNGSI]: Warna aksen visual (kepala turret, proyektil, range ring, beam).
@export var accent_color: Color = Color.WHITE
