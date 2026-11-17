class_name EnemyCombatData
extends Resource
## Data combat satu jenis musuh (GDD Tabel 6): HP, kecepatan, armor, reward.
##
## [REFERENSI_KURIKULUM]: AGENTS.md §4.3 (Pemisahan Data & Logika); GDD Bagian 6.
## [ARAH_INTERAKSI_KODE]: Dibaca `CombatTargetComponent`. Preset: `resources/presets/*.tres`.
##   Pergerakan musuh tetap milik modul Abiyu; data ini hanya untuk sisi combat.

## [FUNGSI]: Nama tampilan musuh.
@export var display_name: String = ""
## [FUNGSI]: HP dasar wave 1 (di-scale `CombatMath.calculate_enemy_wave_hp()`).
@export var base_hp: int = 1
## [FUNGSI]: Kecepatan dalam satuan GDD (dikali `CombatMath.UNIT_SCALE` -> m/s).
@export var speed_gdd: float = 0.0
## [FUNGSI]: Armor datar pengurang damage (`CombatMath.calculate_final_damage()`).
@export var armor: float = 0.0
## [FUNGSI]: Gold yang dikirim lewat sinyal `target_defeated` ke Economy Nur.
@export var gold_reward: int = 0
