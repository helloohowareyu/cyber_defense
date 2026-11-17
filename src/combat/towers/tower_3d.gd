class_name Tower3D
extends Node3D
## Controller utama Menara Pertahanan 3D (Laser, Cannon, Freeze, Armor Pen).
##
## [FUNGSI_MODUL]: Mengelola pencarian target dalam jangkauan, rotasi matriks Basis kepala
##   menara menghadap musuh, penembakan (sinar Laser ImmediateMesh atau Projectile3D),
##   cincin jangkauan ArrayMesh, klik mouse (Raycasting), serta upgrade level 1..3.
## [REFERENSI_KURIKULUM]:
##   - Sumanta Guha Bab 2 & 4 (World Coordinates, 3D Transformation & Basis Rotation)
##   - Sumanta Guha Bab 3 (ArrayMesh VAO/VBO Range Ring & Mouse Picking Collision)
##   - Sumanta Guha Bab 10 & 11 (Hierarchical Modeling Base->Head->Muzzle & Phong Shading)
## [ARAH_INTERAKSI_KODE]:
##   - Membaca Data  : `TowerStatsData` (`res://src/combat/resources/tower_stats_data.gd`)
##   - Memanggil ke  : `CombatMath`, `TargetSelector`, `ProceduralMeshBuilder`, `LaserBeamRenderer`, `Projectile3D`
##   - Sinyal Keluar : `tower_selected` -> UI Radial Zulfan; `tower_upgraded` -> Economy Nur;
##                     `tower_fired` -> Audio Nur.

## [FUNGSI]: Dipancarkan saat menara diklik mouse di ruang 3D (Mouse Picking).
## [ARAH_INTERAKSI]: Didengar UI Radial Zulfan untuk membuka panel Upgrade/Sell/Targeting.
signal tower_selected(tower_instance: Tower3D)
## [FUNGSI]: Dipancarkan setiap menara menembak target.
## [ARAH_INTERAKSI]: Didengar modul Audio Nur untuk SFX tembakan.
signal tower_fired(tower: Tower3D, target: CombatTargetComponent, scaled_damage: float)
## [FUNGSI]: Dipancarkan saat menara berhasil naik level.
## [ARAH_INTERAKSI]: Didengar modul Economy & Audio Nur.
signal tower_upgraded(tower: Tower3D, new_level: int, total_invested_gold: int)

## [FUNGSI]: Durasi visual sinar Laser Tower tampil di layar (detik).
const BEAM_FLASH_DURATION_SEC: float = 0.14
## [FUNGSI]: Jumlah segmen poligon pendekatan kurva lingkaran Range Ring.
const RING_SEGMENTS: int = 48
## [FUNGSI]: Ketebalan pita cincin jangkauan dalam meter.
const RING_THICKNESS_METERS: float = 0.25

## [FUNGSI]: Spesifikasi dasar menara (Laser/Cannon/Freeze/ArmorPen) dari `resources/presets/`.
@export var stats_data: TowerStatsData
## [FUNGSI]: Menampilkan cincin jangkauan sejak awal jika true (berguna di sandbox).
@export var show_range_on_ready: bool = false

## [FUNGSI]: Level menara saat ini (1..3).
var current_level: int = 1
## [FUNGSI]: Total akumulasi Gold yang telah diinvestasikan (harga beli + biaya upgrade).
var total_invested_gold: int = 0
## [FUNGSI]: Mode seleksi target aktif (dapat diubah UI Zulfan).
var targeting_mode: TargetSelector.Mode = TargetSelector.Mode.FRONT_MOST

var _cooldown_remaining: float = 0.0
var _beam_flash_remaining: float = 0.0
var _turret_head: Node3D = null
var _muzzle: Marker3D = null
var _beam_renderer: LaserBeamRenderer = null
var _range_ring: MeshInstance3D = null
var _click_body: StaticBody3D = null


## [FUNGSI]: Membangun hierarki visual 3D menara dan menginisialisasi investasi awal.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	_build_visual_hierarchy()
	if stats_data != null:
		configure(stats_data)


## [FUNGSI]: Menjalankan siklus combat tiap frame menggunakan grup target global.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	if stats_data == null:
		return
	var candidates: Array[CombatTargetComponent] = _collect_group_targets()
	update_combat(delta, candidates)


## [FUNGSI]: Mengonfigurasi menara dengan Resource `TowerStatsData` dan mereset level ke 1.
## [INPUT/OUTPUT]: stats (TowerStatsData) -> void
## [ARAH_INTERAKSI]: Dipanggil `_ready()`, `BuildManager`, atau test headless.
func configure(stats: TowerStatsData) -> void:
	stats_data = stats
	current_level = 1
	total_invested_gold = stats.base_cost
	_cooldown_remaining = 0.0
	_rebuild_visual_materials_and_ring()


## [FUNGSI]: Mengubah mode pemilihan target (`FRONT_MOST`, `LOWEST_HP`, `CLOSEST`).
## [INPUT/OUTPUT]: new_mode (TargetSelector.Mode) -> void
## [ARAH_INTERAKSI]: Dipanggil tombol mode targeting pada UI Zulfan.
func set_targeting_mode(new_mode: TargetSelector.Mode) -> void:
	targeting_mode = new_mode


## [FUNGSI]: Mengembalikan true jika level menara masih di bawah batas maksimum (3).
## [INPUT/OUTPUT]: - -> bool
## [ARAH_INTERAKSI]: Dipanggil Economy Nur & UI Zulfan sebelum proses upgrade.
func can_upgrade() -> bool:
	return current_level < CombatMath.MAX_TOWER_LEVEL


## [FUNGSI]: Mengembalikan biaya Gold untuk upgrade berikutnya (0 jika sudah Level 3).
## [INPUT/OUTPUT]: - -> int
## [ARAH_INTERAKSI]: Dipanggil Economy Nur & UI Zulfan.
func get_next_upgrade_cost() -> int:
	if stats_data == null:
		return 0
	return CombatMath.calculate_upgrade_cost(stats_data.base_cost, current_level)


## [FUNGSI]: Menaikkan level menara (+1), mencatat investasi Gold, dan memperbarui Range Ring.
## [INPUT/OUTPUT]: - -> bool (true jika upgrade berhasil, false jika sudah Lv.3)
## [ARAH_INTERAKSI]: Dipanggil Economy Nur SETELAH Gold pemain berhasil dipotong.
func apply_upgrade() -> bool:
	if not can_upgrade() or stats_data == null:
		return false
	var cost: int = get_next_upgrade_cost()
	current_level += 1
	total_invested_gold += cost
	_rebuild_range_ring()
	tower_upgraded.emit(self, current_level, total_invested_gold)
	return true


## [FUNGSI]: Menghitung Gold pengembalian (70% dari total investasi) saat menara dijual.
## [INPUT/OUTPUT]: - -> int
## [ARAH_INTERAKSI]: Dipanggil Economy Nur & UI Zulfan.
func get_sell_refund_gold() -> int:
	return CombatMath.calculate_sell_refund(total_invested_gold)


## [FUNGSI]: Mengembalikan damage aktif menara pada level saat ini.
## [INPUT/OUTPUT]: - -> float
func get_current_damage() -> float:
	if stats_data == null:
		return 0.0
	return CombatMath.get_scaled_damage(stats_data.base_damage, current_level)


## [FUNGSI]: Mengembalikan radius jangkauan aktif menara dalam meter (skala 3D).
## [INPUT/OUTPUT]: - -> float
func get_current_range_meters() -> float:
	if stats_data == null:
		return 0.0
	return CombatMath.get_scaled_range_meters(stats_data.base_range_gdd, current_level)


## [FUNGSI]: Menampilkan atau menyembunyikan indikator cincin jangkauan (ArrayMesh).
## [INPUT/OUTPUT]: visible_state (bool) -> void
## [ARAH_INTERAKSI]: Dipanggil UI Zulfan saat membuka/menutup menu interaksi menara.
func set_range_indicator_visible(visible_state: bool) -> void:
	if _range_ring != null:
		_range_ring.visible = visible_state


## [FUNGSI]: Mengemas ringkasan stat menara untuk ditampilkan langsung oleh UI Zulfan.
## [INPUT/OUTPUT]: - -> Dictionary
## [ARAH_INTERAKSI]: Dibaca `TowerInteractionUI` (Modul Zulfan).
func get_ui_summary() -> Dictionary:
	var range_gdd: float = get_current_range_meters() / CombatMath.UNIT_SCALE
	return {
		"display_name": stats_data.display_name if stats_data != null else "",
		"level": current_level,
		"max_level": CombatMath.MAX_TOWER_LEVEL,
		"current_damage": get_current_damage(),
		"current_range_gdd": range_gdd,
		"fire_rate_sec": stats_data.fire_rate_sec if stats_data != null else 0.0,
		"targeting_mode": targeting_mode,
		"can_upgrade": can_upgrade(),
		"next_upgrade_cost": get_next_upgrade_cost(),
		"sell_refund_gold": get_sell_refund_gold(),
	}


## [FUNGSI]: Memproses rotasi turret, cooldown tembak, dan penembakan terhadap daftar kandidat.
## [INPUT/OUTPUT]: delta (float), candidates (Array[CombatTargetComponent]) -> CombatTargetComponent
## [ARAH_INTERAKSI]: Dipanggil `_process()`; juga dipanggil langsung oleh unit test headless.
func update_combat(
	delta: float,
	candidates: Array[CombatTargetComponent]
) -> CombatTargetComponent:
	if stats_data == null:
		return null
	_cooldown_remaining = maxf(0.0, _cooldown_remaining - maxf(0.0, delta))
	_tick_beam_flash(delta)
	var range_m: float = get_current_range_meters()
	var target: CombatTargetComponent = TargetSelector.select_target(
		global_position, range_m, candidates, targeting_mode
	)
	if target == null:
		return null
	_aim_at(target.global_position)
	if _cooldown_remaining <= 0.0:
		_cooldown_remaining = stats_data.fire_rate_sec
		_fire_at(target)
		return target
	return null


## [FUNGSI]: Memutar kepala menara (`_turret_head`) menghadap posisi target via Basis 3D.
## [INPUT/OUTPUT]: target_pos (Vector3) -> void
## [REFERENSI_KURIKULUM]: Sumanta Guha Bab 4 & 5 (3D Transformation & Orthonormal Basis).
func _aim_at(target_pos: Vector3) -> void:
	if _turret_head != null:
		_turret_head.basis = CombatMath.compute_turret_look_basis(global_position, target_pos)


## [FUNGSI]: Menembakkan sinar Laser instan atau spawn Projectile3D sesuai jenis menara.
## [INPUT/OUTPUT]: target (CombatTargetComponent) -> void
func _fire_at(target: CombatTargetComponent) -> void:
	var dmg: float = get_current_damage()
	if stats_data.tower_type == TowerStatsData.TowerType.LASER:
		target.apply_combat_hit(dmg, stats_data.ignores_armor, 0.0, 0.0)
		_show_laser_beam(target.global_position)
	else:
		_spawn_projectile(target, dmg)
	tower_fired.emit(self, target, dmg)


## [FUNGSI]: Menampilkan sinar laser `ImmediateMesh` dari Muzzle ke target sesaat.
## [INPUT/OUTPUT]: target_world_pos (Vector3) -> void
func _show_laser_beam(target_world_pos: Vector3) -> void:
	if _beam_renderer == null:
		return
	var start_world: Vector3 = _muzzle.global_position if _muzzle != null else global_position
	var local_start: Vector3 = to_local(start_world)
	var local_end: Vector3 = to_local(target_world_pos + Vector3(0.0, 0.4, 0.0))
	_beam_renderer.draw_beam_from_to(local_start, local_end, 0.14)
	_beam_flash_remaining = BEAM_FLASH_DURATION_SEC


## [FUNGSI]: Membuat dan meluncurkan node `Projectile3D` ke scene induk.
## [INPUT/OUTPUT]: target (CombatTargetComponent), scaled_damage (float) -> void
func _spawn_projectile(target: CombatTargetComponent, scaled_damage: float) -> void:
	if not is_inside_tree():
		return
	var proj := Projectile3D.new()
	var container: Node = get_parent() if get_parent() != null else self
	container.add_child(proj)
	var start_world: Vector3 = _muzzle.global_position if _muzzle != null else global_position
	proj.launch(start_world, target, stats_data, scaled_damage, _collect_group_targets)


## [FUNGSI]: Mengurangi timer flash sinar Laser dan membersihkannya saat habis.
## [INPUT/OUTPUT]: delta (float) -> void
func _tick_beam_flash(delta: float) -> void:
	if _beam_flash_remaining <= 0.0:
		return
	_beam_flash_remaining -= maxf(0.0, delta)
	if _beam_flash_remaining <= 0.0 and _beam_renderer != null:
		_beam_renderer.clear_beam()


## [FUNGSI]: Mengumpulkan seluruh `CombatTargetComponent` yang terdaftar di grup scene.
## [INPUT/OUTPUT]: - -> Array[CombatTargetComponent]
func _collect_group_targets() -> Array[CombatTargetComponent]:
	var result: Array[CombatTargetComponent] = []
	if not is_inside_tree():
		return result
	for node: Node in get_tree().get_nodes_in_group(CombatTargetComponent.GROUP_NAME):
		if node is CombatTargetComponent:
			result.append(node as CombatTargetComponent)
	return result


## [FUNGSI]: Membangun hierarki node 3D menara (Base -> TurretHead -> Muzzle), Beam, Ring, & ClickBody.
## [INPUT/OUTPUT]: - -> void
## [REFERENSI_KURIKULUM]: Guha Bab 10 (Hierarchical Modeling), Bab 3 (Mouse Picking Collider).
func _build_visual_hierarchy() -> void:
	if _turret_head != null:
		return
	var base_mesh := MeshInstance3D.new()
	var cyl := CylinderMesh.new()
	cyl.top_radius = 0.55
	cyl.bottom_radius = 0.7
	cyl.height = 0.6
	base_mesh.mesh = cyl
	base_mesh.position = Vector3(0.0, 0.3, 0.0)
	base_mesh.material_override = ProceduralMeshBuilder.make_phong_material(Color(0.18, 0.22, 0.28))
	base_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	add_child(base_mesh)

	_turret_head = Node3D.new()
	_turret_head.name = "TurretHead"
	_turret_head.position = Vector3(0.0, 0.75, 0.0)
	add_child(_turret_head)

	var head_mesh := MeshInstance3D.new()
	head_mesh.name = "HeadMesh"
	var box := BoxMesh.new()
	box.size = Vector3(0.55, 0.4, 0.7)
	head_mesh.mesh = box
	head_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_turret_head.add_child(head_mesh)

	var barrel_mesh := MeshInstance3D.new()
	var barrel := CylinderMesh.new()
	barrel.top_radius = 0.1
	barrel.bottom_radius = 0.12
	barrel.height = 0.65
	barrel_mesh.mesh = barrel
	barrel_mesh.rotation_degrees = Vector3(90.0, 0.0, 0.0)
	barrel_mesh.position = Vector3(0.0, 0.0, -0.5)
	barrel_mesh.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_turret_head.add_child(barrel_mesh)

	_muzzle = Marker3D.new()
	_muzzle.name = "Muzzle"
	_muzzle.position = Vector3(0.0, 0.0, -0.85)
	_turret_head.add_child(_muzzle)

	_beam_renderer = LaserBeamRenderer.new()
	add_child(_beam_renderer)

	_range_ring = MeshInstance3D.new()
	_range_ring.name = "RangeRing"
	_range_ring.material_override = ProceduralMeshBuilder.make_ring_material()
	_range_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_range_ring.visible = show_range_on_ready
	add_child(_range_ring)

	_setup_mouse_picking_collider()


## [FUNGSI]: Menyiapkan StaticBody3D agar klik kiri mouse pada menara memancarkan `tower_selected`.
## [INPUT/OUTPUT]: - -> void
## [REFERENSI_KURIKULUM]: Sumanta Guha Bab 3 (Mouse Interaction / 3D Picking).
func _setup_mouse_picking_collider() -> void:
	_click_body = StaticBody3D.new()
	_click_body.name = "MousePickCollider"
	var shape_node := CollisionShape3D.new()
	var col_box := BoxShape3D.new()
	col_box.size = Vector3(1.4, 1.4, 1.4)
	shape_node.shape = col_box
	shape_node.position = Vector3(0.0, 0.7, 0.0)
	_click_body.add_child(shape_node)
	_click_body.input_event.connect(_on_click_body_input_event)
	add_child(_click_body)


## [FUNGSI]: Callback klik mouse pada collider menara; menampilkan ring dan memancarkan sinyal.
## [INPUT/OUTPUT]: _camera, event, _pos, _normal, _shape_idx -> void
func _on_click_body_input_event(
	_camera: Node,
	event: InputEvent,
	_event_position: Vector3,
	_normal: Vector3,
	_shape_idx: int
) -> void:
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event as InputEventMouseButton
		if mb.button_index == MOUSE_BUTTON_LEFT and mb.pressed:
			set_range_indicator_visible(true)
			tower_selected.emit(self)


## [FUNGSI]: Memperbarui warna material turret/beam dan membangun ulang mesh Range Ring.
## [INPUT/OUTPUT]: - -> void
func _rebuild_visual_materials_and_ring() -> void:
	if stats_data == null:
		return
	if _turret_head != null:
		var head_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(stats_data.accent_color)
		for child: Node in _turret_head.get_children():
			if child is MeshInstance3D:
				(child as MeshInstance3D).material_override = head_mat
	if _beam_renderer != null:
		_beam_renderer.set_beam_color(stats_data.accent_color)
	_rebuild_range_ring()


## [FUNGSI]: Membangun ulang ArrayMesh cincin jangkauan sesuai range level saat ini.
## [INPUT/OUTPUT]: - -> void
func _rebuild_range_ring() -> void:
	if _range_ring == null or stats_data == null:
		return
	var outer_r: float = get_current_range_meters()
	var inner_r: float = maxf(0.1, outer_r - RING_THICKNESS_METERS)
	var inner_col := Color(stats_data.accent_color.r, stats_data.accent_color.g, stats_data.accent_color.b, 0.05)
	var outer_col := Color(stats_data.accent_color.r, stats_data.accent_color.g, stats_data.accent_color.b, 0.75)
	_range_ring.mesh = ProceduralMeshBuilder.build_range_ring_mesh(
		inner_r, outer_r, RING_SEGMENTS, inner_col, outer_col
	)
