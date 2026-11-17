class_name EnergyCore3D
extends Node3D
## Objek Energy Core 3D yang harus dipertahankan pemain di ujung jalur (P_n).
##
## [FUNGSI_MODUL]: Menampilkan kristal energi cyber berputar dengan dua cincin orbital
##   menggunakan shader Blinn-Phong (`ProceduralMeshBuilder`), melacak HP Core, memberi
##   feedback kilat merah saat terkena serangan, dan memancarkan sinyal ke GameController.
## [REFERENSI_KURIKULUM]: Guha Bab 4 & 10 (transformasi rotasi bertingkat), Bab 11 (Blinn-Phong).

## [FUNGSI]: Dipancarkan setiap kali HP Energy Core berubah atau di-reset.
signal hp_changed(current_hp: int, max_hp: int)
## [FUNGSI]: Dipancarkan saat Energy Core menerima kerusakan dari musuh yang lolos.
signal core_damaged(amount: int, remaining_hp: int)
## [FUNGSI]: Dipancarkan sekali saat HP Energy Core mencapai 0.
signal core_destroyed()

## [FUNGSI]: Durasi efek kilat merah saat Energy Core menerima damage (detik).
const HIT_FLASH_DURATION_SEC: float = 0.28
## [FUNGSI]: Warna normal kristal Energy Core (cyan terang).
const NORMAL_CRYSTAL_COLOR: Color = Color(0.15, 0.88, 1.0, 1.0)
## [FUNGSI]: Warna kristal saat HP kritis (< 40%).
const LOW_HP_CRYSTAL_COLOR: Color = Color(1.0, 0.65, 0.15, 1.0)
## [FUNGSI]: Warna kilat saat baru saja terkena hit.
const HIT_FLASH_COLOR: Color = Color(1.0, 0.18, 0.28, 1.0)

var _max_hp: int = GameConstants3D.STARTING_CORE_HP
var _current_hp: int = GameConstants3D.STARTING_CORE_HP
var _destroyed_emitted: bool = false
var _hit_flash_timer: float = 0.0
var _pulse_time: float = 0.0

var _crystal_pivot: Node3D = null
var _ring_inner: MeshInstance3D = null
var _ring_outer: MeshInstance3D = null
var _crystal_material: ShaderMaterial = null
var _ring_material: ShaderMaterial = null


## [FUNGSI]: Membangun hierarki visual kristal dan cincin orbital saat node memasuki scene tree.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	_build_visuals()
	_update_visual_colors()


## [FUNGSI]: Memutar kristal, mengorbitkan cincin, dan meluruhkan efek kilat hit per frame.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	var dt: float = maxf(0.0, delta)
	_pulse_time += dt
	if _crystal_pivot != null:
		_crystal_pivot.rotate_y(1.1 * dt)
		_crystal_pivot.position.y = 1.45 + sin(_pulse_time * 2.4) * 0.1
	if _ring_inner != null:
		_ring_inner.rotate_x(1.4 * dt)
		_ring_inner.rotate_z(0.8 * dt)
	if _ring_outer != null:
		_ring_outer.rotate_y(-1.2 * dt)
		_ring_outer.rotate_x(-0.65 * dt)
	if _hit_flash_timer > 0.0:
		_hit_flash_timer = maxf(0.0, _hit_flash_timer - dt)
		_update_visual_colors()


## [FUNGSI]: Mengatur ulang HP Energy Core ke nilai penuh dan membersihkan status hancur.
## [INPUT/OUTPUT]: initial_hp (int) -> void
func reset_core(initial_hp: int = GameConstants3D.STARTING_CORE_HP) -> void:
	_max_hp = maxi(1, initial_hp)
	_current_hp = _max_hp
	_destroyed_emitted = false
	_hit_flash_timer = 0.0
	_update_visual_colors()
	hp_changed.emit(_current_hp, _max_hp)


## [FUNGSI]: Mengurangi HP Energy Core akibat kebocoran musuh dan memancarkan sinyal kerusakan/kehancuran.
## [INPUT/OUTPUT]: amount (int) -> void
func take_damage(amount: int) -> void:
	if amount <= 0 or is_destroyed():
		return
	var prev_hp: int = _current_hp
	_current_hp = maxi(0, _current_hp - amount)
	var actual_damage: int = prev_hp - _current_hp
	_hit_flash_timer = HIT_FLASH_DURATION_SEC
	_update_visual_colors()
	hp_changed.emit(_current_hp, _max_hp)
	core_damaged.emit(actual_damage, _current_hp)
	if _current_hp <= 0 and not _destroyed_emitted:
		_destroyed_emitted = true
		core_destroyed.emit()


## [FUNGSI]: Mengembalikan HP Energy Core saat ini.
## [INPUT/OUTPUT]: - -> int
func get_hp() -> int:
	return _current_hp


## [FUNGSI]: Mengembalikan HP maksimum Energy Core.
## [INPUT/OUTPUT]: - -> int
func get_max_hp() -> int:
	return _max_hp


## [FUNGSI]: Mengembalikan true jika HP Energy Core telah mencapai 0.
## [INPUT/OUTPUT]: - -> bool
func is_destroyed() -> bool:
	return _current_hp <= 0


## [FUNGSI]: Membangun pedestal, kristal pusat multi-bagian, dan dua cincin orbital Blinn-Phong.
## [INPUT/OUTPUT]: - -> void
func _build_visuals() -> void:
	if _crystal_pivot != null:
		return
	var base_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.14, 0.18, 0.26))
	var trim_mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.1, 0.55, 0.75))
	_crystal_material = ProceduralMeshBuilder.make_phong_material(NORMAL_CRYSTAL_COLOR)
	_crystal_material.set_shader_parameter("ambient_strength", 0.35)
	_crystal_material.set_shader_parameter("specular_strength", 1.8)
	_ring_material = ProceduralMeshBuilder.make_phong_material(Color(0.35, 0.9, 1.0))
	_ring_material.set_shader_parameter("ambient_strength", 0.25)

	var pedestal := MeshInstance3D.new()
	pedestal.name = "Pedestal"
	var ped_mesh := CylinderMesh.new()
	ped_mesh.top_radius = 0.72
	ped_mesh.bottom_radius = 0.92
	ped_mesh.height = 0.42
	pedestal.mesh = ped_mesh
	pedestal.position = Vector3(0.0, 0.21, 0.0)
	pedestal.material_override = base_mat
	pedestal.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	add_child(pedestal)

	var collar := MeshInstance3D.new()
	collar.name = "CoreCollar"
	var collar_mesh := CylinderMesh.new()
	collar_mesh.top_radius = 0.52
	collar_mesh.bottom_radius = 0.62
	collar_mesh.height = 0.16
	collar.mesh = collar_mesh
	collar.position = Vector3(0.0, 0.48, 0.0)
	collar.material_override = trim_mat
	add_child(collar)

	_crystal_pivot = Node3D.new()
	_crystal_pivot.name = "CrystalPivot"
	_crystal_pivot.position = Vector3(0.0, 1.45, 0.0)
	add_child(_crystal_pivot)

	var crystal_main := MeshInstance3D.new()
	crystal_main.name = "CrystalDiamond"
	var box := BoxMesh.new()
	box.size = Vector3(0.62, 0.62, 0.62)
	crystal_main.mesh = box
	crystal_main.rotation_degrees = Vector3(45.0, 0.0, 45.0)
	crystal_main.scale = Vector3(0.85, 1.35, 0.85)
	crystal_main.material_override = _crystal_material
	crystal_main.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
	_crystal_pivot.add_child(crystal_main)

	var crystal_core := MeshInstance3D.new()
	crystal_core.name = "CrystalInnerSphere"
	var sphere := SphereMesh.new()
	sphere.radius = 0.34
	sphere.height = 0.68
	crystal_core.mesh = sphere
	crystal_core.material_override = _crystal_material
	_crystal_pivot.add_child(crystal_core)

	_ring_inner = MeshInstance3D.new()
	_ring_inner.name = "OrbitalRingInner"
	var torus_in := TorusMesh.new()
	torus_in.inner_radius = 0.72
	torus_in.outer_radius = 0.84
	torus_in.rings = 24
	torus_in.ring_segments = 10
	_ring_inner.mesh = torus_in
	_ring_inner.position = Vector3(0.0, 1.45, 0.0)
	_ring_inner.rotation_degrees = Vector3(35.0, 0.0, 20.0)
	_ring_inner.material_override = _ring_material
	add_child(_ring_inner)

	_ring_outer = MeshInstance3D.new()
	_ring_outer.name = "OrbitalRingOuter"
	var torus_out := TorusMesh.new()
	torus_out.inner_radius = 0.96
	torus_out.outer_radius = 1.06
	torus_out.rings = 28
	torus_out.ring_segments = 10
	_ring_outer.mesh = torus_out
	_ring_outer.position = Vector3(0.0, 1.45, 0.0)
	_ring_outer.rotation_degrees = Vector3(-30.0, 25.0, 0.0)
	_ring_outer.material_override = _ring_material
	add_child(_ring_outer)


## [FUNGSI]: Memperbarui warna shader kristal dan cincin sesuai status hit flash serta rasio HP.
## [INPUT/OUTPUT]: - -> void
func _update_visual_colors() -> void:
	if _crystal_material == null:
		return
	var hp_ratio: float = float(_current_hp) / float(maxi(1, _max_hp))
	var base_col: Color = NORMAL_CRYSTAL_COLOR if hp_ratio >= 0.4 else LOW_HP_CRYSTAL_COLOR
	if _current_hp <= 0:
		base_col = Color(0.25, 0.25, 0.3, 1.0)
	if _hit_flash_timer > 0.0:
		var weight: float = clampf(_hit_flash_timer / HIT_FLASH_DURATION_SEC, 0.0, 1.0)
		base_col = base_col.lerp(HIT_FLASH_COLOR, weight)
	_crystal_material.set_shader_parameter("base_color", base_col)
	if _ring_material != null:
		var ring_col: Color = base_col.lerp(Color.WHITE, 0.25)
		_ring_material.set_shader_parameter("base_color", ring_col)
