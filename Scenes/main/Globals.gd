extends Node

signal goldChanged(newGold)
signal baseHpChanged(newHp, maxHp)
signal waveStarted(wave_count, enemy_count)
signal waveCleared(wait_time)
signal enemyDestroyed(remain)
signal permainan_selesai(menang)
signal boss_muncul(nama, hp)
signal boss_hp_berubah(hp, max_hp)
signal boss_mati
signal menara_dipilih(tipe)

var selected_level: int = 0
var selected_map: String = ""
var mainNode: Node2D
var turretsNode: Node2D
var projectilesNode: Node2D
var currentMap: Node2D
var hud: Control
var game_running: bool = false
var game_over: bool = false

func mulai_permainan() -> void:
	game_running = true
	game_over = false

func selesaikan_level(menang: bool) -> void:
	if game_over:
		return
	game_over = true
	game_running = false
	if menang:
		LevelManager.selesaikan_level(LevelManager.indeks_terpilih)
	permainan_selesai.emit(menang)

func restart_current_level() -> void:
	get_tree().paused = false
	game_over = false
	game_running = true
	get_tree().reload_current_scene()
