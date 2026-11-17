extends Node3D
## Scene pengujian mandiri 3D (Combat Sandbox) untuk memverifikasi seluruh modul Yusuf.
##
## [FUNGSI_MODUL]: Menampilkan arena 3D dengan 4 menara (Laser, Cannon, Freeze, Armor Pen),
##   pencahayaan DirectionalLight3D (Shadow Mapping), serta spawn berkala ke-4 jenis musuh
##   (Goblin, Orc, Harpy, Demon King) tanpa bergantung pada kode tim lain.
## [REFERENSI_KURIKULUM]:
##   - Sumanta Guha Bab 2..12 & RPS CIF65116 (World Coordinates, Projection, VBO, Shading, Shadow, Blend)
## [ARAH_INTERAKSI_KODE]: Mengorkestrasi `Tower3D`, `TowerStatsData` presets, dan `MockEnemy3D`.

const LASER_PRESET: TowerStatsData = preload("res://src/combat/resources/presets/laser_tower.tres")
const CANNON_PRESET: TowerStatsData = preload("res://src/combat/resources/presets/cannon_tower.tres")
const FREEZE_PRESET: TowerStatsData = preload("res://src/combat/resources/presets/freeze_tower.tres")
const ARMOR_PEN_PRESET: TowerStatsData = preload("res://src/combat/resources/presets/armor_pen_tower.tres")

const GOBLIN_PRESET: EnemyCombatData = preload("res://src/combat/resources/presets/goblin.tres")
const ORC_PRESET: EnemyCombatData = preload("res://src/combat/resources/presets/orc.tres")
const HARPY_PRESET: EnemyCombatData = preload("res://src/combat/resources/presets/harpy.tres")
const DEMON_KING_PRESET: EnemyCombatData = preload("res://src/combat/resources/presets/demon_king.tres")

var _waypoints: Array[Vector3] = [
	Vector3(-14.0, 0.0, -4.0),
	Vector3(-4.0, 0.0, -4.0),
	Vector3(-4.0, 0.0, 4.0),
	Vector3(6.0, 0.0, 4.0),
	Vector3(14.0, 0.0, 0.0),
]
var _spawn_timer: float = 0.0
var _spawn_index: int = 0
var _selected_tower: Tower3D = null


## [FUNGSI]: Membangun lantai, jalur visual, dan menempatkan ke-4 jenis Tower3D di arena.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	_spawn_tower(LASER_PRESET, Vector3(-9.0, 0.0, -0.5), true)
	_spawn_tower(CANNON_PRESET, Vector3(-1.0, 0.0, 0.0), false)
	_spawn_tower(FREEZE_PRESET, Vector3(2.0, 0.0, 7.5), false)
	_spawn_tower(ARMOR_PEN_PRESET, Vector3(9.5, 0.0, -2.5), false)
	_spawn_next_enemy()


## [FUNGSI]: Melakukan spawn musuh uji bergantian setiap 2.2 detik.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	_spawn_timer += delta
	if _spawn_timer >= 2.2:
		_spawn_timer = 0.0
		_spawn_next_enemy()


## [FUNGSI]: Membuat satu `Tower3D` pada posisi tertentu dan menghubungkan sinyal seleksinya.
## [INPUT/OUTPUT]: preset (TowerStatsData), pos (Vector3), show_ring (bool) -> void
func _spawn_tower(preset: TowerStatsData, pos: Vector3, show_ring: bool) -> void:
	var tower := Tower3D.new()
	tower.stats_data = preset
	tower.show_range_on_ready = show_ring
	tower.position = pos
	tower.tower_selected.connect(_on_tower_selected)
	add_child(tower)
	if show_ring:
		_selected_tower = tower


## [FUNGSI]: Memunculkan satu `MockEnemy3D` secara bergilir (Goblin, Orc, Harpy, Demon King).
## [INPUT/OUTPUT]: - -> void
func _spawn_next_enemy() -> void:
	var presets: Array[EnemyCombatData] = [GOBLIN_PRESET, ORC_PRESET, HARPY_PRESET, DEMON_KING_PRESET]
	var colors: Array[Color] = [
		Color(0.3, 0.85, 0.35),
		Color(0.65, 0.55, 0.35),
		Color(0.85, 0.45, 0.85),
		Color(0.9, 0.15, 0.2),
	]
	var idx: int = _spawn_index % presets.size()
	_spawn_index += 1
	var enemy := MockEnemy3D.new()
	add_child(enemy)
	enemy.setup(presets[idx], 1, _waypoints, colors[idx])


## [FUNGSI]: Memindahkan tampilan cincin jangkauan ke menara yang baru diklik mouse.
## [INPUT/OUTPUT]: tower (Tower3D) -> void
func _on_tower_selected(tower: Tower3D) -> void:
	if is_instance_valid(_selected_tower) and _selected_tower != tower:
		_selected_tower.set_range_indicator_visible(false)
	_selected_tower = tower
	print("Tower dipilih: %s" % [tower.get_ui_summary()])
