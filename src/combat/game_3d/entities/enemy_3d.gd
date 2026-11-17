class_name Enemy3D
extends Node3D
## Entitas musuh 3D produksi dengan mesh prosedural per tipe, health bar 3D, dan CombatTargetComponent.
##
## [FUNGSI_MODUL]: Membungkus `CombatTargetComponent` di posisi lokal (0,0,0), menggerakkan
##   musuh sepanjang waypoint menggunakan `get_effective_speed_mps() * delta`, memutar model
##   secara halus mengikuti arah gerak, menampilkan health bar 3D (berubah cyan saat terkena slow),
##   dan memancarkan sinyal `reached_core` atau `defeated` sebelum memanggil `queue_free()`.
## [REFERENSI_KURIKULUM]: Guha Bab 2, 4, 10 (hierarchical 3D models & delta-time motion),
##   Bab 11 (Blinn-Phong); GDD Bagian 4.2 & 6.

## [FUNGSI]: Dipancarkan saat musuh berhasil mencapai Energy Core di akhir jalur.
signal reached_core(enemy: Enemy3D, leak_damage: int)
## [FUNGSI]: Dipancarkan saat HP musuh mencapai 0 oleh serangan menara.
signal defeated(enemy: Enemy3D, reward_gold: int, world_pos: Vector3, is_boss: bool)

## [FUNGSI]: Kecepatan interpolasi rotasi arah hadap musuh (radian per detik).
const TURN_SPEED_RAD: float = 10.0

## [FUNGSI]: Shader inline billboard untuk health bar 3D (aman di mode headless).
const HP_BAR_SHADER_CODE: String = """
shader_type spatial;
render_mode unshaded, cull_disabled, shadows_disabled;

uniform float hp_ratio : hint_range(0.0, 1.0) = 1.0;
uniform vec4 fill_color : source_color = vec4(0.2, 0.95, 0.45, 1.0);
uniform vec4 bg_color : source_color = vec4(0.08, 0.1, 0.14, 0.9);

void vertex() {
	MODELVIEW_MATRIX = VIEW_MATRIX * mat4(
		INV_VIEW_MATRIX[0],
		INV_VIEW_MATRIX[1],
		INV_VIEW_MATRIX[2],
		MODEL_MATRIX[3]
	);
}

void fragment() {
	bool is_border = UV.x < 0.025 || UV.x > 0.975 || UV.y < 0.12 || UV.y > 0.88;
	if (is_border) {
		ALBEDO = vec3(0.04, 0.06, 0.09);
	} else if (UV.x <= hp_ratio) {
		ALBEDO = fill_color.rgb;
	} else {
		ALBEDO = bg_color.rgb;
	}
}
"""

var _enemy_id: String = "goblin"
var _waypoints: Array[Vector3] = []
var _waypoint_index: int = 0
var _finished: bool = false
var _bob_time: float = 0.0
var _is_slowed: bool = false
var _hp_ratio: float = 1.0

var _target_component: CombatTargetComponent = null
var _visual_root: Node3D = null
var _hp_bar_mesh: MeshInstance3D = null
var _hp_bar_material: ShaderMaterial = null


## [FUNGSI]: Menyiapkan tipe musuh, stat wave, jalur waypoint, model 3D, health bar, dan CombatTargetComponent.
## [INPUT/OUTPUT]: enemy_id_key (String), data (EnemyCombatData), wave (int), waypoints (Array[Vector3]) -> void
func setup(
	enemy_id_key: String,
	data: EnemyCombatData,
	wave: int,
	waypoints: Array[Vector3]
) -> void:
	_enemy_id = enemy_id_key.strip_edges().to_lower()
	_waypoints = waypoints.duplicate()
	_finished = false
	_waypoint_index = 1 if _waypoints.size() > 1 else 0
	if not _waypoints.is_empty():
		if is_inside_tree():
			global_position = _waypoints[0]
		else:
			position = _waypoints[0]

	var safe_data: EnemyCombatData = data
	if safe_data == null:
		safe_data = EnemyCombatData.new()
		safe_data.display_name = _enemy_id.capitalize()
		safe_data.base_hp = 100
		safe_data.speed_gdd = 80.0
		safe_data.armor = 0.0
		safe_data.gold_reward = 15

	_build_visual_root()
	_build_hp_bar()

	_target_component = CombatTargetComponent.new()
	_target_component.name = "CombatTargetComponent"
	_target_component.position = Vector3.ZERO
	_target_component.combat_data = safe_data
	_target_component.wave_number = wave
	_target_component.frost_radius = 1.0 if is_boss_enemy() else (0.55 if _enemy_id == "orc" else 0.45)

	_target_component.health_changed.connect(_on_health_changed)
	_target_component.target_defeated.connect(_on_target_defeated)
	_target_component.speed_multiplier_changed.connect(_on_speed_multiplier_changed)

	add_child(_target_component)
	_target_component.initialize_for_wave(wave)

	if _waypoints.size() > 1 and _visual_root != null:
		_visual_root.basis = CombatMath.compute_turret_look_basis(_waypoints[0], _waypoints[1])


## [FUNGSI]: Memperbarui pergerakan sepanjang waypoint, rotasi halus, dan animasi hover per frame.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	if _finished or _target_component == null or not _target_component.is_alive():
		return
	if not _waypoints.is_empty():
		var last_wp: Vector3 = _waypoints[_waypoints.size() - 1]
		if global_position.distance_to(last_wp) <= 1.5:
			_reach_core()
			return
	var dt: float = maxf(0.0, delta)
	_bob_time += dt
	if _enemy_id == "harpy" and _visual_root != null:
		_visual_root.position.y = sin(_bob_time * 5.0) * 0.12

	if _waypoint_index >= _waypoints.size():
		return

	var dest: Vector3 = _waypoints[_waypoint_index]
	var to_dest: Vector3 = dest - global_position
	var dist: float = to_dest.length()
	var step: float = _target_component.get_effective_speed_mps() * dt

	if dist > 0.001 and _visual_root != null:
		var target_basis: Basis = CombatMath.compute_turret_look_basis(global_position, dest)
		var q_current: Quaternion = _visual_root.basis.get_rotation_quaternion()
		var q_target: Quaternion = target_basis.get_rotation_quaternion()
		_visual_root.basis = Basis(q_current.slerp(q_target, minf(1.0, TURN_SPEED_RAD * dt)))

	if dist <= step:
		global_position = dest
		_target_component.path_progress += dist
		_waypoint_index += 1
		if _waypoint_index >= _waypoints.size():
			_reach_core()
		return

	if dist > 0.0001:
		global_position += (to_dest / dist) * step
		_target_component.path_progress += step


## [FUNGSI]: Mengembalikan referensi node child CombatTargetComponent milik musuh ini.
## [INPUT/OUTPUT]: - -> CombatTargetComponent
func get_target_component() -> CombatTargetComponent:
	return _target_component


## [FUNGSI]: Mengembalikan key identitas tipe musuh ("goblin", "orc", "harpy", "demon_king").
## [INPUT/OUTPUT]: - -> String
func get_enemy_id() -> String:
	return _enemy_id


## [FUNGSI]: Mengembalikan true jika entitas ini adalah Boss Demon King.
## [INPUT/OUTPUT]: - -> bool
func is_boss_enemy() -> bool:
	return _enemy_id == "demon_king"


## [FUNGSI]: Menangani kondisi musuh mencapai Energy Core; emit sinyal sekali lalu hapus node.
## [INPUT/OUTPUT]: - -> void
func _reach_core() -> void:
	if _finished:
		return
	_finished = true
	var leak_dmg: int = (
		GameConstants3D.BOSS_LEAK_DAMAGE if is_boss_enemy()
		else GameConstants3D.REGULAR_LEAK_DAMAGE
	)
	reached_core.emit(self, leak_dmg)
	queue_free()


## [FUNGSI]: Menangani sinyal kematian dari CombatTargetComponent; emit `defeated` lalu hapus node.
## [INPUT/OUTPUT]: reward_gold (int), world_pos (Vector3) -> void
func _on_target_defeated(reward_gold: int, world_pos: Vector3) -> void:
	if _finished:
		return
	_finished = true
	defeated.emit(self, reward_gold, world_pos, is_boss_enemy())
	queue_free()


## [FUNGSI]: Memperbarui rasio dan warna health bar 3D setiap kali HP musuh berubah.
## [INPUT/OUTPUT]: current_hp (float), max_hp (float) -> void
func _on_health_changed(current_hp: float, max_hp: float) -> void:
	_hp_ratio = clampf(current_hp / maxf(1.0, max_hp), 0.0, 1.0)
	_refresh_hp_bar_shader()


## [FUNGSI]: Memperbarui tint warna health bar menjadi cyan saat musuh terkena efek slow Freeze.
## [INPUT/OUTPUT]: multiplier (float) -> void
func _on_speed_multiplier_changed(multiplier: float) -> void:
	_is_slowed = multiplier < 0.999
	_refresh_hp_bar_shader()


## [FUNGSI]: Menulis parameter `hp_ratio` dan `fill_color` ke shader health bar 3D.
## [INPUT/OUTPUT]: - -> void
func _refresh_hp_bar_shader() -> void:
	if _hp_bar_material == null:
		return
	_hp_bar_material.set_shader_parameter("hp_ratio", _hp_ratio)
	var col: Color
	if _is_slowed:
		col = Color(0.38, 0.92, 1.0, 1.0)
	elif _hp_ratio >= 0.5:
		col = Color(0.2, 0.92, 0.45, 1.0)
	elif _hp_ratio >= 0.25:
		col = Color(1.0, 0.72, 0.15, 1.0)
	else:
		col = Color(1.0, 0.22, 0.28, 1.0)
	_hp_bar_material.set_shader_parameter("fill_color", col)


## [FUNGSI]: Membangun model 3D hierarkis berbeda untuk Goblin, Orc, Harpy, dan Demon King.
## [INPUT/OUTPUT]: - -> void
func _build_visual_root() -> void:
	if _visual_root != null:
		_visual_root.queue_free()
	_visual_root = Node3D.new()
	_visual_root.name = "VisualRoot"
	add_child(_visual_root)

	match _enemy_id:
		"orc":
			_build_orc_mesh(_visual_root)
		"harpy":
			_build_harpy_mesh(_visual_root)
		"demon_king":
			_build_demon_king_mesh(_visual_root)
		_:
			_build_goblin_mesh(_visual_root)


## [FUNGSI]: Membangun mesh cyber Goblin (ramping, visor neon, telinga runcing).
## [INPUT/OUTPUT]: root (Node3D) -> void
func _build_goblin_mesh(root: Node3D) -> void:
	var body_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.24, 0.85, 0.35))
	var visor_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.12, 0.95, 0.85))
	visor_mat.set_shader_parameter("ambient_strength", 0.35)

	var body := _make_part(CapsuleMesh.new(), body_mat, Vector3(0.0, 0.45, 0.0))
	(body.mesh as CapsuleMesh).radius = 0.24
	(body.mesh as CapsuleMesh).height = 0.78
	root.add_child(body)

	var head := _make_part(BoxMesh.new(), body_mat, Vector3(0.0, 0.92, -0.04))
	(head.mesh as BoxMesh).size = Vector3(0.36, 0.3, 0.34)
	root.add_child(head)

	var visor := _make_part(BoxMesh.new(), visor_mat, Vector3(0.0, 0.94, -0.21))
	(visor.mesh as BoxMesh).size = Vector3(0.3, 0.1, 0.06)
	root.add_child(visor)

	for side: float in [-1.0, 1.0]:
		var ear := _make_part(PrismMesh.new(), body_mat, Vector3(side * 0.26, 0.96, 0.0))
		(ear.mesh as PrismMesh).size = Vector3(0.12, 0.24, 0.12)
		ear.rotation_degrees = Vector3(0.0, 0.0, -side * 55.0)
		root.add_child(ear)


## [FUNGSI]: Membangun mesh cyber Orc (tubuh besar, pelindung bahu baja, helm bertanduk).
## [INPUT/OUTPUT]: root (Node3D) -> void
func _build_orc_mesh(root: Node3D) -> void:
	var skin_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.86, 0.44, 0.16))
	var armor_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.24, 0.28, 0.36))

	var torso := _make_part(BoxMesh.new(), skin_mat, Vector3(0.0, 0.62, 0.0))
	(torso.mesh as BoxMesh).size = Vector3(0.74, 0.88, 0.56)
	root.add_child(torso)

	var head := _make_part(CylinderMesh.new(), armor_mat, Vector3(0.0, 1.2, -0.04))
	(head.mesh as CylinderMesh).top_radius = 0.22
	(head.mesh as CylinderMesh).bottom_radius = 0.26
	(head.mesh as CylinderMesh).height = 0.34
	root.add_child(head)

	for side: float in [-1.0, 1.0]:
		var pauldron := _make_part(BoxMesh.new(), armor_mat, Vector3(side * 0.46, 0.92, 0.0))
		(pauldron.mesh as BoxMesh).size = Vector3(0.28, 0.34, 0.48)
		root.add_child(pauldron)


## [FUNGSI]: Membangun mesh cyber Harpy (drone terbang ber-sayap delta ungu-magenta).
## [INPUT/OUTPUT]: root (Node3D) -> void
func _build_harpy_mesh(root: Node3D) -> void:
	var hull_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.75, 0.28, 0.95))
	var wing_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.95, 0.45, 0.85))
	wing_mat.set_shader_parameter("ambient_strength", 0.25)

	var body := _make_part(SphereMesh.new(), hull_mat, Vector3(0.0, 1.05, 0.0))
	(body.mesh as SphereMesh).radius = 0.28
	(body.mesh as SphereMesh).height = 0.56
	body.scale = Vector3(0.85, 0.75, 1.55)
	root.add_child(body)

	for side: float in [-1.0, 1.0]:
		var wing := _make_part(BoxMesh.new(), wing_mat, Vector3(side * 0.55, 1.1, 0.08))
		(wing.mesh as BoxMesh).size = Vector3(0.85, 0.06, 0.42)
		wing.rotation_degrees = Vector3(0.0, side * 22.0, side * 14.0)
		root.add_child(wing)


## [FUNGSI]: Membangun mesh Boss Demon King (skala besar, zirah crimson, mahkota & tanduk emas).
## [INPUT/OUTPUT]: root (Node3D) -> void
func _build_demon_king_mesh(root: Node3D) -> void:
	var armor_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.82, 0.12, 0.22))
	var gold_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(1.0, 0.78, 0.16))
	gold_mat.set_shader_parameter("ambient_strength", 0.32)
	var core_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(1.0, 0.3, 0.15))
	core_mat.set_shader_parameter("ambient_strength", 0.45)

	var torso := _make_part(BoxMesh.new(), armor_mat, Vector3(0.0, 0.92, 0.0))
	(torso.mesh as BoxMesh).size = Vector3(1.18, 1.35, 0.88)
	root.add_child(torso)

	var chest_core := _make_part(SphereMesh.new(), core_mat, Vector3(0.0, 1.05, -0.44))
	(chest_core.mesh as SphereMesh).radius = 0.24
	(chest_core.mesh as SphereMesh).height = 0.48
	root.add_child(chest_core)

	var head := _make_part(BoxMesh.new(), armor_mat, Vector3(0.0, 1.82, -0.05))
	(head.mesh as BoxMesh).size = Vector3(0.56, 0.52, 0.52)
	root.add_child(head)

	var crown := _make_part(CylinderMesh.new(), gold_mat, Vector3(0.0, 2.15, -0.05))
	(crown.mesh as CylinderMesh).top_radius = 0.32
	(crown.mesh as CylinderMesh).bottom_radius = 0.26
	(crown.mesh as CylinderMesh).height = 0.22
	root.add_child(crown)

	for side: float in [-1.0, 1.0]:
		var shoulder := _make_part(PrismMesh.new(), gold_mat, Vector3(side * 0.74, 1.52, 0.0))
		(shoulder.mesh as PrismMesh).size = Vector3(0.42, 0.58, 0.56)
		shoulder.rotation_degrees = Vector3(0.0, 0.0, -side * 24.0)
		root.add_child(shoulder)

		var horn := _make_part(PrismMesh.new(), gold_mat, Vector3(side * 0.34, 2.26, -0.04))
		(horn.mesh as PrismMesh).size = Vector3(0.18, 0.58, 0.18)
		horn.rotation_degrees = Vector3(-12.0, 0.0, -side * 30.0)
		root.add_child(horn)


## [FUNGSI]: Helper pembuatan MeshInstance3D dengan bayangan aktif untuk bagian tubuh musuh.
## [INPUT/OUTPUT]: mesh (Mesh), material (Material), local_pos (Vector3) -> MeshInstance3D
func _make_part(mesh: Mesh, material: Material, local_pos: Vector3) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	part.material_override = material
	part.position = local_pos
	part.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	return part


## [FUNGSI]: Membangun health bar 3D billboard di atas kepala musuh.
## [INPUT/OUTPUT]: - -> void
func _build_hp_bar() -> void:
	if _hp_bar_mesh != null:
		return
	_hp_bar_mesh = MeshInstance3D.new()
	_hp_bar_mesh.name = "HealthBar3D"
	var quad := QuadMesh.new()
	var bar_width: float = 1.6 if is_boss_enemy() else 0.95
	var bar_height: float = 0.2 if is_boss_enemy() else 0.14
	quad.size = Vector2(bar_width, bar_height)
	_hp_bar_mesh.mesh = quad

	var bar_y: float = 2.85 if is_boss_enemy() else (1.75 if _enemy_id == "harpy" else (1.65 if _enemy_id == "orc" else 1.42))
	_hp_bar_mesh.position = Vector3(0.0, bar_y, 0.0)

	var shader := Shader.new()
	shader.code = HP_BAR_SHADER_CODE
	_hp_bar_material = ShaderMaterial.new()
	_hp_bar_material.shader = shader
	_hp_bar_mesh.material_override = _hp_bar_material
	_hp_bar_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	add_child(_hp_bar_mesh)
	_refresh_hp_bar_shader()
