class_name GameConstants3D
extends RefCounted
## Konstanta permainan, jalur preset resource, dan komposisi wave GDD untuk mode 3D.
##
## [FUNGSI_MODUL]: Menyediakan parameter baku arena 16x10, ekonomi awal, HP Energy Core,
##   leak damage, path preset .tres menara/musuh, bonus clear wave, dan komposisi Tabel 7 GDD.
## [REFERENSI_KURIKULUM]: GDD Bagian 4.1, 5, 6, 7, 8, dan 12.

## [FUNGSI]: Jumlah kolom grid peta (sumbu X).
const GRID_COLS: int = 16
## [FUNGSI]: Jumlah baris grid peta (sumbu Z).
const GRID_ROWS: int = 10
## [FUNGSI]: Ukuran satu kotak grid dalam meter World Coordinates Godot 3D.
const CELL_SIZE_METERS: float = 2.0

## [FUNGSI]: Gold awal pemain saat memulai match baru.
const STARTING_GOLD: int = 300
## [FUNGSI]: HP awal Energy Core.
const STARTING_CORE_HP: int = 20
## [FUNGSI]: Kerusakan Energy Core saat musuh biasa lolos mencapai akhir jalur.
const REGULAR_LEAK_DAMAGE: int = 2
## [FUNGSI]: Kerusakan Energy Core saat Boss Demon King lolos mencapai akhir jalur.
const BOSS_LEAK_DAMAGE: int = 5
## [FUNGSI]: Total jumlah gelombang serangan (wave) per match.
const TOTAL_WAVES: int = 5

## [FUNGSI]: Lokasi file penyimpanan lokal rekaman skor dan pengaturan audio.
const SAVE_FILE_PATH: String = "user://cyber_defense_3d_save.cfg"

## [FUNGSI]: Peta key menara ke path resource preset `.tres` yang sudah ada.
const TOWER_PRESET_PATHS: Dictionary = {
	"laser": "res://src/combat/resources/presets/laser_tower.tres",
	"cannon": "res://src/combat/resources/presets/cannon_tower.tres",
	"freeze": "res://src/combat/resources/presets/freeze_tower.tres",
	"armor_pen": "res://src/combat/resources/presets/armor_pen_tower.tres",
}

## [FUNGSI]: Peta key musuh ke path resource preset `.tres` yang sudah ada.
const ENEMY_PRESET_PATHS: Dictionary = {
	"goblin": "res://src/combat/resources/presets/goblin.tres",
	"orc": "res://src/combat/resources/presets/orc.tres",
	"harpy": "res://src/combat/resources/presets/harpy.tres",
	"demon_king": "res://src/combat/resources/presets/demon_king.tres",
}


## [FUNGSI]: Mengembalikan path `.tres` preset menara berdasarkan key ("laser", "cannon", "freeze", "armor_pen").
## [INPUT/OUTPUT]: tower_key (String) -> String
static func get_tower_preset_path(tower_key: String) -> String:
	var key: String = tower_key.strip_edges().to_lower()
	return str(TOWER_PRESET_PATHS.get(key, ""))


## [FUNGSI]: Mengembalikan path `.tres` preset musuh berdasarkan key ("goblin", "orc", "harpy", "demon_king").
## [INPUT/OUTPUT]: enemy_key (String) -> String
static func get_enemy_preset_path(enemy_key: String) -> String:
	var key: String = enemy_key.strip_edges().to_lower()
	return str(ENEMY_PRESET_PATHS.get(key, ""))


## [FUNGSI]: Menghitung bonus Gold penyelesaian wave: 50 + floor(0.8 * N * 10) (GDD Bagian 7).
## [INPUT/OUTPUT]: wave_number (int) -> int
static func get_wave_clear_bonus(wave_number: int) -> int:
	var safe_wave: int = maxi(1, wave_number)
	return 50 + int(floor(0.8 * float(safe_wave) * 10.0))


## [FUNGSI]: Mengembalikan komposisi musuh per wave sesuai Tabel 7 GDD (Wave 1-5).
## [INPUT/OUTPUT]: wave_number (int) -> Array[Dictionary] (berisi {"enemy_id": String, "count": int})
static func get_wave_composition(wave_number: int) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	match wave_number:
		1:
			result.append({"enemy_id": "goblin", "count": 5})
		2:
			result.append({"enemy_id": "goblin", "count": 6})
			result.append({"enemy_id": "harpy", "count": 2})
		3:
			result.append({"enemy_id": "goblin", "count": 5})
			result.append({"enemy_id": "orc", "count": 3})
		4:
			result.append({"enemy_id": "goblin", "count": 4})
			result.append({"enemy_id": "orc", "count": 3})
			result.append({"enemy_id": "harpy", "count": 3})
		5:
			result.append({"enemy_id": "demon_king", "count": 1})
			result.append({"enemy_id": "orc", "count": 4})
			result.append({"enemy_id": "harpy", "count": 4})
		_:
			pass
	return result
