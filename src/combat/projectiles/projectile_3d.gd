class_name Projectile3D
extends Node3D
## Proyektil 3D untuk Cannon, Freeze, dan Armor Pen Tower (translasi berbasis delta time).
##
## [FUNGSI_MODUL]: Menggerakkan proyektil di World Coordinates menuju posisi target,
##   menangani kasus target mati di tengah jalan tanpa crash, serta mengeksekusi
##   single-target hit atau ledakan Area of Effect (AoE) + shockwave ArrayMesh.
## [REFERENSI_KURIKULUM]:
##   - Sumanta Guha Bab 2 & 4 (World Coordinates, Translasi & Animasi Delta Time)
##   - Sumanta Guha Bab 8 & 9 (Shockwave Disc Triangulation saat ledakan AoE)
## [ARAH_INTERAKSI_KODE]:
##   - Di-spawn oleh   : `Tower3D._fire_projectile()` (`res://src/combat/towers/tower_3d.gd`)
##   - Memanggil ke    : `CombatTargetComponent.apply_combat_hit()`, `CombatMath.is_in_range_3d()`,
##                       `ProceduralMeshBuilder.build_aoe_shockwave_disc()`
##   - Memancarkan     : `projectile_impacted(hit_position, is_aoe)` -> SFX Nur (`Sfx` / Audio)

## [FUNGSI]: Dipancarkan saat proyektil mengenai target atau titik terakhir target.
## [ARAH_INTERAKSI]: Didengar modul Audio Nur untuk memutar SFX benturan/ledakan.
signal projectile_impacted(hit_position: Vector3, is_aoe: bool)

## [FUNGSI]: Kecepatan gerak default proyektil dalam meter/detik.
const DEFAULT_SPEED_MPS: float = 20.0
## [FUNGSI]: Jarak minimum untuk dianggap bertabrakan dengan target (meter).
const HIT_RADIUS_METERS: float = 0.45
## [FUNGSI]: Durasi animasi memudar cincin shockwave AoE (detik).
const SHOCKWAVE_DURATION_SEC: float = 0.3

## [FUNGSI]: Kecepatan proyektil dalam meter per detik (skala 3D Godot).
@export var speed_mps: float = DEFAULT_SPEED_MPS

var _target: CombatTargetComponent = null
var _last_known_position: Vector3 = Vector3.ZERO
var _stats: TowerStatsData = null
var _scaled_damage: float = 0.0
var _candidates_provider: Callable = Callable()
var _is_active: bool = false
var _visual_mesh: MeshInstance3D = null


## [FUNGSI]: Membangun mesh bola proyektil jika belum dibuat.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	_ensure_visual()


## [FUNGSI]: Memperbarui translasi proyektil setiap frame berdasarkan delta time.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	tick_movement(delta)


## [FUNGSI]: Meluncurkan proyektil dari `start_pos` menuju `target` dengan stat menara tertentu.
## [INPUT/OUTPUT]: start_pos, target, stats, scaled_damage, all_candidates_provider -> void
## [ARAH_INTERAKSI]: Dipanggil `Tower3D._fire_projectile()`.
func launch(
	start_pos: Vector3,
	target: CombatTargetComponent,
	stats: TowerStatsData,
	scaled_damage: float,
	all_candidates_provider: Callable = Callable()
) -> void:
	global_position = start_pos
	_target = target
	_stats = stats
	_scaled_damage = scaled_damage
	_candidates_provider = all_candidates_provider
	_is_active = true
	if is_instance_valid(target):
		_last_known_position = target.global_position
	else:
		_last_known_position = start_pos
	_update_visual_color()


## [FUNGSI]: Menggerakkan proyektil satu langkah menuju posisi target (atau posisi terakhir).
## [INPUT/OUTPUT]: delta (float) -> void
## [REFERENSI_KURIKULUM]: Sumanta Guha Bab 4 (Animasi & Delta Time).
## [ARAH_INTERAKSI]: Dipanggil `_process()`; dapat dipanggil langsung oleh unit test headless.
func tick_movement(delta: float) -> void:
	if not _is_active:
		return
	if is_instance_valid(_target) and _target.is_alive():
		_last_known_position = _target.global_position
	var to_target: Vector3 = _last_known_position - global_position
	var dist: float = to_target.length()
	var step: float = speed_mps * maxf(0.0, delta)
	if dist <= maxf(HIT_RADIUS_METERS, step):
		global_position = _last_known_position
		_impact()
		return
	global_position += (to_target / dist) * step


## [FUNGSI]: Mengeksekusi dampak serangan (single-target atau AoE Cannon) dan membebaskan node.
## [INPUT/OUTPUT]: - -> void
func _impact() -> void:
	_is_active = false
	var is_aoe: bool = _stats != null and _stats.aoe_radius_gdd > 0.0
	if is_aoe:
		_apply_aoe_damage()
		_spawn_shockwave()
	elif is_instance_valid(_target) and _target.is_alive() and _stats != null:
		_target.apply_combat_hit(
			_scaled_damage,
			_stats.ignores_armor,
			_stats.slow_ratio,
			_stats.slow_duration_sec
		)
	projectile_impacted.emit(_last_known_position, is_aoe)
	queue_free()


## [FUNGSI]: Memberikan damage ke seluruh musuh hidup dalam radius AoE Cannon.
## [INPUT/OUTPUT]: - -> void
func _apply_aoe_damage() -> void:
	if _stats == null or not _candidates_provider.is_valid():
		return
	var radius_m: float = _stats.aoe_radius_gdd * CombatMath.UNIT_SCALE
	var candidates: Array = _candidates_provider.call()
	for item: Variant in candidates:
		if item is CombatTargetComponent:
			var target: CombatTargetComponent = item as CombatTargetComponent
			if is_instance_valid(target) and target.is_alive():
				if CombatMath.is_in_range_3d(_last_known_position, target.global_position, radius_m):
					target.apply_combat_hit(
						_scaled_damage,
						_stats.ignores_armor,
						_stats.slow_ratio,
						_stats.slow_duration_sec
					)


## [FUNGSI]: Membuat piringan shockwave ArrayMesh di titik ledakan dan memudarkannya via Tween.
## [INPUT/OUTPUT]: - -> void
## [REFERENSI_KURIKULUM]: Guha Bab 8-9 (Triangle Fan Disc) & RPS Bahan Kajian 8 (Alpha Blending).
func _spawn_shockwave() -> void:
	if not is_inside_tree() or _stats == null:
		return
	var radius_m: float = _stats.aoe_radius_gdd * CombatMath.UNIT_SCALE
	var disc := MeshInstance3D.new()
	var center_col := Color(_stats.accent_color.r, _stats.accent_color.g, _stats.accent_color.b, 0.75)
	var edge_col := Color(_stats.accent_color.r, _stats.accent_color.g, _stats.accent_color.b, 0.05)
	disc.mesh = ProceduralMeshBuilder.build_aoe_shockwave_disc(radius_m, 32, center_col, edge_col)
	var mat: ShaderMaterial = ProceduralMeshBuilder.make_ring_material()
	disc.material_override = mat
	disc.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	get_parent().add_child(disc)
	disc.global_position = Vector3(_last_known_position.x, 0.0, _last_known_position.z)
	var tween: Tween = disc.create_tween()
	tween.tween_method(
		func(val: float) -> void: mat.set_shader_parameter("fade", val),
		1.0, 0.0, SHOCKWAVE_DURATION_SEC
	)
	tween.tween_callback(disc.queue_free)


## [FUNGSI]: Memastikan bola proyektil 3D dengan shader Blinn-Phong siap dipakai.
## [INPUT/OUTPUT]: - -> void
func _ensure_visual() -> void:
	if _visual_mesh != null:
		return
	_visual_mesh = MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.18
	sphere.height = 0.36
	_visual_mesh.mesh = sphere
	_visual_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	add_child(_visual_mesh)
	_update_visual_color()


## [FUNGSI]: Menyesuaikan warna material proyektil dengan `accent_color` menara.
## [INPUT/OUTPUT]: - -> void
func _update_visual_color() -> void:
	if _visual_mesh == null or _stats == null:
		return
	_visual_mesh.material_override = ProceduralMeshBuilder.make_phong_material(_stats.accent_color)
