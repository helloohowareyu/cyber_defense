@tool
extends Node3D

@export var base_musuh_node: NodePath:
	set(val):
		base_musuh_node = val
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

@export var offset_keluar_base_musuh: float = 2.0:
	set(val):
		offset_keluar_base_musuh = val
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

@export var titik_awal_musuh: Vector3 = Vector3(-13.2, 0.0, 0.0):
	set(val):
		titik_awal_musuh = val
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

@export var base_utama_node: NodePath:
	set(val):
		base_utama_node = val
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

# Geser X titik akhir relatif ke posisi BaseUtama (misal -2.2 untuk pas di mulut dek depan, 0.0 untuk tengah kubah)
@export var koreksi_x_base_utama: float = -2.2:
	set(val):
		koreksi_x_base_utama = val
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

# 0.0 = pas di tengah Z BaseUtama; geser -/+ bila perlu koreksi halus
@export var koreksi_z_base_utama: float = 0.0:
	set(val):
		koreksi_z_base_utama = val
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

@export var titik_akhir_base_kita: Vector3 = Vector3(14.14, 0.0, 0.0):
	set(val):
		titik_akhir_base_kita = val
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

@export var lebar_jalur: float = 1.05:
	set(val):
		lebar_jalur = max(0.1, val)
		if Engine.is_editor_hint() and is_inside_tree():
			call_deferred("_bangun_jalur")

@export var bangun_ulang_sekarang: bool = false:
	set(val):
		if val:
			bangun_ulang_sekarang = false
			_bangun_jalur()

func _ready() -> void:
	if Engine.is_editor_hint():
		call_deferred("_bangun_jalur")
	else:
		_bangun_jalur()

func _cari_node_by_nama(root: Node, nama_kandidat: Array[String]) -> Node3D:
	for child in root.get_children():
		if child is Node3D:
			var nama_bawah := String(child.name).to_lower().replace("_", "").replace(" ", "")
			for target_nama in nama_kandidat:
				if nama_bawah == target_nama:
					return child as Node3D
		var ketemu := _cari_node_by_nama(child, nama_kandidat)
		if ketemu:
			return ketemu
	return null

func _ambil_base_musuh() -> Node3D:
	if not base_musuh_node.is_empty():
		var n := get_node_or_null(base_musuh_node) as Node3D
		if n and n.is_inside_tree():
			return n
	var root := _get_root_owner()
	if root:
		return _cari_node_by_nama(root, ["basemusuh", "enemyspawn", "spawnmusuh"])
	return null

func _ambil_base_utama() -> Node3D:
	if not base_utama_node.is_empty():
		var n := get_node_or_null(base_utama_node) as Node3D
		if n and n.is_inside_tree():
			return n
	var root := _get_root_owner()
	if root:
		return _cari_node_by_nama(root, ["baseutama", "basekita", "mainbase", "towerutama"])
	return null

func _ke_posisi_lokal(target: Node3D, geser_x: float = 0.0, geser_z: float = 0.0) -> Vector3:
	var pusat_lokal := to_local(target.global_position)
	return Vector3(pusat_lokal.x + geser_x, 0.0, pusat_lokal.z + geser_z)

func _ambil_titik_awal_musuh() -> Vector3:
	var musuh := _ambil_base_musuh()
	if musuh:
		return _ke_posisi_lokal(musuh, offset_keluar_base_musuh, 0.0)
	return titik_awal_musuh

func _ambil_titik_akhir_base_utama() -> Vector3:
	var utama := _ambil_base_utama()
	if utama:
		return _ke_posisi_lokal(utama, koreksi_x_base_utama, koreksi_z_base_utama)
	return Vector3(titik_akhir_base_kita.x + koreksi_x_base_utama, 0.0, titik_akhir_base_kita.z + koreksi_z_base_utama)

func _bangun_jalur() -> void:
	if not is_inside_tree():
		return

	var scene_root := _get_root_owner()

	var sistem_lama := get_node_or_null("SistemJalur")
	if sistem_lama:
		remove_child(sistem_lama)
		sistem_lama.free()

	var sistem := Node3D.new()
	sistem.name = "SistemJalur"
	add_child(sistem)
	if scene_root:
		sistem.owner = scene_root

	# 1. KURVA JALUR UTAMA (Path3D)
	var jalur := Path3D.new()
	jalur.name = "JalurMusuh"
	sistem.add_child(jalur)
	if scene_root:
		jalur.owner = scene_root

	var start_pos := _ambil_titik_awal_musuh()
	var end_pos := _ambil_titik_akhir_base_utama()

	var p_keluar_lurus := Vector3(start_pos.x + 2.2, 0.0, start_pos.z)
	# Paksa segmen masuk benar-benar lurus horizontal sejajar sumbu X di Z = end_pos.z
	var p_masuk_lurus := Vector3(end_pos.x - 4.5, 0.0, end_pos.z)

	var curve := Curve3D.new()
	curve.bake_interval = 0.15
	curve.add_point(start_pos,                  Vector3.ZERO,        Vector3(1.4, 0.0, 0.0))
	curve.add_point(p_keluar_lurus,             Vector3(-1.2, 0.0, 0.0), Vector3(1.8, 0.0, -1.6))
	curve.add_point(Vector3(-6.2, 0.0, -5.8), Vector3(-3.2, 0.0, 0.0), Vector3(3.4, 0.0, 0.0))
	curve.add_point(Vector3(-2.6, 0.0, -0.4), Vector3(0.4, 0.0, -3.2),  Vector3(-0.4, 0.0, 3.2))
	curve.add_point(Vector3(0.4,  0.0, 5.4),  Vector3(-3.2, 0.0, 0.0), Vector3(3.2, 0.0, 0.0))
	curve.add_point(Vector3(4.8,  0.0, 1.0),  Vector3(-0.6, 0.0, 2.8),  Vector3(2.0, 0.0, 0.0))
	curve.add_point(p_masuk_lurus,              Vector3(-1.8, 0.0, 0.0), Vector3(2.2, 0.0, 0.0))
	curve.add_point(end_pos,                    Vector3(-2.2, 0.0, 0.0), Vector3.ZERO)
	jalur.curve = curve

	var pinggir := lebar_jalur + 0.2

	# 2. TINGKAT 1 (BAWAH): GARIS NEON LEBIH LEBAR
	var garis_neon := CSGPolygon3D.new()
	garis_neon.name = "GarisNeonBawah"
	garis_neon.polygon = PackedVector2Array([
		Vector2(-pinggir, 0.01),
		Vector2(pinggir, 0.01),
		Vector2(pinggir, 0.06),
		Vector2(-pinggir, 0.06)
	])
	garis_neon.mode = CSGPolygon3D.MODE_PATH
	garis_neon.path_interval_type = CSGPolygon3D.PATH_INTERVAL_DISTANCE
	garis_neon.path_interval = 0.15
	garis_neon.path_joined = false
	garis_neon.smooth_faces = true

	var mat_neon := StandardMaterial3D.new()
	mat_neon.albedo_color = Color("#00F0FF")
	mat_neon.emission_enabled = true
	mat_neon.emission = Color("#00F0FF")
	mat_neon.emission_energy_multiplier = 3.2
	garis_neon.material = mat_neon

	sistem.add_child(garis_neon)
	garis_neon.path_node = garis_neon.get_path_to(jalur)
	if scene_root:
		garis_neon.owner = scene_root

	# 3. TINGKAT 2 (ATAS): BADAN JALAN BIRU GELAP LEBIH SEMPIT
	var jalan_atas := CSGPolygon3D.new()
	jalan_atas.name = "BentukJalan"
	jalan_atas.polygon = PackedVector2Array([
		Vector2(-lebar_jalur, 0.06),
		Vector2(lebar_jalur, 0.06),
		Vector2(lebar_jalur, 0.12),
		Vector2(-lebar_jalur, 0.12)
	])
	jalan_atas.mode = CSGPolygon3D.MODE_PATH
	jalan_atas.path_interval_type = CSGPolygon3D.PATH_INTERVAL_DISTANCE
	jalan_atas.path_interval = 0.15
	jalan_atas.path_joined = false
	jalan_atas.smooth_faces = true

	var mat_jalan := StandardMaterial3D.new()
	mat_jalan.albedo_color = Color("#0D2B4C")
	mat_jalan.roughness = 0.35
	mat_jalan.metallic = 0.5
	mat_jalan.emission_enabled = true
	mat_jalan.emission = Color("#08203A")
	mat_jalan.emission_energy_multiplier = 0.4
	jalan_atas.material = mat_jalan

	sistem.add_child(jalan_atas)
	jalan_atas.path_node = jalan_atas.get_path_to(jalur)
	if scene_root:
		jalan_atas.owner = scene_root

func _get_root_owner() -> Node:
	if Engine.is_editor_hint() and get_tree():
		return get_tree().edited_scene_root
	return null
