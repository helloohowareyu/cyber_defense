@tool
extends StaticBody3D

@export var lebar_map: float = 32.0:
	set(val):
		lebar_map = val
		_terapkan_pas_pojok_kanan()

@export var koreksi_pas_pojok: float = 0.0:
	set(val):
		koreksi_pas_pojok = val
		_terapkan_pas_pojok_kanan()

@export var posisi_z: float = 0.0:
	set(val):
		posisi_z = val
		_terapkan_pas_pojok_kanan()

@export var posisi_base: Vector3 = Vector3(14.14, 0.0, 0.0):
	set(val):
		posisi_base = val
		position = posisi_base
		rotation_degrees = Vector3(0.0, rotasi_y_derajat, 0.0)

@export var rotasi_y_derajat: float = 0.0:
	set(val):
		rotasi_y_derajat = val
		rotation_degrees = Vector3(0.0, rotasi_y_derajat, 0.0)

@export var pasin_pojok_sekarang: bool = false:
	set(val):
		if val:
			_terapkan_pas_pojok_kanan()
			pasin_pojok_sekarang = false

@export var skala_base: float = 1.0:
	set(val):
		skala_base = val
		_bangun_base_kita()

@export var warna_cyan: Color = Color("#00F0FF"):
	set(val):
		warna_cyan = val
		_bangun_base_kita()

@export var kekuatan_neon: float = 3.2:
	set(val):
		kekuatan_neon = val
		_bangun_base_kita()

@export var tinggi_melayang: float = 3.2:
	set(val):
		tinggi_melayang = val
		_perbarui_posisi_melayang()

@export var skala_melayang: float = 1.3:
	set(val):
		skala_melayang = val
		_perbarui_posisi_melayang()

@export var animasi_melayang_aktif: bool = true

var _mat_neon: StandardMaterial3D
var _mat_reaktor_dalam: StandardMaterial3D
var _mat_reaktor_luar: StandardMaterial3D
var _inti_reaktor: Node3D
var _cincin_gyro_luar: Node3D
var _cincin_gyro_dalam: Node3D
var _drone_kiri: Node3D
var _drone_kanan: Node3D
var _waktu_denyut: float = 0.0

func _enter_tree() -> void:
	_terapkan_pas_pojok_kanan()

func _ready() -> void:
	_terapkan_pas_pojok_kanan()
	_bangun_base_kita()

func _process(delta: float) -> void:
	if not animasi_melayang_aktif:
		return

	_waktu_denyut += delta * 2.5
	_perbarui_posisi_melayang()

	if not Engine.is_editor_hint() and _mat_neon != null and _mat_reaktor_dalam != null:
		var faktor := 0.85 + 0.25 * sin(_waktu_denyut * 1.15)
		_mat_neon.emission_energy_multiplier = kekuatan_neon * faktor
		_mat_reaktor_dalam.emission_energy_multiplier = kekuatan_neon * 1.4 * (0.8 + 0.3 * cos(_waktu_denyut * 1.15))

func _perbarui_posisi_melayang() -> void:
	var naik_turun := sin(_waktu_denyut) * 0.16
	if is_instance_valid(_inti_reaktor):
		_inti_reaktor.position = Vector3(-0.15, tinggi_melayang + naik_turun, 0.0)
		_inti_reaktor.scale = Vector3.ONE * skala_melayang
		_inti_reaktor.rotation.y -= 0.02
		_inti_reaktor.rotation.x = sin(_waktu_denyut * 0.5) * 0.15

	if is_instance_valid(_cincin_gyro_luar):
		_cincin_gyro_luar.position = Vector3(-0.15, tinggi_melayang + naik_turun, 0.0)
		_cincin_gyro_luar.scale = Vector3.ONE * skala_melayang
		_cincin_gyro_luar.rotation.x = deg_to_rad(25.0)
		_cincin_gyro_luar.rotation.y += 0.028

	if is_instance_valid(_cincin_gyro_dalam):
		_cincin_gyro_dalam.position = Vector3(-0.15, tinggi_melayang + naik_turun, 0.0)
		_cincin_gyro_dalam.scale = Vector3.ONE * skala_melayang
		_cincin_gyro_dalam.rotation.z = deg_to_rad(-22.0)
		_cincin_gyro_dalam.rotation.x -= 0.032

	if is_instance_valid(_drone_kiri):
		_drone_kiri.position = Vector3(-0.15, tinggi_melayang - 0.1 + cos(_waktu_denyut) * 0.15, -1.78)
		_drone_kiri.scale = Vector3.ONE * skala_melayang
		_drone_kiri.rotation.y += 0.015

	if is_instance_valid(_drone_kanan):
		_drone_kanan.position = Vector3(-0.15, tinggi_melayang - 0.1 + cos(_waktu_denyut) * 0.15, 1.78)
		_drone_kanan.scale = Vector3.ONE * skala_melayang
		_drone_kanan.rotation.y -= 0.015

func _terapkan_pas_pojok_kanan() -> void:
	# Sisi terkanan lokal berada di +1.8525 (LisBelakang), jadi digeser -1.86 * skala_base dari tepi kanan map
	var batas_kanan_map := lebar_map * 0.5
	var x_pas := batas_kanan_map - (1.86 * skala_base) + koreksi_pas_pojok
	posisi_base = Vector3(x_pas, 0.0, posisi_z)
	position = posisi_base
	rotation_degrees = Vector3(0.0, rotasi_y_derajat, 0.0)

func _bangun_base_kita() -> void:
	_terapkan_pas_pojok_kanan()

	var wadah_visual := get_node_or_null("MeshInstance3D") as MeshInstance3D
	if not wadah_visual:
		wadah_visual = MeshInstance3D.new()
		wadah_visual.name = "MeshInstance3D"
		add_child(wadah_visual)
		if Engine.is_editor_hint():
			wadah_visual.owner = get_tree().edited_scene_root

	wadah_visual.mesh = null
	for child in wadah_visual.get_children():
		child.queue_free()

	var mat_bunker_gelap := StandardMaterial3D.new()
	mat_bunker_gelap.albedo_color = Color("#071428")
	mat_bunker_gelap.metallic = 0.88
	mat_bunker_gelap.roughness = 0.25

	var mat_bunker_terang := StandardMaterial3D.new()
	mat_bunker_terang.albedo_color = Color("#15305C")
	mat_bunker_terang.metallic = 0.85
	mat_bunker_terang.roughness = 0.2

	var mat_dek := StandardMaterial3D.new()
	mat_dek.albedo_color = Color("#050D1C")
	mat_dek.metallic = 0.82
	mat_dek.roughness = 0.32

	var mat_rangka := StandardMaterial3D.new()
	mat_rangka.albedo_color = Color("#245196")
	mat_rangka.metallic = 0.92
	mat_rangka.roughness = 0.18

	_mat_neon = StandardMaterial3D.new()
	_mat_neon.albedo_color = warna_cyan
	_mat_neon.emission_enabled = true
	_mat_neon.emission = warna_cyan
	_mat_neon.emission_energy_multiplier = kekuatan_neon

	_mat_reaktor_dalam = StandardMaterial3D.new()
	_mat_reaktor_dalam.albedo_color = Color("#032B3E")
	_mat_reaktor_dalam.emission_enabled = true
	_mat_reaktor_dalam.emission = warna_cyan
	_mat_reaktor_dalam.emission_energy_multiplier = kekuatan_neon * 1.4

	_mat_reaktor_luar = StandardMaterial3D.new()
	_mat_reaktor_luar.albedo_color = Color("#095273")
	_mat_reaktor_luar.emission_enabled = true
	_mat_reaktor_luar.emission = warna_cyan
	_mat_reaktor_luar.emission_energy_multiplier = kekuatan_neon * 0.95

	# 1. Bunker utama berlapis & dek pertahanan depan (-X), rata di tepi kanan (+1.85)
	_tambah_blok(wadah_visual, "BunkerDasar", Vector3(3.1, 0.28, 3.9), Vector3(0.3, 0.14, 0.0), mat_bunker_gelap)
	_tambah_blok(wadah_visual, "BunkerTingkatDua", Vector3(2.65, 0.24, 3.35), Vector3(0.42, 0.4, 0.0), mat_bunker_terang)
	_tambah_blok(wadah_visual, "BumperBelakang", Vector3(0.22, 0.42, 3.5), Vector3(1.74, 0.21, 0.0), mat_rangka)
	_tambah_blok(wadah_visual, "DekPertahanan", Vector3(1.35, 0.14, 2.5), Vector3(-1.82, 0.07, 0.0), mat_dek)

	# 2 jalur rel energi sejajar di dek depan
	for z_rel in [-0.62, 0.62]:
		_tambah_blok(wadah_visual, "RelEnergiDepan", Vector3(1.22, 0.04, 0.1), Vector3(-1.78, 0.15, z_rel), _mat_neon)

	# Strip energi kembar di bagian depan-bawah bunker
	for idx_s in range(2):
		var x_strip := -1.05 - float(idx_s) * 0.24
		_tambah_blok(wadah_visual, "StripBunkerDepan_%d" % idx_s, Vector3(0.1, 0.16, 2.2), Vector3(x_strip, 0.2, 0.0), _mat_neon)

	# Menara pertahanan tengah di ujung dek depan
	_tambah_blok(wadah_visual, "MenaraDepanBawah", Vector3(0.5, 0.28, 0.54), Vector3(-2.15, 0.26, 0.0), mat_bunker_terang)
	_tambah_blok(wadah_visual, "LarasPertahananUtama", Vector3(0.52, 0.14, 0.18), Vector3(-2.48, 0.34, 0.0), mat_rangka)
	_tambah_blok(wadah_visual, "IntiPertahananUtama", Vector3(0.12, 0.12, 0.16), Vector3(-2.75, 0.34, 0.0), _mat_neon)

	# Sayap armor & strip neon di kiri-kanan bunker (ujung kanan tidak melebihi +1.85)
	for side_z in [-2.12, 2.12]:
		_tambah_blok(wadah_visual, "SayapBunker", Vector3(1.45, 0.24, 0.46), Vector3(0.25, 0.28, side_z), mat_rangka)
		_tambah_blok(wadah_visual, "SiripSayap", Vector3(0.3, 0.48, 0.1), Vector3(0.75, 0.52, side_z), mat_bunker_terang)
		_tambah_blok(wadah_visual, "LisSayap", Vector3(1.32, 0.065, 0.085), Vector3(0.25, 0.42, side_z + (-0.23 if side_z < 0 else 0.23)), _mat_neon)

	# Lis neon cyan mengelilingi bunker (tepi belakang pas di +1.8525)
	_tambah_blok(wadah_visual, "LisKiri", Vector3(2.9, 0.07, 0.085), Vector3(0.35, 0.27, -1.97), _mat_neon)
	_tambah_blok(wadah_visual, "LisKanan", Vector3(2.9, 0.07, 0.085), Vector3(0.35, 0.27, 1.97), _mat_neon)
	_tambah_blok(wadah_visual, "LisBelakang", Vector3(0.085, 0.07, 3.7), Vector3(1.81, 0.27, 0.0), _mat_neon)

	# 2. Kubah generator shield bertingkat & 4 pylon sudut
	_tambah_blok(wadah_visual, "KubahDasar", Vector3(1.72, 0.36, 2.02), Vector3(0.2, 0.68, 0.0), mat_bunker_gelap)
	_tambah_blok(wadah_visual, "KubahTengah", Vector3(1.32, 0.44, 1.58), Vector3(0.2, 1.02, 0.0), mat_bunker_terang)
	_tambah_blok(wadah_visual, "KubahAtas", Vector3(0.88, 0.28, 1.08), Vector3(0.2, 1.34, 0.0), mat_rangka)
	_tambah_blok(wadah_visual, "CincinKubah", Vector3(1.62, 0.1, 1.88), Vector3(0.2, 0.88, 0.0), _mat_neon)
	_tambah_blok(wadah_visual, "MahkotaKubah", Vector3(0.66, 0.09, 0.82), Vector3(0.2, 1.5, 0.0), _mat_neon)

	# 4 pylon penopang sudut di sekitar kubah
	for px in [-0.62, 1.02]:
		for pz in [-0.92, 0.92]:
			_tambah_blok(wadah_visual, "PylonKubah", Vector3(0.24, 0.72, 0.24), Vector3(px, 0.88, pz), mat_rangka)
			_tambah_blok(wadah_visual, "LampuPylon", Vector3(0.08, 0.46, 0.08), Vector3(px - 0.13, 0.92, pz), _mat_neon)

	# 3. Menara radar / sensor kiri & kanan
	for idx_z in range(2):
		var side_z := -1.42 if idx_z == 0 else 1.42
		var suf := "Kiri" if idx_z == 0 else "Kanan"

		_tambah_blok(wadah_visual, "DudukanSensor_%s" % suf, Vector3(0.92, 0.46, 0.86), Vector3(0.38, 0.74, side_z), mat_bunker_gelap)
		_tambah_blok(wadah_visual, "KepalaSensor_%s" % suf, Vector3(0.7, 0.36, 0.7), Vector3(0.3, 1.13, side_z), mat_bunker_terang)
		_tambah_blok(wadah_visual, "LensaSensor_%s" % suf, Vector3(0.13, 0.18, 0.46), Vector3(-0.07, 1.13, side_z), _mat_neon)
		_tambah_blok(wadah_visual, "TiangRadar_%s" % suf, Vector3(0.065, 0.52, 0.065), Vector3(0.42, 1.54, side_z), mat_rangka)
		_tambah_blok(wadah_visual, "PiringanRadar_%s" % suf, Vector3(0.095, 0.34, 0.62), Vector3(0.32, 1.82, side_z), _mat_neon)

	# 4. Elemen melayang di atas bunker (inti berlapis + 2 cincin gyro + 2 drone bersayap)
	_inti_reaktor = Node3D.new()
	_inti_reaktor.name = "IntiReaktorMelayang"
	wadah_visual.add_child(_inti_reaktor)
	if Engine.is_editor_hint():
		_inti_reaktor.owner = get_tree().edited_scene_root

	_tambah_blok(_inti_reaktor, "IntiKubusLuar", Vector3(0.54, 0.54, 0.54), Vector3.ZERO, _mat_reaktor_luar)
	_tambah_blok(_inti_reaktor, "IntiKubusDalam", Vector3(0.34, 0.34, 0.34), Vector3.ZERO, _mat_neon)
	_tambah_blok(_inti_reaktor, "IntiTengahGelap", Vector3(0.18, 0.18, 0.18), Vector3.ZERO, _mat_reaktor_dalam)
	_tambah_blok(_inti_reaktor, "PalangX", Vector3(1.04, 0.085, 0.13), Vector3.ZERO, mat_rangka)
	_tambah_blok(_inti_reaktor, "PalangZ", Vector3(0.13, 0.085, 1.04), Vector3.ZERO, mat_rangka)

	_cincin_gyro_luar = Node3D.new()
	_cincin_gyro_luar.name = "CincinGyroLuar"
	wadah_visual.add_child(_cincin_gyro_luar)
	if Engine.is_editor_hint():
		_cincin_gyro_luar.owner = get_tree().edited_scene_root

	_tambah_blok(_cincin_gyro_luar, "GyroLuarA", Vector3(0.1, 0.15, 1.36), Vector3(-0.68, 0.0, 0.0), _mat_neon)
	_tambah_blok(_cincin_gyro_luar, "GyroLuarB", Vector3(0.1, 0.15, 1.36), Vector3(0.68, 0.0, 0.0), _mat_neon)
	_tambah_blok(_cincin_gyro_luar, "GyroLuarC", Vector3(1.36, 0.15, 0.1), Vector3(0.0, 0.0, -0.68), mat_rangka)
	_tambah_blok(_cincin_gyro_luar, "GyroLuarD", Vector3(1.36, 0.15, 0.1), Vector3(0.0, 0.0, 0.68), mat_rangka)

	_cincin_gyro_dalam = Node3D.new()
	_cincin_gyro_dalam.name = "CincinGyroDalam"
	wadah_visual.add_child(_cincin_gyro_dalam)
	if Engine.is_editor_hint():
		_cincin_gyro_dalam.owner = get_tree().edited_scene_root

	_tambah_blok(_cincin_gyro_dalam, "GyroDalam1", Vector3(1.0, 0.09, 0.09), Vector3(0.0, 0.5, 0.0), _mat_neon)
	_tambah_blok(_cincin_gyro_dalam, "GyroDalam2", Vector3(1.0, 0.09, 0.09), Vector3(0.0, -0.5, 0.0), _mat_neon)
	_tambah_blok(_cincin_gyro_dalam, "GyroDalam3", Vector3(0.09, 1.0, 0.09), Vector3(0.0, 0.0, -0.5), mat_bunker_terang)
	_tambah_blok(_cincin_gyro_dalam, "GyroDalam4", Vector3(0.09, 1.0, 0.09), Vector3(0.0, 0.0, 0.5), mat_bunker_terang)

	_drone_kiri = Node3D.new()
	_drone_kiri.name = "DroneKiri"
	wadah_visual.add_child(_drone_kiri)
	if Engine.is_editor_hint():
		_drone_kiri.owner = get_tree().edited_scene_root
	_tambah_blok(_drone_kiri, "BadanDroneKiri", Vector3(0.36, 0.32, 0.36), Vector3.ZERO, mat_bunker_terang)
	_tambah_blok(_drone_kiri, "CahayaDroneKiri", Vector3(0.44, 0.11, 0.18), Vector3.ZERO, _mat_neon)
	_tambah_blok(_drone_kiri, "SayapDroneKiri", Vector3(0.14, 0.48, 0.08), Vector3(0.0, 0.0, -0.24), mat_rangka)

	_drone_kanan = Node3D.new()
	_drone_kanan.name = "DroneKanan"
	wadah_visual.add_child(_drone_kanan)
	if Engine.is_editor_hint():
		_drone_kanan.owner = get_tree().edited_scene_root
	_tambah_blok(_drone_kanan, "BadanDroneKanan", Vector3(0.36, 0.32, 0.36), Vector3.ZERO, mat_bunker_terang)
	_tambah_blok(_drone_kanan, "CahayaDroneKanan", Vector3(0.44, 0.11, 0.18), Vector3.ZERO, _mat_neon)
	_tambah_blok(_drone_kanan, "SayapDroneKanan", Vector3(0.14, 0.48, 0.08), Vector3(0.0, 0.0, 0.24), mat_rangka)

	_perbarui_posisi_melayang()
	wadah_visual.scale = Vector3.ONE * skala_base

	# 5. Sinkronkan CollisionShape3D agar tidak ada warning
	var col_node := get_node_or_null("CollisionShape3D") as CollisionShape3D
	if not col_node:
		col_node = CollisionShape3D.new()
		col_node.name = "CollisionShape3D"
		add_child(col_node)
		if Engine.is_editor_hint():
			col_node.owner = get_tree().edited_scene_root

	var box_shape := BoxShape3D.new()
	box_shape.size = Vector3(4.65, 2.4, 4.45) * skala_base
	col_node.shape = box_shape
	col_node.position = Vector3(-0.45, 1.2 * skala_base, 0.0)

func _tambah_blok(parent: Node3D, nama: String, ukuran: Vector3, pos: Vector3, mat: Material) -> void:
	var blok := MeshInstance3D.new()
	blok.name = nama
	var box := BoxMesh.new()
	box.size = ukuran
	blok.mesh = box
	blok.position = pos
	blok.material_override = mat
	parent.add_child(blok)
	if Engine.is_editor_hint():
		blok.owner = get_tree().edited_scene_root
