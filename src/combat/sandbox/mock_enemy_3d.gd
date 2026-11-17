class_name MockEnemy3D
extends Node3D
## Dummy enemy 3D untuk menguji modul Tower & Combat sebelum integrasi dengan kode Abiyu.
##
## [FUNGSI_MODUL]: Menggerakkan model kapsul 3D sepanjang daftar waypoint [P0, P1, ..., Pn]
##   menggunakan kecepatan efektif dari `CombatTargetComponent` (termasuk efek slow Freeze).
## [REFERENSI_KURIKULUM]: Sumanta Guha Bab 2 & 4 (World Coordinates, Translasi & Delta Time),
##   GDD Bagian 4.2 (Waypoint-Based Movement).
## [ARAH_INTERAKSI_KODE]:
##   - Memiliki child : `CombatTargetComponent` (`res://src/combat/components/combat_target_component.gd`)
##   - Dipanggil oleh : `CombatSandbox` (`res://src/combat/sandbox/combat_sandbox.gd`)

## [FUNGSI]: Dipancarkan saat dummy musuh mencapai ujung jalur (Energy Core).
signal reached_end(enemy: MockEnemy3D)

var _waypoints: Array[Vector3] = []
var _waypoint_index: int = 0
var _target_component: CombatTargetComponent = null
var _body_mesh: MeshInstance3D = null


## [FUNGSI]: Menginisialisasi data musuh, wave, jalur waypoint, dan visual kapsul 3D.
## [INPUT/OUTPUT]: enemy_data (EnemyCombatData), wave (int), waypoints (Array[Vector3]), color (Color) -> void
## [ARAH_INTERAKSI]: Dipanggil `CombatSandbox._spawn_next_enemy()`.
func setup(
	enemy_data: EnemyCombatData,
	wave: int,
	waypoints: Array[Vector3],
	body_color: Color = Color(0.85, 0.3, 0.3)
) -> void:
	_waypoints = waypoints
	_waypoint_index = 1 if waypoints.size() > 1 else 0
	if not waypoints.is_empty():
		global_position = waypoints[0]

	_body_mesh = MeshInstance3D.new()
	var capsule := CapsuleMesh.new()
	capsule.radius = 0.35
	capsule.height = 1.1
	_body_mesh.mesh = capsule
	_body_mesh.position = Vector3(0.0, 0.55, 0.0)
	_body_mesh.material_override = ProceduralMeshBuilder.make_phong_material(body_color)
	_body_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	add_child(_body_mesh)

	_target_component = CombatTargetComponent.new()
	_target_component.name = "CombatTargetComponent"
	_target_component.combat_data = enemy_data
	_target_component.wave_number = wave
	_target_component.target_defeated.connect(_on_target_defeated)
	add_child(_target_component)
	_target_component.initialize_for_wave(wave)


## [FUNGSI]: Memperbarui posisi musuh sepanjang waypoint berdasarkan delta time dan kecepatan efektif.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	if _target_component == null or not _target_component.is_alive():
		return
	if _waypoint_index >= _waypoints.size():
		return
	var dest: Vector3 = _waypoints[_waypoint_index]
	var to_dest: Vector3 = dest - global_position
	var dist: float = to_dest.length()
	var step: float = _target_component.get_effective_speed_mps() * maxf(0.0, delta)
	if dist <= step:
		global_position = dest
		_target_component.path_progress += dist
		_waypoint_index += 1
		if _waypoint_index >= _waypoints.size():
			reached_end.emit(self)
			queue_free()
		return
	global_position += (to_dest / dist) * step
	_target_component.path_progress += step


## [FUNGSI]: Menghapus node dummy musuh saat HP mencapai 0.
## [INPUT/OUTPUT]: _reward_gold (int), _world_pos (Vector3) -> void
func _on_target_defeated(_reward_gold: int, _world_pos: Vector3) -> void:
	queue_free()
