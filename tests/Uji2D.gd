extends Node

var gagal := 0

func _cek(kondisi: bool, nama: String) -> void:
	if kondisi:
		print("OK  ", nama)
	else:
		gagal += 1
		print("GAGAL  ", nama)

func _ready() -> void:
	var main_scene = load("res://Scenes/main/main.tscn")
	var main = main_scene.instantiate()
	add_child(main)
	await get_tree().process_frame
	await get_tree().process_frame
	_cek(Globals.currentMap != null, "map termuat")
	_cek(Globals.hud != null, "HUD terhubung")
	_cek(Data.levels.size() == 2, "dua level")
	_cek(Data.waves.size() == 5, "lima gelombang")
	_cek(Data.turrets.size() == 4, "empat menara")
	_cek(LevelManager.level_sekarang() == "level1", "level 1 terpilih")
	_cek(Globals.currentMap.gold == 150, "emas awal level 1")
	_cek(Globals.currentMap.baseHP == 30, "HP awal level 1")
	_cek(Globals.selected_map == "level1", "map level 1 tersimpan")
	_cek(Globals.hud.get_node("TopLeft/LevelLabel").text == "Level 1: Hutan Terlupakan", "label level 1")

	Globals.menara_dipilih.emit("gatling")
	await get_tree().process_frame
	var bm = main.get_node("BuildManager")
	_cek(bm._placeholder != null, "placeholder dibuat")
	bm._bangun()
	_cek(Globals.currentMap.gold == 100, "emas terpotong")
	_cek(Globals.turretsNode.get_child_count() == 1, "menara terpasang")
	_cek(Globals.turretsNode.get_child(0).deployed, "menara aktif")
	var turret0 = Globals.turretsNode.get_child(0)
	turret0.open_details_pane()
	await get_tree().process_frame
	_cek(Globals.hud.open_details_pane != null, "detail menara")
	_cek(Globals.hud.open_details_pane.get_node("VBoxContainer/PriorityRow/PriorityOption").item_count == 3, "tiga prioritas")
	turret0.close_details_pane()
	await get_tree().process_frame
	_cek(Globals.hud.open_details_pane == null, "detail menara tertutup")

	var path = Globals.currentMap.get_node("PathSpawner")
	path.enemies_to_spawn.clear()
	path.enemies_to_spawn.append("normal")
	path.enemies_spawned_this_wave = 0
	path.killed_this_wave = 0
	path.current_wave = 1
	path.spawn_new_enemy()
	await get_tree().process_frame
	var enemy = path.get_child(path.get_child_count() - 1)
	_cek(enemy.is_in_group("enemy"), "musuh muncul")
	_cek(enemy.max_hp == 40.0, "HP musuh normal")
	var emas_sebelum = Globals.currentMap.gold
	enemy.get_damage(9999.0)
	await get_tree().process_frame
	_cek(Globals.currentMap.gold > emas_sebelum, "emas dari musuh")

	path.enemies_to_spawn.clear()
	path.enemies_to_spawn.append("normal")
	path.enemies_spawned_this_wave = 0
	path.killed_this_wave = 0
	path.current_wave = 1
	path.max_waves = 3
	path.spawn_new_enemy()
	var enemy2 = path.get_child(path.get_child_count() - 1)
	var turret = Globals.turretsNode.get_child(0)
	turret.global_position = path.to_global(path.curve.get_point_position(0))
	await get_tree().physics_frame
	await get_tree().physics_frame
	turret.try_get_target()
	_cek(turret.current_target == enemy2, "target terkunci")
	turret.attack()
	_cek(Globals.projectilesNode.get_child_count() > 0, "proyektil dibuat")
	enemy2.terapkan_lambat(0.5, 1.0)
	_cek(enemy2._slow_factor == 0.5, "efek lambat")
	enemy2.get_damage(9999.0)
	await get_tree().process_frame

	path.enemies_to_spawn.clear()
	path.enemies_to_spawn.append("boss")
	path.enemies_spawned_this_wave = 0
	path.killed_this_wave = 0
	path.current_wave = 1
	path.spawn_new_enemy()
	var boss = path.get_child(path.get_child_count() - 1)
	_cek(boss.is_boss, "boss muncul")
	_cek(boss.max_hp == 500.0, "HP boss")
	_cek(Globals.hud.get_node("BossPanel").visible, "bar boss tampil")
	boss.terapkan_lambat(0.5, 1.0)
	_cek(boss._slow_factor == 1.0, "boss kebal lambat")
	boss.get_damage(9999.0)
	await get_tree().process_frame
	_cek(not Globals.hud.get_node("BossPanel").visible, "bar boss hilang")

	for tipe in Data.turrets.keys():
		var t = load(Data.turrets[tipe]["scene"]).instantiate()
		t.turret_type = tipe
		Globals.turretsNode.add_child(t)
		t.build()
		t.attack()
		_cek(t.deployed, "menara " + str(tipe))
		t.queue_free()
	await get_tree().process_frame

	path.current_wave = 0
	path.wave_indices = [0, 1, 2]
	path.max_waves = 3
	path._on_wave_delay_timer_timeout()
	_cek(path.current_wave == 1, "gelombang mulai")
	_cek(path.enemies_to_spawn.size() == 6, "jumlah musuh gelombang 1")

	SettingsManager.set_volume_master(0.5)
	var db_master = AudioServer.get_bus_volume_db(AudioServer.get_bus_index("Master"))
	_cek(abs(db_master - linear_to_db(1.25)) < 0.01, "boost master 2.5x")
	var ada_limiter := false
	var idx_master = AudioServer.get_bus_index("Master")
	for i in range(AudioServer.get_bus_effect_count(idx_master)):
		if AudioServer.get_bus_effect(idx_master, i) is AudioEffectHardLimiter:
			ada_limiter = true
	_cek(ada_limiter, "limiter master")
	SettingsManager.reset()

	main._on_pause()
	_cek(get_tree().paused, "pause aktif")
	_cek(main.pause_menu.visible, "menu pause tampil")
	main._on_settings()
	_cek(main.settings.visible, "pengaturan tampil")
	main._on_settings_back()
	main._on_credits()
	_cek(main.credits.visible, "kredit tampil")
	main._on_credits_back()
	main._on_resume()
	_cek(not get_tree().paused, "resume")
	_cek(not main.pause_menu.visible, "menu pause sembunyi")

	Globals.selesaikan_level(true)
	await get_tree().process_frame
	_cek(main.result_screen.visible, "layar hasil tampil")
	_cek(get_tree().paused, "game pause saat hasil")
	_cek(LevelManager.level_terbuka == 2, "level 2 terbuka")

	get_tree().paused = false
	main.queue_free()
	await get_tree().process_frame
	LevelManager.pilih_level(1)
	var main2 = load("res://Scenes/main/main.tscn").instantiate()
	add_child(main2)
	await get_tree().process_frame
	await get_tree().process_frame
	_cek(LevelManager.level_sekarang() == "level2", "level 2 terpilih")
	_cek(Globals.currentMap.map_type == "level2", "map 2 termuat")
	_cek(Globals.currentMap.gold == 220, "emas awal level 2")
	_cek(Globals.currentMap.baseHP == 20, "HP awal level 2")
	_cek(Globals.selected_map == "level2", "map level 2 tersimpan")
	_cek(Globals.hud.get_node("TopLeft/LevelLabel").text == "Level 2: Gurun Berliku", "label level 2")
	var path2 = Globals.currentMap.get_node("PathSpawner")
	_cek(path2.max_waves == 3, "tiga gelombang level 2")
	_cek(path2.wave_indices[0] == 2, "gelombang level 2 mulai dari 3")
	path2._on_wave_delay_timer_timeout()
	_cek(path2.enemies_to_spawn.size() == 15, "jumlah musuh gelombang 3")
	main2.queue_free()
	await get_tree().process_frame
	LevelManager.reset_progress()

	var menu = load("res://Scenes/ui/mainMenu/mainMenu.tscn").instantiate()
	add_child(menu)
	await get_tree().process_frame
	menu._on_start_button_pressed()
	await get_tree().process_frame
	_cek(menu.mapSelectContainer != null, "panel pilih level tampil")
	_cek(menu.mapSelectContainer.get_node("VBoxContainer/ScrollContainer/MapsList").get_child_count() == 2, "dua kartu level")
	menu._on_settings_button_pressed()
	await get_tree().process_frame
	_cek(menu._overlay != null and menu._overlay.visible, "pengaturan menu utama")
	menu._tutup_overlay()
	await get_tree().process_frame
	menu._on_credits_button_pressed()
	await get_tree().process_frame
	_cek(menu._overlay != null and menu._overlay.visible, "kredit menu utama")
	menu._tutup_overlay()

	print("SELESAI gagal=", gagal)
	get_tree().quit()
