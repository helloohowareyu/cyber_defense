extends Node

const PATH_SETTINGS: String = "user://settings.cfg"
const BUS_MASTER: String = "Master"
const BUS_MUSIC: String = "Music"
const BUS_SFX: String = "SFX"
const PENGUATAN_MASTER: float = 2.5

var volume_master: float = 1.0
var volume_music: float = 1.0
var volume_sfx: float = 1.0
var fullscreen: bool = false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_siapkan_limiter()
	muat()
	terapkan_semua()

func muat() -> void:
	var config := ConfigFile.new()
	if config.load(PATH_SETTINGS) != OK:
		return
	volume_master = clampf(float(config.get_value("audio", "master", volume_master)), 0.0, 1.0)
	volume_music = clampf(float(config.get_value("audio", "music", volume_music)), 0.0, 1.0)
	volume_sfx = clampf(float(config.get_value("audio", "sfx", volume_sfx)), 0.0, 1.0)
	fullscreen = bool(config.get_value("video", "fullscreen", fullscreen))

func simpan() -> void:
	var config := ConfigFile.new()
	config.set_value("audio", "master", volume_master)
	config.set_value("audio", "music", volume_music)
	config.set_value("audio", "sfx", volume_sfx)
	config.set_value("video", "fullscreen", fullscreen)
	config.save(PATH_SETTINGS)

func set_volume_master(nilai: float) -> void:
	volume_master = clampf(nilai, 0.0, 1.0)
	_terapkan_bus(BUS_MASTER, volume_master, PENGUATAN_MASTER)
	simpan()

func set_volume_music(nilai: float) -> void:
	volume_music = clampf(nilai, 0.0, 1.0)
	_terapkan_bus(BUS_MUSIC, volume_music)
	simpan()

func set_volume_sfx(nilai: float) -> void:
	volume_sfx = clampf(nilai, 0.0, 1.0)
	_terapkan_bus(BUS_SFX, volume_sfx)
	simpan()

func set_fullscreen(nilai: bool) -> void:
	fullscreen = nilai
	_terapkan_layar_penuh()
	simpan()

func reset() -> void:
	volume_master = 1.0
	volume_music = 1.0
	volume_sfx = 1.0
	fullscreen = false
	terapkan_semua()
	simpan()

func terapkan_semua() -> void:
	_terapkan_bus(BUS_MASTER, volume_master, PENGUATAN_MASTER)
	_terapkan_bus(BUS_MUSIC, volume_music)
	_terapkan_bus(BUS_SFX, volume_sfx)
	_terapkan_layar_penuh()

func _terapkan_bus(nama: String, nilai: float, penguatan: float = 1.0) -> void:
	var indeks: int = AudioServer.get_bus_index(nama)
	if indeks < 0:
		return
	AudioServer.set_bus_mute(indeks, nilai <= 0.001)
	AudioServer.set_bus_volume_db(indeks, linear_to_db(maxf(nilai * penguatan, 0.001)))

func _siapkan_limiter() -> void:
	var indeks: int = AudioServer.get_bus_index(BUS_MASTER)
	if indeks < 0:
		return
	for i in range(AudioServer.get_bus_effect_count(indeks)):
		if AudioServer.get_bus_effect(indeks, i) is AudioEffectHardLimiter:
			return
	var limiter := AudioEffectHardLimiter.new()
	limiter.ceiling_db = -0.5
	limiter.release = 0.1
	AudioServer.add_bus_effect(indeks, limiter)

func _terapkan_layar_penuh() -> void:
	if DisplayServer.get_name() == "headless":
		return
	var mode: DisplayServer.WindowMode = DisplayServer.WINDOW_MODE_FULLSCREEN if fullscreen else DisplayServer.WINDOW_MODE_WINDOWED
	DisplayServer.window_set_mode(mode)
