extends Path2D
class_name EnemyPath

var map_type := "":
	set(val):
		map_type = val
		var level: Dictionary = Data.levels[val]
		wave_indices = level["waves"].duplicate()
		max_waves = wave_indices.size()
		if is_inside_tree() and max_waves > 0:
			$WaveDelayTimer.start()

var wave_indices: Array = []
var max_waves := 0
var current_wave := 0
var enemies_to_spawn: Array[String] = []
var current_wave_data: Dictionary = {}
var enemies_spawned_this_wave := 0
var killed_this_wave := 0

func _ready():
	if max_waves > 0 and $WaveDelayTimer.is_stopped():
		$WaveDelayTimer.start()

func _on_wave_delay_timer_timeout():
	if current_wave >= max_waves:
		return
	current_wave += 1
	killed_this_wave = 0
	enemies_spawned_this_wave = 0
	current_wave_data = Data.waves[wave_indices[current_wave - 1]]
	_build_spawn_list()
	Globals.waveStarted.emit(current_wave, enemies_to_spawn.size())
	$SpawnDelay.wait_time = maxf(float(current_wave_data.get("interval", 1.0)), 0.1)
	$SpawnDelay.start()

func _build_spawn_list():
	enemies_to_spawn.clear()
	for tipe in ["normal", "cepat", "tank", "berlapis", "antilambat", "boss"]:
		var jumlah: int = int(current_wave_data.get(tipe, 0))
		for _i in jumlah:
			enemies_to_spawn.append(tipe)

func _on_spawn_delay_timeout():
	if enemies_spawned_this_wave < enemies_to_spawn.size():
		spawn_new_enemy()
		$SpawnDelay.start()

func spawn_new_enemy():
	var enemyScene := preload("res://Scenes/enemies/enemy_mover.tscn")
	var enemy = enemyScene.instantiate()
	enemy.enemy_type = enemies_to_spawn[enemies_spawned_this_wave]
	add_child(enemy)
	enemies_spawned_this_wave += 1

func enemy_destroyed():
	killed_this_wave += 1
	Globals.enemyDestroyed.emit(maxi(enemies_to_spawn.size() - killed_this_wave, 0))
	check_wave_clear()

func check_wave_clear():
	if enemies_spawned_this_wave < enemies_to_spawn.size():
		return
	if killed_this_wave < enemies_to_spawn.size():
		return
	if current_wave >= max_waves:
		Globals.selesaikan_level(true)
		return
	Globals.waveCleared.emit($WaveDelayTimer.wait_time)
	$WaveDelayTimer.start()
