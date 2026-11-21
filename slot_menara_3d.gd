@tool
extends Node3D

const POSISI_TARGET_SLOT: Array[Vector3] = [
	Vector3(-9.8,  0.0,  2.85),  # slot1: sisi bawah pangkal keluar BaseMusuh
	Vector3(-9.8,  0.0, -3.55),  # slot2: sisi atas/kiri tanjakan lengkungan pertama
	Vector3(-6.4,  0.0, -2.55),  # slot3: sisi bawah/dalam lengkungan atas
	Vector3(-2.6,  0.0, -5.85),  # slot4: sisi atas puncak lengkungan besar
	Vector3(-4.6,  0.0,  2.55),  # slot5: sisi kiri/dalam jalur turun ke bawah
	Vector3(-0.6,  0.0, -2.35),  # slot6: sisi kanan/luar jalur turun ke bawah
	Vector3( 5.8,  0.0,  3.25),  # slot7: area hijau (bawah jalur kanan)
	Vector3( 1.2,  0.0,  3.15),  # slot8: area ungu (tikungan bawah)
	Vector3( 7.6,  0.0, -2.35)   # slot9: sisi atas jalur lurus menjelang BaseKita
]

@export var jalur_node: NodePath:
	set(val):
		jalur_node = val
		_bangun_semua_slot()

# Jarak bersih tepat 0.5 dari tepi luar garis neon jalan ke tepi pad slot
@export_range(0.0, 2.5, 0.05) var jarak_dari_jalan: float = 0.5:
	set(val):
		jarak_dari_jalan = val
		_bangun_semua_slot()

@export var setengah_lebar_neon_jalan: float = 1.25:
	set(val):
		setengah_lebar_neon_jalan = val
		_bangun_semua_slot()

@export var hadapkan_ke_jalan: bool = true:
	set(val):
		hadapkan_ke_jalan = val
		_bangun_semua_slot()

@export var daftar_slot: Array[Vector3] = [
	Vector3(-9.8,  0.0,  2.85),
	Vector3(-9.8,  0.0, -3.55),
	Vector3(-6.4,  0.0, -2.55),
	Vector3(-2.6,  0.0, -5.85),
	Vector3(-4.6,  0.0,  2.55),
	Vector3(-0.6,  0.0, -2.35),
	Vector3( 5.8,  0.0,  3.25),
	Vector3( 1.2,  0.0,  3.15),
	Vector3( 7.6,  0.0, -2.35)
]:
	set(val):
		daftar_slot = val
		_bangun_semua_slot()

@export var ukuran_pad: Vector2 = Vector2(1.3, 1.3):
	set(val):
		ukuran_pad = val
		_bangun_semua_slot()

@export var warna_neon: Color = Color("#00F0FF"):
	set(val):
		warna_neon = val
		_bangun_semua_slot()

@export var kekuatan_neon: float = 2.4:
	set(val):
		kekuatan_neon = val
		_bangun_semua_slot()

@export var terapkan_jarak_0_5_sekarang: bool = false:
	set(val):
		if val:
			jarak_dari_jalan = 0.5
			hadapkan_ke_jalan = true
			daftar_slot = POSISI_TARGET_SLOT.duplicate()
			_bangun_semua_slot()
			terapkan_jarak_0_5_sekarang = false

func _ready() -> void:
	_bangun_semua_slot()

func _cari_path3d() -> Path3D:
	if not jalur_node.is_empty():
		var target := get_node_or_null(jalur_node)
		if target is Path3D:
			return target
		if target:
			var sub := target.get_node_or_null("SistemJalur/JalurMusuh") as Path3D
			if sub:
				return sub
			var found := target.find_child("JalurMusuh", true, false) as Path3D
			if found:
				return found

	var akar: Node = get_tree().edited_scene_root if Engine.is_editor_hint() else get_tree().current_scene
	if akar:
		return akar.find_child("JalurMusuh", true, false) as Path3D
	return null

func _posisikan_tepat_0_5_dari_jalan(path_ref: Path3D, pos_lokal: Vector3) -> Dictionary:
	var setengah_pad := maxf(ukuran_pad.x, ukuran_pad.y) * 0.5
	var jarak_pusat_tepat := setengah_lebar_neon_jalan + setengah_pad + jarak_dari_jalan
	var pos_datar := Vector3(pos_lokal.x, 0.0, pos_lokal.z)

	if path_ref == null or path_ref.curve == null or path_ref.curve.get_baked_length() < 0.5:
		return {
			"posisi": pos_datar,
			"target_hadap": pos_datar + Vector3.FORWARD
		}

	var curve: Curve3D = path_ref.curve
	var panjang := curve.get_baked_length()
	var pos_di_path := path_ref.to_local(to_global(pos_datar))
	pos_di_path.y = 0.0

	# Cari titik terdekat di kurva untuk menentukan sisi & arah hadap
	var jarak_terdekat := INF
	var offset_terdekat := 0.0
	var titik_jalur := curve.sample_baked(0.0)
	titik_jalur.y = 0.0
	var langkah := 240
	for s in range(langkah + 1):
		var d := (float(s) / float(langkah)) * panjang
		var p_sample := curve.sample_baked(d)
		p_sample.y = 0.0
		var dist := pos_di_path.distance_to(p_sample)
		if dist < jarak_terdekat:
			jarak_terdekat = dist
			offset_terdekat = d
			titik_jalur = p_sample

	var arah_keluar := Vector3(pos_di_path.x - titik_jalur.x, 0.0, pos_di_path.z - titik_jalur.z)
	if arah_keluar.length_squared() < 0.0001:
		var p1 := curve.sample_baked(maxf(0.0, offset_terdekat - 0.2))
		var p2 := curve.sample_baked(minf(panjang, offset_terdekat + 0.2))
		var tangen := Vector3(p2.x - p1.x, 0.0, p2.z - p1.z).normalized()
		arah_keluar = Vector3(-tangen.z, 0.0, tangen.x)
	else:
		arah_keluar = arah_keluar.normalized()

	# Tempatkan pusat slot tepat pada jarak_pusat_tepat dari titik jalur terdekat
	var posisi_path_final := titik_jalur + (arah_keluar * jarak_pusat_tepat)

	var pos_lokal_final := to_local(path_ref.to_global(posisi_path_final))
	pos_lokal_final.y = 0.0

	var target_hadap_lokal := to_local(path_ref.to_global(titik_jalur))
	target_hadap_lokal.y = 0.0

	return {
		"posisi": pos_lokal_final,
		"target_hadap": target_hadap_lokal
	}

func _bangun_semua_slot() -> void:
	if not is_inside_tree():
		return

	for child in get_children():
		child.queue_free()

	var path_ref := _cari_path3d()

	var mat_dasar := StandardMaterial3D.new()
	mat_dasar.albedo_color = Color("#111C2E")
	mat_dasar.metallic = 0.75
	mat_dasar.roughness = 0.35

	var mat_plus := StandardMaterial3D.new()
	mat_plus.albedo_color = warna_neon
	mat_plus.emission_enabled = true
	mat_plus.emission = warna_neon
	mat_plus.emission_energy_multiplier = kekuatan_neon

	for i in range(daftar_slot.size()):
		var info := _posisikan_tepat_0_5_dari_jalan(path_ref, daftar_slot[i])
		var pos_slot: Vector3 = info["posisi"]
		var target_hadap: Vector3 = info["target_hadap"]

		var slot_body := StaticBody3D.new()
		slot_body.name = "slot%d" % (i + 1)
		slot_body.position = pos_slot
		slot_body.set_meta("terisi", false)
		slot_body.set_meta("index_slot", i)
		add_child(slot_body)
		if Engine.is_editor_hint() and get_tree().edited_scene_root:
			slot_body.owner = get_tree().edited_scene_root

		if hadapkan_ke_jalan and pos_slot.distance_to(target_hadap) > 0.01:
			slot_body.look_at(to_global(target_hadap), Vector3.UP)
			slot_body.rotation.x = 0.0
			slot_body.rotation.z = 0.0

		var col := CollisionShape3D.new()
		col.name = "CollisionShape3D"
		var box_col := BoxShape3D.new()
		box_col.size = Vector3(ukuran_pad.x, 0.25, ukuran_pad.y)
		col.shape = box_col
		col.position = Vector3(0.0, 0.125, 0.0)
		slot_body.add_child(col)
		if Engine.is_editor_hint() and get_tree().edited_scene_root:
			col.owner = get_tree().edited_scene_root

		var visual := Node3D.new()
		visual.name = "VisualSlot"
		slot_body.add_child(visual)
		if Engine.is_editor_hint() and get_tree().edited_scene_root:
			visual.owner = get_tree().edited_scene_root

		_tambah_blok(visual, "AlasPad", Vector3(ukuran_pad.x, 0.08, ukuran_pad.y), Vector3(0.0, 0.04, 0.0), mat_dasar)

		# Hanya tanda '+' di tengah kotak slot
		_tambah_blok(visual, "PlusHorizontal", Vector3(0.36, 0.035, 0.07), Vector3(0.0, 0.095, 0.0), mat_plus)
		_tambah_blok(visual, "PlusVertikal", Vector3(0.07, 0.035, 0.36), Vector3(0.0, 0.095, 0.0), mat_plus)

func _tambah_blok(parent: Node3D, nama: String, ukuran: Vector3, pos: Vector3, mat: Material) -> void:
	var mi := MeshInstance3D.new()
	mi.name = nama
	var box := BoxMesh.new()
	box.size = ukuran
	mi.mesh = box
	mi.position = pos
	mi.material_override = mat
	parent.add_child(mi)
	if Engine.is_editor_hint() and get_tree().edited_scene_root:
		mi.owner = get_tree().edited_scene_root
