extends Node2D

@onready var camera: Camera2D = $Camera2D
@onready var hud = $UI/HUD
@onready var pause_menu = $UI/PauseMenu
@onready var settings = $UI/Settings
@onready var credits = $UI/Credits
@onready var result_screen = $UI/ResultScreen
@onready var build_manager = $BuildManager

var _level_index := 0

func _ready():
	Globals.mainNode = self
	if LevelManager.level_sekarang().is_empty():
		LevelManager.pilih_level(0)
	var level_id: String = LevelManager.level_sekarang()
	var data: Dictionary = Data.levels[level_id]
	_level_index = LevelManager.indeks_terpilih
	Globals.selected_map = level_id
	Globals.selected_level = _level_index
	var map_scene := load(data["scene"])
	var map = map_scene.instantiate()
	map.map_type = level_id
	add_child(map)
	_siapkan_kamera(map)
	Globals.menara_dipilih.connect(build_manager.mulai_bangun)
	hud.pause_ditekan.connect(_on_pause)
	pause_menu.lanjut_ditekan.connect(_on_resume)
	pause_menu.pengaturan_ditekan.connect(_on_settings)
	pause_menu.kredit_ditekan.connect(_on_credits)
	pause_menu.menu_ditekan.connect(_on_menu)
	settings.kembali_ditekan.connect(_on_settings_back)
	credits.kembali_ditekan.connect(_on_credits_back)
	result_screen.lanjut_ditekan.connect(_on_result_next)
	result_screen.ulang_ditekan.connect(_on_result_retry)
	result_screen.menu_ditekan.connect(_on_result_menu)
	Globals.permainan_selesai.connect(_on_game_ended)
	hud.refresh()
	Sfx.pulihkan_musik()
	Sfx.mainkan_musik()

func _siapkan_kamera(map: Node2D) -> void:
	camera.position = Vector2.ZERO
	get_viewport().size_changed.connect(_sesuaikan_zoom.bind(map))
	_sesuaikan_zoom(map)

# Peta mengisi seluruh area layar (cover), berpusat di (0,0). Tanpa zoom/pan manual.
func _sesuaikan_zoom(map: Node2D) -> void:
	var bg: Sprite2D = map.get_node("Background")
	var ukuran: Vector2 = bg.texture.get_size() * bg.scale
	var layar: Vector2 = get_viewport().get_visible_rect().size
	camera.zoom = Vector2.ONE * maxf(layar.x / ukuran.x, layar.y / ukuran.y)

func _unhandled_input(event):
	if get_tree().paused or Globals.game_over:
		return
	if event.is_action_pressed("ui_cancel"):
		_on_pause()

func _on_pause():
	if Globals.game_over or get_tree().paused:
		return
	get_tree().paused = true
	pause_menu.tampilkan()
	Sfx.jedakan_musik_pause()
	build_manager.batal()

func _on_resume():
	get_tree().paused = false
	pause_menu.sembunyikan()
	Sfx.pulihkan_musik()

func _on_settings():
	pause_menu.sembunyikan()
	settings.tampilkan()

func _on_settings_back():
	settings.sembunyikan()
	pause_menu.tampilkan()

func _on_credits():
	pause_menu.sembunyikan()
	credits.tampilkan()

func _on_credits_back():
	credits.sembunyikan()
	pause_menu.tampilkan()

func _on_menu():
	get_tree().paused = false
	Sfx.pulihkan_musik()
	get_tree().change_scene_to_file("res://Scenes/ui/mainMenu/mainMenu.tscn")

func _on_game_ended(menang: bool):
	build_manager.batal()
	pause_menu.sembunyikan()
	settings.sembunyikan()
	credits.sembunyikan()
	var ada_lanjut: bool = _level_index + 1 < LevelManager.daftar_level.size()
	result_screen.tampilkan(menang, ada_lanjut)
	get_tree().paused = true
	if menang:
		Sfx.play("victory", -2.0)
	else:
		Sfx.play("defeat", -2.0)
	Sfx.redupkan_musik_hasil()

func _on_result_next():
	get_tree().paused = false
	Sfx.pulihkan_musik()
	LevelManager.pilih_level(_level_index + 1)
	get_tree().reload_current_scene()

func _on_result_retry():
	get_tree().paused = false
	Sfx.pulihkan_musik()
	get_tree().reload_current_scene()

func _on_result_menu():
	get_tree().paused = false
	Sfx.pulihkan_musik()
	get_tree().change_scene_to_file("res://Scenes/ui/mainMenu/mainMenu.tscn")
