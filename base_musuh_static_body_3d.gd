@tool
extends StaticBody3D

@export var lebar_map: float = 32.0:
	set(val):
		lebar_map = val
		_terapkan_pas_garis_kiri()

@export var koreksi_pas_garis: float = 0.0:
	set(val):
		koreksi_pas_garis = val
		_terapkan_pas_garis_kiri()

@export var posisi_z: float = 0.0:
	set(val):
		posisi_z = val
		_terapkan_pas_garis_kiri()

@export var posisi_base: Vector3 = Vector3(-14.4, 0.0, 0.0):
	set(val):
		posisi_base = val
		position = posisi_base
		rotation_degrees = Vector3(0.0, rotasi_y_derajat, 0.0)

@export var rotasi_y_derajat: float = 0.0:
	set(val):
		rotasi_y_derajat = val
		rotation_degrees = Vector3(0.0, rotasi_y_derajat, 0.0)

@export var pasin_garis_sekarang: bool = false:
	set(val):
		if val:
			_terapkan_pas_garis_kiri()
			pasin_garis_sekarang = false

@export var skala_base: float = 1.0:
	set(val):
		skala_base = val
		_bangun_base_musuh()

@export var warna_merah: Color = Color("#FF1E42"):
	set(val):
		warna_merah = val
		_bangun_base_musuh()

@export var kekuatan_neon: float = 2.8:
	set(val):
		kekuatan_neon = val
		_bangun_base_musuh()

@export var tinggi_melayang: float = 3.05:
	set(val):
		tinggi_melayang = val
		_perbarui_posisi_melayang()

@export var skala_melayang: float = 1.35:
	set(val):
		skala_melayang = val
		_perbarui_posisi_melayang()

@export var animasi_melayang_aktif: bool = true

var _mat_neon: StandardMaterial3D
var _mat_portal_dalam: StandardMaterial3D
var _mat_portal_luar: StandardMaterial3D
var _inti_melayang: Node3D
var _cincin_luar_melayang: Node3D
var _satelit_kiri: Node3D
var _satelit_kanan: Node3D
var _waktu_denyut: float = 0.0

func _enter_tree() -> void:
	_terapkan_pas_garis_kiri()

func _ready() -> void:
	_terapkan_pas_garis_kiri()
	_bangun_base_musuh()

func _process(delta: float) -> void:
	if not animasi_melayang_aktif:
		return

	_waktu_denyut += delta * 2.6
	_perbarui_posisi_melayang()

	if not Engine.is_editor_hint() and _mat_neon != null and _mat_portal_dalam != null:
		var faktor := 0.85 + 0.25 * sin(_waktu_denyut * 1.15)
		_mat_neon.emission_energy_multiplier = kekuatan_neon * faktor
		_mat_portal_dalam.emission_energy_multiplier = kekuatan_neon * 1.35 * (0.8 + 0.3 * cos(_waktu_denyut * 1.15))

func _perbarui_posisi_melayang() -> void:
	var naik_turun := sin(_waktu_denyut) * 0.16
	if is_instance_valid(_inti_melayang):
		_inti_melayang.position = Vector3(0.45, tinggi_melayang + naik_turun, 0.0)
		_inti_melayang.scale = Vector3.ONE * skala_melayang
		_inti_melayang.rotation.y += 0.018

	if is_instance_valid(_cincin_luar_melayang):
		_cincin_luar_melayang.position = Vector3(0.45, tinggi_melayang + naik_turun, 0.0)
		_cincin_luar_melayang.scale = Vector3.ONE * skala_melayang
		_cincin_luar_melayang.rotation.x = deg_to_rad(28.0) + sin(_waktu_denyut * 0.7) * 0.15
		_cincin_luar_melayang.rotation.z -= 0.02

	if is_instance_valid(_satelit_kiri):
		_satelit_kiri.position = Vector3(0.3, tinggi_melayang - 0.12 + cos(_waktu_denyut) * 0.14, -1.65)
		_satelit_kiri.scale = Vector3.ONE * skala_melayang
		_satelit_kiri.rotation.x += 0.012

	if is_instance_valid(_satelit_kanan):
		_satelit_kanan.position = Vector3(0.3, tinggi_melayang - 0.12 + cos(_waktu_denyut) * 0.14, 1.65)
		_satelit_kanan.scale = Vector3.ONE * skala_melayang
		_satelit_kanan.rotation.x -= 0.012

func _terapkan_pas_garis_kiri() -> void:
	var batas_kiri_map := -(lebar_map * 0.5)
	var x_pas := batas_kiri_map + (1.6 * skala_base) + koreksi_pas_garis
	posisi_base = Vector3(x_pas, 0.0, posisi_z)
	position = posisi_base
	rotation_degrees = Vector3(0.0, rotasi_y_derajat, 0.0)

func _bangun_base_musuh() -> void:
	_terapkan_pas_garis_kiri()

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

	var mat_armor_gelap := StandardMaterial3D.new()
	mat_armor_gelap.albedo_color = Color("#081226")
	mat_armor_gelap.metallic = 0.85
	mat_armor_gelap.roughness = 0.28

	var mat_armor_terang := StandardMaterial3D.new()
	mat_armor_terang.albedo_color = Color("#132547")
	mat_armor_terang.metallic = 0.82
	mat_armor_terang.roughness = 0.22

	var mat_dek := StandardMaterial3D.new()
	mat_dek.albedo_color = Color("#050B18")
	mat_dek.metallic = 0.78
	mat_dek.roughness = 0.35

	var mat_besi_antena := StandardMaterial3D.new()
	mat_besi_antena.albedo_color = Color("#1E3A6B")
	mat_besi_antena.metallic = 0.9
	mat_besi_antena.roughness = 0.2

	_mat_neon = StandardMaterial3D.new()
	_mat_neon.albedo_color = warna_merah
	_mat_neon.emission_enabled = true
	_mat_neon.emission = warna_merah
	_mat_neon.emission_energy_multiplier = kekuatan_neon

	_mat_portal_dalam = StandardMaterial3D.new()
	_mat_portal_dalam.albedo_color = Color("#24030B")
	_mat_portal_dalam.emission_enabled = true
	_mat_portal_dalam.emission = warna_merah
	_mat_portal_dalam.emission_energy_multiplier = kekuatan_neon * 1.35

	_mat_portal_luar = StandardMaterial3D.new()
	_mat_portal_luar.albedo_color = Color("#59071A")
	_mat_portal_luar.emission_enabled = true
	_mat_portal_luar.emission = warna_merah
	_mat_portal_luar.emission_energy_multiplier = kekuatan_neon * 0.95

	# 1. Platform dasar berlapis, ramp & dek keluar
	_tambah_blok(wadah_visual, "PlatformDasar", Vector3(2.8, 0.24, 3.4), Vector3(-0.2, 0.12, 0.0), mat_armor_gelap)
	_tambah_blok(wadah_visual, "PlatformTingkatDua", Vector3(2.42, 0.11, 3.04), Vector3(-0.24, 0.285, 0.0), mat_armor_terang)
	_tambah_blok(wadah_visual, "BumperBelakang", Vector3(0.18, 0.34, 3.2), Vector3(-1.54, 0.17, 0.0), mat_besi_antena)
	_tambah_blok(wadah_visual, "DekJalanKeluar", Vector3(1.55, 0.14, 2.15), Vector3(1.42, 0.07, 0.0), mat_dek)
	_tambah_blok(wadah_visual, "RampTransisi", Vector3(0.32, 0.18, 1.95), Vector3(0.76, 0.09, 0.0), mat_armor_terang)

	# Strip penanda arah di dek keluar
	for idx in range(4):
		var x_strip := 0.84 + float(idx) * 0.34
		_tambah_blok(wadah_visual, "PenandaArah_%d" % idx, Vector3(0.15, 0.03, 0.76), Vector3(x_strip, 0.15, 0.0), _mat_neon)

	# List neon merah di tepi depan, belakang & samping
	_tambah_blok(wadah_visual, "NeonBelakang", Vector3(0.06, 0.07, 2.5), Vector3(-1.64, 0.24, 0.0), _mat_neon)
	_tambah_blok(wadah_visual, "NeonDepanKiri", Vector3(0.08, 0.07, 0.92), Vector3(2.14, 0.05, -1.02), _mat_neon)
	_tambah_blok(wadah_visual, "NeonDepanKanan", Vector3(0.08, 0.07, 0.92), Vector3(2.14, 0.05, 1.02), _mat_neon)
	_tambah_blok(wadah_visual, "NeonSampingAtas", Vector3(2.45, 0.065, 0.075), Vector3(-0.24, 0.17, -1.72), _mat_neon)
	_tambah_blok(wadah_visual, "NeonSampingBawah", Vector3(2.45, 0.065, 0.075), Vector3(-0.24, 0.17, 1.72), _mat_neon)

	# 2. Gerbang portal merah bertingkat & bersayap di tengah
	_tambah_blok(wadah_visual, "DindingGerbangBelakang", Vector3(1.02, 1.42, 2.28), Vector3(-0.25, 0.98, 0.0), mat_armor_gelap)
	_tambah_blok(wadah_visual, "TiangGerbangAtas", Vector3(1.32, 0.36, 1.78), Vector3(0.12, 1.52, 0.0), mat_armor_terang)
	_tambah_blok(wadah_visual, "SayapGerbangKiri", Vector3(0.68, 0.22, 0.42), Vector3(0.22, 1.44, -1.05), mat_besi_antena)
	_tambah_blok(wadah_visual, "SayapGerbangKanan", Vector3(0.68, 0.22, 0.42), Vector3(0.22, 1.44, 1.05), mat_besi_antena)
	_tambah_blok(wadah_visual, "MahkotaAtas", Vector3(0.62, 0.52, 1.04), Vector3(0.42, 1.86, 0.0), mat_armor_terang)
	_tambah_blok(wadah_visual, "IntiMahkota", Vector3(0.14, 0.28, 0.56), Vector3(0.74, 1.86, 0.0), _mat_neon)
	_tambah_blok(wadah_visual, "LisAtasGerbang", Vector3(0.12, 0.065, 1.68), Vector3(0.79, 1.41, 0.0), _mat_neon)

	# Kedalaman portal berlapis, garis energi vertikal & rel bawah
	_tambah_blok(wadah_visual, "PortalLapisBelakang", Vector3(0.2, 0.94, 1.26), Vector3(0.22, 0.78, 0.0), _mat_portal_luar)
	_tambah_blok(wadah_visual, "PortalLapisInti", Vector3(0.18, 0.78, 0.98), Vector3(0.36, 0.76, 0.0), _mat_portal_dalam)
	_tambah_blok(wadah_visual, "GarisEnergiTengah", Vector3(0.22, 0.84, 0.08), Vector3(0.41, 0.76, 0.0), _mat_neon)
	_tambah_blok(wadah_visual, "RelEnergiPortal", Vector3(0.5, 0.055, 1.32), Vector3(0.42, 0.29, 0.0), _mat_neon)
	_tambah_blok(wadah_visual, "BingkaiPortalAtas", Vector3(0.46, 0.085, 1.48), Vector3(0.42, 1.29, 0.0), _mat_neon)
	_tambah_blok(wadah_visual, "BingkaiPortalKiri", Vector3(0.46, 1.04, 0.085), Vector3(0.42, 0.78, -0.71), _mat_neon)
	_tambah_blok(wadah_visual, "BingkaiPortalKanan", Vector3(0.46, 1.04, 0.085), Vector3(0.42, 0.78, 0.71), _mat_neon)

	# 3. Pilar penjaga kiri & kanan + bahu armor + antena beacon + sirip ventilasi samping
	for idx_z in range(2):
		var side_z := -1.25 if idx_z == 0 else 1.25
		var suf := "Kiri" if idx_z == 0 else "Kanan"

		_tambah_blok(wadah_visual, "PilarBelakangBawah_%s" % suf, Vector3(0.98, 0.8, 0.82), Vector3(-0.35, 0.68, side_z), mat_armor_gelap)
		_tambah_blok(wadah_visual, "PilarBelakangAtas_%s" % suf, Vector3(0.82, 0.6, 0.68), Vector3(-0.35, 1.32, side_z), mat_armor_terang)
		_tambah_blok(wadah_visual, "BahuPilar_%s" % suf, Vector3(0.52, 0.32, 0.24), Vector3(-0.32, 1.15, side_z + (-0.42 if idx_z == 0 else 0.42)), mat_besi_antena)
		_tambah_blok(wadah_visual, "StripPilarBelakang_%s" % suf, Vector3(0.11, 0.88, 0.15), Vector3(0.07, 0.95, side_z), _mat_neon)
		_tambah_blok(wadah_visual, "TopiPilarBelakang_%s" % suf, Vector3(0.6, 0.15, 0.5), Vector3(-0.35, 1.67, side_z), _mat_neon)

		_tambah_blok(wadah_visual, "TiangAntena_%s" % suf, Vector3(0.065, 0.62, 0.065), Vector3(-0.42, 2.02, side_z), mat_besi_antena)
		_tambah_blok(wadah_visual, "BeaconAntena_%s" % suf, Vector3(0.16, 0.16, 0.16), Vector3(-0.42, 2.36, side_z), _mat_neon)

		_tambah_blok(wadah_visual, "PilarDepan_%s" % suf, Vector3(0.86, 0.5, 0.76), Vector3(0.78, 0.5, side_z), mat_armor_terang)
		_tambah_blok(wadah_visual, "LampuPilarDepan_%s" % suf, Vector3(0.36, 0.075, 0.38), Vector3(0.92, 0.77, side_z), _mat_neon)

		var z_luar := side_z + (-0.44 if idx_z == 0 else 0.44)
		for v_idx in range(3):
			var x_vent := -0.88 + float(v_idx) * 0.44
			_tambah_blok(wadah_visual, "SiripVent_%s_%d" % [suf, v_idx], Vector3(0.22, 0.26, 0.15), Vector3(x_vent, 0.45, z_luar), mat_besi_antena)

	# 4. Objek melayang besar & berkarakter di atas base
	_inti_melayang = Node3D.new()
	_inti_melayang.name = "IntiMelayang"
	wadah_visual.add_child(_inti_melayang)
	if Engine.is_editor_hint():
		_inti_melayang.owner = get_tree().edited_scene_root

	_tambah_blok(_inti_melayang, "KristalUtama", Vector3(0.52, 0.88, 0.52), Vector3.ZERO, _mat_neon)
	_tambah_blok(_inti_melayang, "IntiDalamKristal", Vector3(0.28, 0.56, 0.28), Vector3.ZERO, _mat_portal_dalam)
	_tambah_blok(_inti_melayang, "CincinIntiX", Vector3(0.96, 0.08, 0.08), Vector3.ZERO, mat_besi_antena)
	_tambah_blok(_inti_melayang, "CincinIntiZ", Vector3(0.08, 0.08, 0.96), Vector3.ZERO, mat_besi_antena)
	_tambah_blok(_inti_melayang, "PakuAtasKristal", Vector3(0.14, 0.28, 0.14), Vector3(0.0, 0.58, 0.0), mat_armor_terang)
	_tambah_blok(_inti_melayang, "PakuBawahKristal", Vector3(0.14, 0.28, 0.14), Vector3(0.0, -0.58, 0.0), mat_armor_terang)

	_cincin_luar_melayang = Node3D.new()
	_cincin_luar_melayang.name = "CincinLuarMelayang"
	wadah_visual.add_child(_cincin_luar_melayang)
	if Engine.is_editor_hint():
		_cincin_luar_melayang.owner = get_tree().edited_scene_root

	_tambah_blok(_cincin_luar_melayang, "BusurCincinAtas", Vector3(0.12, 0.08, 1.25), Vector3(0.0, 0.62, 0.0), _mat_neon)
	_tambah_blok(_cincin_luar_melayang, "BusurCincinBawah", Vector3(0.12, 0.08, 1.25), Vector3(0.0, -0.62, 0.0), _mat_neon)
	_tambah_blok(_cincin_luar_melayang, "BusurCincinKiri", Vector3(0.12, 1.25, 0.08), Vector3(0.0, 0.0, -0.62), mat_besi_antena)
	_tambah_blok(_cincin_luar_melayang, "BusurCincinKanan", Vector3(0.12, 1.25, 0.08), Vector3(0.0, 0.0, 0.62), mat_besi_antena)

	_satelit_kiri = Node3D.new()
	_satelit_kiri.name = "SatelitKiri"
	wadah_visual.add_child(_satelit_kiri)
	if Engine.is_editor_hint():
		_satelit_kiri.owner = get_tree().edited_scene_root
	_tambah_blok(_satelit_kiri, "BadanSatelitKiri", Vector3(0.36, 0.26, 0.36), Vector3.ZERO, mat_armor_terang)
	_tambah_blok(_satelit_kiri, "IntiSatelitKiri", Vector3(0.42, 0.1, 0.18), Vector3.ZERO, _mat_neon)
	_tambah_blok(_satelit_kiri, "SayapSatelitKiriAtas", Vector3(0.14, 0.42, 0.06), Vector3(0.0, 0.28, -0.14), mat_besi_antena)
	_tambah_blok(_satelit_kiri, "SayapSatelitKiriBawah", Vector3(0.14, 0.42, 0.06), Vector3(0.0, -0.28, -0.14), mat_besi_antena)

	_satelit_kanan = Node3D.new()
	_satelit_kanan.name = "SatelitKanan"
	wadah_visual.add_child(_satelit_kanan)
	if Engine.is_editor_hint():
		_satelit_kanan.owner = get_tree().edited_scene_root
	_tambah_blok(_satelit_kanan, "BadanSatelitKanan", Vector3(0.36, 0.26, 0.36), Vector3.ZERO, mat_armor_terang)
	_tambah_blok(_satelit_kanan, "IntiSatelitKanan", Vector3(0.42, 0.1, 0.18), Vector3.ZERO, _mat_neon)
	_tambah_blok(_satelit_kanan, "SayapSatelitKananAtas", Vector3(0.14, 0.42, 0.06), Vector3(0.0, 0.28, 0.14), mat_besi_antena)
	_tambah_blok(_satelit_kanan, "SayapSatelitKananBawah", Vector3(0.14, 0.42, 0.06), Vector3(0.0, -0.28, 0.14), mat_besi_antena)

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
	box_shape.size = Vector3(4.25, 2.45, 3.65) * skala_base
	col_node.shape = box_shape
	col_node.position = Vector3(0.1, 1.225 * skala_base, 0.0)

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
