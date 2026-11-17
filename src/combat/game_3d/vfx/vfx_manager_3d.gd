class_name VFXManager3D
extends Node3D
## Pengelola efek partikel 3D dan pulsa prosedural untuk feedback visual combat.
##
## [FUNGSI_MODUL]: Membuat burst `CPUParticles3D` (aman di mode headless) dan cincin pulsa
##   `ProceduralMeshBuilder` untuk hit spark, ledakan AoE, kematian musuh/boss, hit Energy Core,
##   dan penempatan menara, dengan pembersihan TTL otomatis serta `clear_all()`.
## [REFERENSI_KURIKULUM]: GDD Bagian 10.8 (Particle System & Efek Visual), 10.9 (Transparansi).

var _particle_material: StandardMaterial3D = null
var _particle_box_mesh: BoxMesh = null
var _active_ttl_nodes: Array[Dictionary] = []


## [FUNGSI]: Menyiapkan resource mesh dan material partikel bersama yang aman untuk headless.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	_ensure_shared_resources()


## [FUNGSI]: Menghapus efek partikel sementara setelah masa hidupnya (TTL) berakhir.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	if _active_ttl_nodes.is_empty():
		return
	var dt: float = maxf(0.0, delta)
	var remaining: Array[Dictionary] = []
	for entry: Dictionary in _active_ttl_nodes:
		var node_ref: Node = entry.get("node", null) as Node
		if not is_instance_valid(node_ref):
			continue
		var ttl: float = float(entry.get("ttl", 0.0)) - dt
		if ttl <= 0.0:
			node_ref.queue_free()
		else:
			entry["ttl"] = ttl
			remaining.append(entry)
	_active_ttl_nodes = remaining


## [FUNGSI]: Memunculkan percikan partikel cepat saat proyektil atau laser mengenai target.
## [INPUT/OUTPUT]: world_pos (Vector3), color (Color) -> void
func spawn_hit_spark(world_pos: Vector3, color: Color) -> void:
	_spawn_particle_burst(world_pos, color, 10, 0.28, 3.8, 0.09, Vector3.UP, 180.0, 4.0)


## [FUNGSI]: Memunculkan ledakan partikel dan cincin kejut AoE yang diskalakan sesuai radius.
## [INPUT/OUTPUT]: world_pos (Vector3), radius_meters (float) -> void
func spawn_explosion(world_pos: Vector3, radius_meters: float) -> void:
	var safe_radius: float = maxf(0.8, radius_meters)
	var speed: float = clampf(safe_radius * 1.45, 3.0, 9.0)
	_spawn_particle_burst(
		world_pos,
		Color(1.0, 0.58, 0.15, 1.0),
		22,
		0.45,
		speed,
		0.16,
		Vector3.UP,
		180.0,
		6.0
	)
	_spawn_ring_pulse(
		Vector3(world_pos.x, 0.02, world_pos.z),
		0.25,
		safe_radius,
		Color(1.0, 0.55, 0.15, 0.85),
		0.32
	)


## [FUNGSI]: Memunculkan burst disintegrasi digital saat musuh biasa atau Boss dikalahkan.
## [INPUT/OUTPUT]: world_pos (Vector3), is_boss (bool) -> void
func spawn_death_burst(world_pos: Vector3, is_boss: bool) -> void:
	var count: int = 36 if is_boss else 18
	var lifetime: float = 0.85 if is_boss else 0.5
	var speed: float = 6.8 if is_boss else 4.5
	var p_scale: float = 0.22 if is_boss else 0.13
	var col: Color = Color(1.0, 0.72, 0.18, 1.0) if is_boss else Color(0.25, 0.95, 0.85, 1.0)
	_spawn_particle_burst(
		world_pos + Vector3(0.0, 0.5, 0.0),
		col,
		count,
		lifetime,
		speed,
		p_scale,
		Vector3.UP,
		180.0,
		5.0
	)
	if is_boss:
		_spawn_ring_pulse(
			Vector3(world_pos.x, 0.03, world_pos.z),
			0.4,
			3.8,
			Color(1.0, 0.25, 0.3, 0.9),
			0.55
		)


## [FUNGSI]: Memunculkan efek benturan crimson-cyan saat musuh menabrak Energy Core.
## [INPUT/OUTPUT]: world_pos (Vector3) -> void
func spawn_core_hit(world_pos: Vector3) -> void:
	_spawn_particle_burst(
		world_pos + Vector3(0.0, 1.1, 0.0),
		Color(1.0, 0.2, 0.32, 1.0),
		20,
		0.5,
		5.2,
		0.15,
		Vector3.UP,
		180.0,
		3.5
	)
	_spawn_ring_pulse(
		Vector3(world_pos.x, 0.03, world_pos.z),
		0.5,
		2.4,
		Color(1.0, 0.22, 0.35, 0.85),
		0.38
	)


## [FUNGSI]: Memunculkan pulsa cincin dan percikan naik saat menara baru dibangun atau di-upgrade.
## [INPUT/OUTPUT]: world_pos (Vector3), color (Color) -> void
func spawn_build_pulse(world_pos: Vector3, color: Color) -> void:
	_spawn_particle_burst(
		world_pos + Vector3(0.0, 0.2, 0.0),
		color,
		12,
		0.45,
		3.4,
		0.11,
		Vector3.UP,
		40.0,
		-1.5
	)
	_spawn_ring_pulse(
		Vector3(world_pos.x, 0.02, world_pos.z),
		0.45,
		1.35,
		Color(color.r, color.g, color.b, 0.85),
		0.35
	)


## [FUNGSI]: Menghapus seluruh node VFX aktif (dipakai saat reset/retry/keluar match).
## [INPUT/OUTPUT]: - -> void
func clear_all() -> void:
	_active_ttl_nodes.clear()
	for child: Node in get_children():
		remove_child(child)
		child.queue_free()


## [FUNGSI]: Menginisialisasi mesh partikel kotak cyber dan material unshaded vertex-color.
## [INPUT/OUTPUT]: - -> void
func _ensure_shared_resources() -> void:
	if _particle_material == null:
		_particle_material = StandardMaterial3D.new()
		_particle_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_particle_material.vertex_color_use_as_albedo = true
		_particle_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if _particle_box_mesh == null:
		_particle_box_mesh = BoxMesh.new()
		_particle_box_mesh.size = Vector3.ONE
		_particle_box_mesh.material = _particle_material


## [FUNGSI]: Membuat node `CPUParticles3D` satu tembakan (one-shot) dan mendaftarkannya ke TTL tracker.
## [INPUT/OUTPUT]: world_pos, color, amount, lifetime, speed, p_scale, direction, spread, gravity_down -> void
func _spawn_particle_burst(
	world_pos: Vector3,
	color: Color,
	amount: int,
	lifetime: float,
	speed: float,
	p_scale: float,
	direction: Vector3,
	spread: float,
	gravity_down: float
) -> void:
	_ensure_shared_resources()
	var particles := CPUParticles3D.new()
	particles.amount = maxi(1, amount)
	particles.lifetime = maxf(0.1, lifetime)
	particles.one_shot = true
	particles.explosiveness = 0.92
	particles.mesh = _particle_box_mesh
	particles.direction = direction
	particles.spread = spread
	particles.gravity = Vector3(0.0, -gravity_down, 0.0)
	particles.initial_velocity_min = speed * 0.55
	particles.initial_velocity_max = speed
	particles.scale_amount_min = p_scale * 0.65
	particles.scale_amount_max = p_scale * 1.25
	particles.color = color
	add_child(particles)
	if is_inside_tree():
		particles.global_position = world_pos
	else:
		particles.position = world_pos
	particles.emitting = true
	_active_ttl_nodes.append({"node": particles, "ttl": particles.lifetime + 0.15})


## [FUNGSI]: Membuat cincin pulsa prosedural yang mengembang dan memudar via Tween/TTL.
## [INPUT/OUTPUT]: world_pos, inner_r, outer_r, color, duration -> void
func _spawn_ring_pulse(
	world_pos: Vector3,
	inner_r: float,
	outer_r: float,
	color: Color,
	duration: float
) -> void:
	var ring := MeshInstance3D.new()
	var inner_col := Color(color.r, color.g, color.b, 0.08)
	var outer_col := Color(color.r, color.g, color.b, color.a)
	ring.mesh = ProceduralMeshBuilder.build_range_ring_mesh(
		inner_r, outer_r, 28, inner_col, outer_col
	)
	var mat: ShaderMaterial = ProceduralMeshBuilder.make_ring_material()
	mat.set_shader_parameter("pulse_strength", 0.0)
	ring.material_override = mat
	ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	ring.scale = Vector3(0.35, 1.0, 0.35)
	add_child(ring)
	if is_inside_tree():
		ring.global_position = world_pos
		var tween: Tween = ring.create_tween()
		tween.set_parallel(true)
		tween.tween_property(ring, "scale", Vector3.ONE, duration)
		tween.tween_method(
			func(val: float) -> void: mat.set_shader_parameter("fade", val),
			1.0,
			0.0,
			duration
		)
	else:
		ring.position = world_pos
	_active_ttl_nodes.append({"node": ring, "ttl": duration + 0.08})
