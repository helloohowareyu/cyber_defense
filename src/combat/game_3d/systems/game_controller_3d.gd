class_name GameController3D
extends Node
## Pengendali pusat simulasi dan alur pertandingan CYBER DEFENSE 3D.
##
## [FUNGSI_MODUL]: Mengorkestrasi siklus match (MENU, PLAYING, PAUSED, VICTORY, GAME_OVER),
##   penempatan/upgrade/penjualan menara, loop combat per frame pada seluruh menara aktif,
##   pemijahan musuh wave 1-5, kontrol kecepatan 1x/2x & pause, serta persistensi hasil.
## [REFERENSI_KURIKULUM]: GDD Bagian 3, 4, 7, 8, 9, dan 16.
## [ARAH_INTERAKSI]: Menghubungkan MapGrid3D, EnergyCore3D, Tower3D, Enemy3D, VFXManager3D,
##   EconomyManager3D, WaveSpawner3D, AudioBridge3D, dan lapisan UI.

## [FUNGSI]: Status siklus permainan saat ini.
enum GameState {
	MENU = 0,
	PLAYING = 1,
	PAUSED = 2,
	VICTORY = 3,
	GAME_OVER = 4,
}

## [FUNGSI]: Dipancarkan setiap kali state permainan berpindah.
signal state_changed(new_state: int)
## [FUNGSI]: Dipancarkan saat menara dipilih pemain untuk membuka panel inspeksi UI.
signal tower_selected_for_ui(tower: Tower3D)
## [FUNGSI]: Dipancarkan saat seleksi menara dibatalkan atau menara dijual.
signal tower_deselected()
## [FUNGSI]: Dipancarkan saat jenis menara mode pembangunan berubah (kosong jika batal).
signal build_mode_changed(tower_key: String)
## [FUNGSI]: Dipancarkan saat HP Energy Core mencapai 0 dengan ringkasan statistik match.
signal game_over(summary: Dictionary)
## [FUNGSI]: Dipancarkan saat Wave 5 tuntas dengan Core selamat beserta ringkasan statistik.
signal victory(summary: Dictionary)
## [FUNGSI]: Dipancarkan untuk menyampaikan pesan umpan balik singkat ke HUD.
signal status_message(msg: String)

var _state: GameState = GameState.MENU
var _map: MapGrid3D = null
var _core: EnergyCore3D = null
var _towers_parent: Node3D = null
var _enemies_parent: Node3D = null
var _vfx: VFXManager3D = null
var _economy: EconomyManager3D = null
var _spawner: WaveSpawner3D = null
var _audio: AudioBridge3D = null

var _selected_build_tower: String = ""
var _selected_tower: Tower3D = null
var _game_speed: float = 1.0
var _grid_tower_map: Dictionary = {}


## [FUNGSI]: Menjalankan loop combat menara dan fallback tick spawner saat status PLAYING.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	if _state != GameState.PLAYING:
		return
	if _spawner != null and (not _spawner.is_inside_tree() or not _spawner.is_processing()):
		_spawner.tick(delta)
	var candidates: Array[CombatTargetComponent] = _collect_alive_target_components()
	for tower: Tower3D in get_active_towers():
		tower.update_combat(delta, candidates)


## [FUNGSI]: Memastikan Engine.time_scale dan status pause tree pulih saat node keluar dari tree.
## [INPUT/OUTPUT]: - -> void
func _exit_tree() -> void:
	Engine.time_scale = 1.0
	var tree: SceneTree = _get_tree_safe()
	if tree != null:
		tree.paused = false


## [FUNGSI]: Mengakses SceneTree secara aman tanpa memicu error bila node belum di dalam tree.
## [INPUT/OUTPUT]: - -> SceneTree
func _get_tree_safe() -> SceneTree:
	if is_inside_tree():
		return get_tree()
	return Engine.get_main_loop() as SceneTree


## [FUNGSI]: Menyuntikkan referensi seluruh subsistem dunia dan simulasi serta menghubungkan sinyalnya.
## [INPUT/OUTPUT]: map, core, towers_parent, enemies_parent, vfx, economy, spawner, audio -> void
func initialize_systems(
	map: MapGrid3D,
	core: EnergyCore3D,
	towers_parent: Node3D,
	enemies_parent: Node3D,
	vfx: VFXManager3D,
	economy: EconomyManager3D,
	spawner: WaveSpawner3D,
	audio: AudioBridge3D
) -> void:
	_map = map
	_core = core
	_towers_parent = towers_parent
	_enemies_parent = enemies_parent
	_vfx = vfx
	_economy = economy
	_spawner = spawner
	_audio = audio

	if _core != null:
		if not _core.core_destroyed.is_connected(_on_core_destroyed):
			_core.core_destroyed.connect(_on_core_destroyed)
		if not _core.core_damaged.is_connected(_on_core_damaged):
			_core.core_damaged.connect(_on_core_damaged)

	if _spawner != null:
		if not _spawner.enemy_spawn_requested.is_connected(_on_spawner_enemy_requested):
			_spawner.enemy_spawn_requested.connect(_on_spawner_enemy_requested)
		if not _spawner.wave_cleared.is_connected(_on_spawner_wave_cleared):
			_spawner.wave_cleared.connect(_on_spawner_wave_cleared)
		if not _spawner.all_waves_cleared.is_connected(_on_spawner_all_waves_cleared):
			_spawner.all_waves_cleared.connect(_on_spawner_all_waves_cleared)

	if _towers_parent != null and not _towers_parent.child_entered_tree.is_connected(_on_towers_container_child_entered):
		_towers_parent.child_entered_tree.connect(_on_towers_container_child_entered)

	if _audio != null:
		_audio.stop_2d_menu_music_if_active()


## [FUNGSI]: Memulai match baru dengan mereset peta, Energy Core, ekonomi, spawner, VFX, dan speed.
## [INPUT/OUTPUT]: - -> void
func start_new_game() -> void:
	deselect_tower()
	cancel_build_mode()
	_clear_all_entities()
	_grid_tower_map.clear()

	if _map != null:
		_map.reset_grid()
	if _core != null:
		_core.reset_core()
	if _economy != null:
		_economy.reset()
	if _spawner != null:
		_spawner.reset()
		_spawner.set_process(true)
	if _vfx != null:
		_vfx.clear_all()

	_game_speed = 1.0
	Engine.time_scale = 1.0
	var tree: SceneTree = _get_tree_safe()
	if tree != null:
		tree.paused = false

	_set_state(GameState.PLAYING)
	if _audio != null:
		_audio.stop_2d_menu_music_if_active()
		_audio.play_sfx("ui_click")


## [FUNGSI]: Mengembalikan permainan ke menu utama, membersihkan seleksi, dan mereset time_scale/pause.
## [INPUT/OUTPUT]: - -> void
func return_to_menu() -> void:
	deselect_tower()
	cancel_build_mode()
	_clear_all_entities()
	_grid_tower_map.clear()
	if _map != null:
		_map.reset_grid()
	if _spawner != null:
		_spawner.reset()
		_spawner.set_process(false)
	if _vfx != null:
		_vfx.clear_all()

	_game_speed = 1.0
	Engine.time_scale = 1.0
	var tree: SceneTree = _get_tree_safe()
	if tree != null:
		tree.paused = false
	_set_state(GameState.MENU)


## [FUNGSI]: Mengembalikan enum GameState permainan saat ini.
## [INPUT/OUTPUT]: - -> GameState
func get_state() -> GameState:
	return _state


## [FUNGSI]: Mengaktifkan mode pembangunan menara untuk jenis kunci tertentu.
## [INPUT/OUTPUT]: tower_key (String) -> void
func select_build_tower(tower_key: String) -> void:
	var clean_key: String = tower_key.strip_edges().to_lower()
	_selected_build_tower = clean_key
	if not _selected_build_tower.is_empty():
		deselect_tower()
	build_mode_changed.emit(_selected_build_tower)


## [FUNGSI]: Membatalkan mode pembangunan menara dan menyembunyikan preview hover peta.
## [INPUT/OUTPUT]: - -> void
func cancel_build_mode() -> void:
	var had_key: bool = not _selected_build_tower.is_empty()
	_selected_build_tower = ""
	if _map != null:
		_map.clear_hover_preview()
	if had_key:
		build_mode_changed.emit("")


## [FUNGSI]: Mengembalikan kunci jenis menara yang sedang dipilih untuk dibangun.
## [INPUT/OUTPUT]: - -> String
func get_selected_build_tower() -> String:
	return _selected_build_tower


## [FUNGSI]: Memvalidasi state, grid, dan saldo Gold lalu menempatkan Tower3D baru di peta.
## [INPUT/OUTPUT]: grid_pos (Vector2i), tower_key (String) -> Tower3D
func try_place_tower_at_grid(grid_pos: Vector2i, tower_key: String = "") -> Tower3D:
	if _state != GameState.PLAYING:
		return null

	var clean_arg: String = tower_key.strip_edges().to_lower()
	var key: String = clean_arg if not clean_arg.is_empty() else _selected_build_tower
	if key.is_empty() or _map == null:
		return null

	if not _map.can_place_at(grid_pos) or get_tower_at_grid(grid_pos) != null:
		status_message.emit("Cannot place tower here!")
		return null

	var preset_path: String = GameConstants3D.get_tower_preset_path(key)
	if preset_path.is_empty() or not ResourceLoader.exists(preset_path):
		return null

	var preset: TowerStatsData = ResourceLoader.load(preset_path) as TowerStatsData
	if preset == null:
		return null

	if _economy != null:
		if not _economy.can_afford(preset.base_cost):
			status_message.emit("Not enough gold!")
			return null
		if not _economy.try_spend_gold(preset.base_cost):
			return null

	var world_pos: Vector3 = _map.grid_to_world(grid_pos)
	var tower := Tower3D.new()
	tower.stats_data = preset
	tower.total_invested_gold = preset.base_cost
	tower.position = world_pos

	var container: Node = _towers_parent if _towers_parent != null else self
	container.add_child(tower)
	if tower.is_inside_tree():
		tower.global_position = world_pos
	tower.set_process(false)

	_map.set_cell_occupied(grid_pos, true)
	_grid_tower_map[grid_pos] = tower

	tower.tower_selected.connect(select_tower)
	tower.tower_fired.connect(_on_tower_fired)
	tower.tower_upgraded.connect(_on_tower_upgraded)

	if _vfx != null:
		_vfx.spawn_build_pulse(world_pos, preset.accent_color)
	if _audio != null:
		_audio.play_sfx("tower_place")

	return tower


## [FUNGSI]: Memilih satu menara secara eksklusif dan menyinkronkan visibilitas Range Ring.
## [INPUT/OUTPUT]: tower (Tower3D) -> void
func select_tower(tower: Tower3D) -> void:
	if _selected_tower != null and is_instance_valid(_selected_tower):
		_selected_tower.set_range_indicator_visible(false)

	if tower != null and is_instance_valid(tower) and not tower.is_queued_for_deletion():
		_selected_tower = tower
		cancel_build_mode()
		_selected_tower.set_range_indicator_visible(true)
		tower_selected_for_ui.emit(_selected_tower)
	else:
		_selected_tower = null
		tower_deselected.emit()


## [FUNGSI]: Menutup seleksi menara aktif dan menyembunyikan Range Ring.
## [INPUT/OUTPUT]: - -> void
func deselect_tower() -> void:
	select_tower(null)


## [FUNGSI]: Mengembalikan menara yang sedang dipilih pemain, atau null bila tidak ada.
## [INPUT/OUTPUT]: - -> Tower3D
func get_selected_tower() -> Tower3D:
	if _selected_tower != null and is_instance_valid(_selected_tower) and not _selected_tower.is_queued_for_deletion():
		return _selected_tower
	return null


## [FUNGSI]: Menaikkan level menara terpilih jika status PLAYING, belum max level, dan Gold cukup.
## [INPUT/OUTPUT]: - -> bool
func upgrade_selected_tower() -> bool:
	if _state != GameState.PLAYING:
		return false
	var target_tower: Tower3D = get_selected_tower()
	if target_tower == null:
		return false
	if not target_tower.can_upgrade():
		status_message.emit("Tower already at maximum level!")
		return false

	var cost: int = target_tower.get_next_upgrade_cost()
	if _economy != null:
		if not _economy.can_afford(cost):
			status_message.emit("Not enough gold for upgrade!")
			return false
		if not _economy.try_spend_gold(cost):
			return false

	if not target_tower.apply_upgrade():
		return false
	if _audio != null:
		_audio.play_sfx("upgrade")

	tower_selected_for_ui.emit(target_tower)
	return true


## [FUNGSI]: Menjual menara terpilih, mengembalikan 70% Gold, membebaskan sel grid, dan menghapus node.
## [INPUT/OUTPUT]: - -> int
func sell_selected_tower() -> int:
	if _state != GameState.PLAYING:
		return 0
	var old_tower: Tower3D = get_selected_tower()
	if old_tower == null:
		return 0

	var refund: int = old_tower.get_sell_refund_gold()
	var found_pos := Vector2i(-1, -1)
	for pos_var: Variant in _grid_tower_map.keys():
		var pos: Vector2i = pos_var as Vector2i
		if _grid_tower_map[pos] == old_tower:
			found_pos = pos
			break

	if found_pos != Vector2i(-1, -1):
		_grid_tower_map.erase(found_pos)
		if _map != null:
			_map.set_cell_occupied(found_pos, false)

	if _economy != null and refund > 0:
		_economy.add_gold(refund)
	if _audio != null:
		_audio.play_sfx("sell_coin")

	deselect_tower()
	old_tower.queue_free()
	return refund


## [FUNGSI]: Mengubah mode penargetan menara terpilih (`FRONT_MOST`, `LOWEST_HP`, `CLOSEST`).
## [INPUT/OUTPUT]: mode (TargetSelector.Mode) -> bool
func set_selected_tower_targeting_mode(mode: TargetSelector.Mode) -> bool:
	if _state != GameState.PLAYING:
		return false
	var target_tower: Tower3D = get_selected_tower()
	if target_tower == null:
		return false
	target_tower.set_targeting_mode(mode)
	tower_selected_for_ui.emit(target_tower)
	return true


## [FUNGSI]: Mengembalikan true jika match sedang PLAYING dan spawner siap memulai wave baru.
## [INPUT/OUTPUT]: - -> bool
func can_start_wave() -> bool:
	return _state == GameState.PLAYING and _spawner != null and _spawner.can_start_wave()


## [FUNGSI]: Memulai gelombang serangan berikutnya saat status PLAYING dan spawner mengizinkan.
## [INPUT/OUTPUT]: - -> bool
func start_next_wave() -> bool:
	if not can_start_wave():
		return false
	var started: bool = _spawner.start_next_wave()
	if started and _audio != null:
		_audio.play_sfx("wave_start")
	return started


## [FUNGSI]: Mengatur pengali kecepatan simulasi (1.0x / 2.0x) sambil menolak nilai <= 0.
## [INPUT/OUTPUT]: multiplier (float) -> void
func set_game_speed(multiplier: float) -> void:
	if multiplier <= 0.0:
		return
	_game_speed = clampf(multiplier, 1.0, 2.0)
	if _state == GameState.PLAYING:
		Engine.time_scale = _game_speed


## [FUNGSI]: Mengembalikan kecepatan simulasi yang dikonfigurasi (1.0 .. 2.0).
## [INPUT/OUTPUT]: - -> float
func get_game_speed() -> float:
	return _game_speed


## [FUNGSI]: Mengalihkan status PAUSED <-> PLAYING.
## [INPUT/OUTPUT]: - -> void
func toggle_pause() -> void:
	set_paused(_state != GameState.PAUSED)


## [FUNGSI]: Menetapkan status pause permainan sekaligus menyinkronkan `SceneTree.paused` & `time_scale`.
## [INPUT/OUTPUT]: paused_state (bool) -> void
func set_paused(paused_state: bool) -> void:
	var tree: SceneTree = _get_tree_safe()
	if paused_state:
		if _state == GameState.PLAYING:
			_state = GameState.PAUSED
			Engine.time_scale = 1.0
			if tree != null:
				tree.paused = true
			state_changed.emit(int(_state))
	else:
		if _state == GameState.PAUSED:
			_state = GameState.PLAYING
			if tree != null:
				tree.paused = false
			Engine.time_scale = _game_speed
			state_changed.emit(int(_state))


## [FUNGSI]: Memunculkan satu instance Enemy3D di waypoint awal dan menghubungkan sinyalnya.
## [INPUT/OUTPUT]: enemy_id (String), wave_num (int) -> Enemy3D
func spawn_enemy_for_wave(enemy_id: String, wave_num: int) -> Enemy3D:
	var preset_path: String = GameConstants3D.get_enemy_preset_path(enemy_id)
	if preset_path.is_empty() or not ResourceLoader.exists(preset_path):
		return null
	var preset: EnemyCombatData = ResourceLoader.load(preset_path) as EnemyCombatData
	if preset == null:
		return null

	var enemy := Enemy3D.new()
	var container: Node3D = _enemies_parent if _enemies_parent != null else self
	container.add_child(enemy)

	var waypoints: Array[Vector3] = _map.get_waypoints() if _map != null else []
	enemy.setup(enemy_id, preset, wave_num, waypoints)
	enemy.reached_core.connect(_on_enemy_reached_core)
	enemy.defeated.connect(_on_enemy_defeated)
	return enemy


## [FUNGSI]: Mengembalikan Tower3D yang berdiri pada koordinat grid tertentu, atau null.
## [INPUT/OUTPUT]: grid_pos (Vector2i) -> Tower3D
func get_tower_at_grid(grid_pos: Vector2i) -> Tower3D:
	var candidate: Variant = _grid_tower_map.get(grid_pos, null)
	if candidate is Tower3D:
		var t: Tower3D = candidate as Tower3D
		if is_instance_valid(t) and not t.is_queued_for_deletion():
			return t
	return null


## [FUNGSI]: Mengembalikan daftar seluruh menara valid yang aktif di arena.
## [INPUT/OUTPUT]: - -> Array[Tower3D]
func get_active_towers() -> Array[Tower3D]:
	var list: Array[Tower3D] = []
	for pos_var: Variant in _grid_tower_map.keys():
		var t: Tower3D = _grid_tower_map[pos_var] as Tower3D
		if t != null and is_instance_valid(t) and not t.is_queued_for_deletion():
			list.append(t)
	return list


## [FUNGSI]: Mengembalikan daftar seluruh musuh valid yang masih aktif di arena.
## [INPUT/OUTPUT]: - -> Array[Enemy3D]
func get_active_enemies() -> Array[Enemy3D]:
	var list: Array[Enemy3D] = []
	var container: Node3D = _enemies_parent if _enemies_parent != null else self
	for child: Node in container.get_children():
		if child is Enemy3D:
			var e: Enemy3D = child as Enemy3D
			if is_instance_valid(e) and not e.is_queued_for_deletion():
				list.append(e)
	return list


## [FUNGSI]: Mengembalikan referensi EconomyManager3D yang terpasang.
## [INPUT/OUTPUT]: - -> EconomyManager3D
func get_economy() -> EconomyManager3D:
	return _economy


## [FUNGSI]: Mengembalikan referensi WaveSpawner3D yang terpasang.
## [INPUT/OUTPUT]: - -> WaveSpawner3D
func get_spawner() -> WaveSpawner3D:
	return _spawner


## [FUNGSI]: Mengembalikan referensi MapGrid3D yang terpasang.
## [INPUT/OUTPUT]: - -> MapGrid3D
func get_map() -> MapGrid3D:
	return _map


## [FUNGSI]: Mengembalikan referensi EnergyCore3D yang terpasang.
## [INPUT/OUTPUT]: - -> EnergyCore3D
func get_core() -> EnergyCore3D:
	return _core


## [FUNGSI]: Mengembalikan referensi AudioBridge3D yang terpasang.
## [INPUT/OUTPUT]: - -> AudioBridge3D
func get_audio() -> AudioBridge3D:
	return _audio


## [FUNGSI]: Memperbarui state internal dan memancarkan sinyal `state_changed`.
## [INPUT/OUTPUT]: new_state (GameState) -> void
func _set_state(new_state: GameState) -> void:
	_state = new_state
	state_changed.emit(int(_state))


## [FUNGSI]: Mengumpulkan daftar `CombatTargetComponent` hidup dari seluruh musuh aktif.
## [INPUT/OUTPUT]: - -> Array[CombatTargetComponent]
func _collect_alive_target_components() -> Array[CombatTargetComponent]:
	var targets: Array[CombatTargetComponent] = []
	for enemy: Enemy3D in get_active_enemies():
		var comp: CombatTargetComponent = enemy.get_target_component()
		if comp != null and is_instance_valid(comp) and comp.is_alive():
			targets.append(comp)
	return targets


## [FUNGSI]: Menghapus seluruh menara, proyektil, dan musuh dari container dunia secara langsung.
## [INPUT/OUTPUT]: - -> void
func _clear_all_entities() -> void:
	var towers_container: Node = _towers_parent if _towers_parent != null else self
	for c: Node in towers_container.get_children():
		if towers_container == self and not (c is Tower3D or c is Projectile3D):
			continue
		towers_container.remove_child(c)
		c.queue_free()

	var enemies_container: Node = _enemies_parent if _enemies_parent != null else self
	for c: Node in enemies_container.get_children():
		if enemies_container == self and not (c is Enemy3D):
			continue
		enemies_container.remove_child(c)
		c.queue_free()


## [FUNGSI]: Membangun kamus ringkasan statistik akhir match untuk Victory / Game Over.
## [INPUT/OUTPUT]: won (bool), wave_reached (int) -> Dictionary
func _build_match_summary(won: bool, wave_reached: int) -> Dictionary:
	return {
		"won": won,
		"score": _economy.get_score() if _economy != null else 0,
		"wave_reached": wave_reached,
		"total_kills": _economy.get_enemies_defeated() if _economy != null else 0,
		"core_hp": _core.get_hp() if _core != null else 0,
		"gold": _economy.get_gold() if _economy != null else 0,
	}


## [FUNGSI]: Menangani kerusakan Energy Core dengan memunculkan VFX benturan dan SFX.
## [INPUT/OUTPUT]: _amount (int), _remaining_hp (int) -> void
func _on_core_damaged(_amount: int, _remaining_hp: int) -> void:
	if _vfx != null and _core != null:
		_vfx.spawn_core_hit(_core.global_position)
	if _audio != null:
		_audio.play_sfx("base_hit")


## [FUNGSI]: Menangani kehancuran Energy Core (GAME_OVER), memulihkan time_scale, dan menyimpan hasil.
## [INPUT/OUTPUT]: - -> void
func _on_core_destroyed() -> void:
	if _state == GameState.GAME_OVER or _state == GameState.VICTORY:
		return
	Engine.time_scale = 1.0
	if _spawner != null:
		_spawner.set_process(false)
	deselect_tower()
	cancel_build_mode()
	_set_state(GameState.GAME_OVER)

	var wave_reached: int = _spawner.get_current_wave() if _spawner != null else 0
	var summary: Dictionary = _build_match_summary(false, wave_reached)
	SaveManager3D.save_run_result(
		int(summary["score"]),
		wave_reached,
		int(summary["total_kills"]),
		false
	)
	if _audio != null:
		_audio.play_sfx("defeat")
	game_over.emit(summary)


## [FUNGSI]: Menangani permintaan spawn dari WaveSpawner3D selama match berstatus PLAYING.
## [INPUT/OUTPUT]: enemy_id (String), wave_num (int) -> void
func _on_spawner_enemy_requested(enemy_id: String, wave_num: int) -> void:
	if _state != GameState.PLAYING:
		return
	spawn_enemy_for_wave(enemy_id, wave_num)


## [FUNGSI]: Memberikan bonus Gold wave clear saat seluruh musuh wave ke-N selesai dan Core hidup.
## [INPUT/OUTPUT]: wave_num (int) -> void
func _on_spawner_wave_cleared(wave_num: int) -> void:
	if _state != GameState.PLAYING or (_core != null and _core.is_destroyed()):
		return
	if _economy != null:
		var bonus: int = _economy.award_wave_clear(wave_num)
		status_message.emit("Wave %d cleared! Bonus +%d Gold" % [wave_num, bonus])
	if _audio != null:
		_audio.play_sfx("wave_start")


## [FUNGSI]: Memicu kondisi VICTORY setelah Wave 5 bersih dan Energy Core masih bertahan.
## [INPUT/OUTPUT]: - -> void
func _on_spawner_all_waves_cleared() -> void:
	if _state != GameState.PLAYING or (_core != null and _core.is_destroyed()):
		return
	Engine.time_scale = 1.0
	if _spawner != null:
		_spawner.set_process(false)
	deselect_tower()
	cancel_build_mode()
	_set_state(GameState.VICTORY)

	var summary: Dictionary = _build_match_summary(true, GameConstants3D.TOTAL_WAVES)
	SaveManager3D.save_run_result(
		int(summary["score"]),
		GameConstants3D.TOTAL_WAVES,
		int(summary["total_kills"]),
		true
	)
	if _audio != null:
		_audio.play_sfx("victory")
	victory.emit(summary)


## [FUNGSI]: Mengurangi HP Energy Core saat musuh lolos dan memberi tahu WaveSpawner3D.
## [INPUT/OUTPUT]: _enemy (Enemy3D), leak_damage (int) -> void
func _on_enemy_reached_core(_enemy: Enemy3D, leak_damage: int) -> void:
	if _core != null and not _core.is_destroyed():
		_core.take_damage(leak_damage)
	if _spawner != null:
		_spawner.notify_enemy_removed()


## [FUNGSI]: Mencatat hadiah kill ke EconomyManager3D, memunculkan VFX/SFX, dan melapor ke spawner.
## [INPUT/OUTPUT]: _enemy (Enemy3D), reward_gold (int), world_pos (Vector3), is_boss (bool) -> void
func _on_enemy_defeated(_enemy: Enemy3D, reward_gold: int, world_pos: Vector3, is_boss: bool) -> void:
	if _economy != null:
		_economy.record_enemy_kill(reward_gold, is_boss)
	if _vfx != null:
		_vfx.spawn_death_burst(world_pos, is_boss)
	if _audio != null:
		_audio.play_sfx("enemy_die")
	if _spawner != null:
		_spawner.notify_enemy_removed()


## [FUNGSI]: Memutar SFX tembakan dan memunculkan hit spark Laser saat menara menembak target.
## [INPUT/OUTPUT]: tower (Tower3D), target (CombatTargetComponent), _scaled_damage (float) -> void
func _on_tower_fired(tower: Tower3D, target: CombatTargetComponent, _scaled_damage: float) -> void:
	if tower == null or tower.stats_data == null:
		return
	if _vfx != null and tower.stats_data.tower_type == TowerStatsData.TowerType.LASER:
		if target != null and is_instance_valid(target):
			_vfx.spawn_hit_spark(target.global_position + Vector3(0.0, 0.4, 0.0), tower.stats_data.accent_color)
	if _audio != null:
		match tower.stats_data.tower_type:
			TowerStatsData.TowerType.LASER:
				_audio.play_sfx("shoot_laser")
			TowerStatsData.TowerType.CANNON:
				_audio.play_sfx("shoot_heavy")
			_:
				_audio.play_sfx("shoot_fast")


## [FUNGSI]: Memunculkan efek visual pulsa emas saat menara berhasil naik level.
## [INPUT/OUTPUT]: tower (Tower3D), _new_level (int), _total_invested_gold (int) -> void
func _on_tower_upgraded(tower: Tower3D, _new_level: int, _total_invested_gold: int) -> void:
	if _vfx != null and tower != null and is_instance_valid(tower):
		_vfx.spawn_build_pulse(tower.global_position, Color(1.0, 0.88, 0.2))


## [FUNGSI]: Menghubungkan sinyal benturan proyektil baru di container menara ke VFX & SFX ledakan.
## [INPUT/OUTPUT]: node (Node) -> void
func _on_towers_container_child_entered(node: Node) -> void:
	if node is Projectile3D:
		var proj: Projectile3D = node as Projectile3D
		if not proj.projectile_impacted.is_connected(_on_projectile_impacted):
			proj.projectile_impacted.connect(_on_projectile_impacted)


## [FUNGSI]: Memunculkan ledakan AoE atau percikan hit + SFX saat proyektil menghantam target.
## [INPUT/OUTPUT]: hit_position (Vector3), is_aoe (bool) -> void
func _on_projectile_impacted(hit_position: Vector3, is_aoe: bool) -> void:
	if is_aoe:
		if _vfx != null:
			_vfx.spawn_explosion(hit_position, 3.5)
		if _audio != null:
			_audio.play_sfx("explosion")
	else:
		if _vfx != null:
			_vfx.spawn_hit_spark(hit_position, Color(0.55, 0.9, 1.0))
