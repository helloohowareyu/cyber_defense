extends Node

const PATH_PROGRESS: String = "user://progress.cfg"

var daftar_level: Array[String] = []
var indeks_terpilih: int = 0
var level_terbuka: int = 1

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_muat_level()
	_muat_progress()

func _muat_level() -> void:
	daftar_level.clear()
	for id in Data.levels.keys():
		daftar_level.append(str(id))

func level_sekarang() -> String:
	if indeks_terpilih < 0 or indeks_terpilih >= daftar_level.size():
		return ""
	return daftar_level[indeks_terpilih]

func level_data() -> Dictionary:
	var id: String = level_sekarang()
	if id.is_empty():
		return {}
	return Data.levels[id]

func apakah_terbuka(indeks: int) -> bool:
	return indeks >= 0 and indeks < daftar_level.size() and indeks < level_terbuka

func pilih_level(indeks: int) -> bool:
	if not apakah_terbuka(indeks):
		return false
	indeks_terpilih = indeks
	Globals.selected_level = indeks
	Globals.selected_map = daftar_level[indeks]
	return true

func selesaikan_level(indeks: int) -> void:
	if indeks < 0 or indeks >= daftar_level.size():
		return
	if indeks + 1 < daftar_level.size() and level_terbuka < indeks + 2:
		level_terbuka = indeks + 2
		simpan_progress()

func reset_progress() -> void:
	level_terbuka = 1
	indeks_terpilih = 0
	simpan_progress()

func muat_progress() -> void:
	_muat_progress()

func simpan_progress() -> void:
	var config := ConfigFile.new()
	config.set_value("progress", "level_terbuka", level_terbuka)
	config.save(PATH_PROGRESS)

func _muat_progress() -> void:
	var config := ConfigFile.new()
	if config.load(PATH_PROGRESS) != OK:
		return
	var maksimal: int = maxi(daftar_level.size(), 1)
	level_terbuka = clampi(int(config.get_value("progress", "level_terbuka", 1)), 1, maksimal)
