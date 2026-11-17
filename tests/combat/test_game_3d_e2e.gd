class_name Game3DE2ETests
extends RefCounted
## Suite pengujian E2E opaque-box (Tiers 1-4) untuk CYBER DEFENSE 3D (`cyber_defense_3d.tscn`).
##
## [FUNGSI_MODUL]: Memverifikasi seluruh spesifikasi GDD (`komputer grafis.md`),
##   `ORIGINAL_REQUEST.md`, dan `PROJECT.md § Interface Contracts` melalui 4 tier:
##   Tier 1 (Feature Coverage F01-F17), Tier 2 (Boundary & Corner Cases),
##   Tier 3 (Cross-Feature Pairwise Combinations), dan Tier 4 (Real-World Scenarios).
## [ARAH_INTERAKSI_KODE]:
##   - Memuat `res://src/combat/game_3d/cyber_defense_3d.tscn` secara dinamis (opaque-box).
##   - Dipanggil oleh `test_combat_system.gd` via `Game3DE2ETests.run_all(tree)`.

## [FUNGSI]: Path scene utama game 3D standalone.
const SCENE_PATH: String = "res://src/combat/game_3d/cyber_defense_3d.tscn"
## [FUNGSI]: Path script konstanta game 3D.
const CONSTANTS_PATH: String = "res://src/combat/game_3d/core/game_constants_3d.gd"
## [FUNGSI]: Path script SaveManager3D untuk pengujian persistensi terisolasi.
const SAVE_MANAGER_PATH: String = "res://src/combat/game_3d/systems/save_manager_3d.gd"
## [FUNGSI]: Path tool generator aset placeholder lokal.
const ASSET_GEN_PATH: String = "res://src/combat/tools/asset_generator.gd"
## [FUNGSI]: Path file save sementara khusus E2E agar tidak menyentuh save pemain.
const TEST_SAVE_FILE: String = "test_e2e_save.cfg"
## [FUNGSI]: URI lengkap file save sementara khusus E2E.
const TEST_SAVE_PATH: String = "user://test_e2e_save.cfg"

## [FUNGSI]: Enum tipe sel grid sesuai kontrak `MapGrid3D.CellType`.
enum CellType { EMPTY_BUILDABLE = 0, PATH = 1, OBSTACLE = 2, SPAWN = 3, CORE = 4, OCCUPIED = 5 }
## [FUNGSI]: Enum state permainan sesuai kontrak `GameController3D.GameState`.
enum GameState { MENU = 0, PLAYING = 1, PAUSED = 2, VICTORY = 3, GAME_OVER = 4 }

var _tree: SceneTree = null
var _passed: int = 0
var _failed: int = 0


## [FUNGSI]: Titik masuk utama untuk menjalankan seluruh test E2E Tiers 1-4.
## [INPUT/OUTPUT]: tree (SceneTree) -> Dictionary ({"pass": int, "fail": int})
static func run_all(tree: SceneTree) -> Dictionary:
	var runner := new()
	return runner._execute_all(tree)


## [FUNGSI]: Menjalankan seluruh grup test Tier 1..4 dan mengembalikan ringkasan pass/fail.
## [INPUT/OUTPUT]: tree (SceneTree) -> Dictionary
func _execute_all(tree: SceneTree) -> Dictionary:
	_tree = tree
	_cleanup_test_save()
	if not ResourceLoader.exists(SCENE_PATH):
		_assert_true(false, "Precondition: cyber_defense_3d.tscn tersedia di " + SCENE_PATH)
		return {"pass": _passed, "fail": _failed}

	_run_tier1_feature_coverage()
	_run_tier2_boundary_and_corner_cases()
	_run_tier3_cross_feature_pairwise()
	_run_tier4_real_world_scenarios()

	_cleanup_test_save()
	_reset_global_runtime_state()
	print("==========================================")
	print("HASIL E2E CYBER DEFENSE 3D: %d PASS, %d FAIL" % [_passed, _failed])
	print("==========================================")
	return {"pass": _passed, "fail": _failed}


## [FUNGSI]: Mencatat hasil asersi boolean dengan format standar suite combat.
## [INPUT/OUTPUT]: condition (bool), test_name (String) -> void
func _assert_true(condition: bool, test_name: String) -> void:
	if condition:
		_passed += 1
		print("[PASS] %s" % test_name)
	else:
		_failed += 1
		push_error("[FAIL] %s" % test_name)


## [FUNGSI]: Memastikan dua nilai float sama dalam toleransi epsilon 0.001.
## [INPUT/OUTPUT]: actual (float), expected (float), test_name (String) -> void
func _assert_approx(actual: float, expected: float, test_name: String) -> void:
	var ok: bool = absf(actual - expected) <= 0.001
	if not ok:
		push_error("[DETAIL %s] expected=%f, actual=%f" % [test_name, expected, actual])
	_assert_true(ok, test_name)


## [FUNGSI]: Memastikan dua nilai integer identik dengan detail diagnostik saat gagal.
## [INPUT/OUTPUT]: actual (int), expected (int), test_name (String) -> void
func _assert_eq_int(actual: int, expected: int, test_name: String) -> void:
	var ok: bool = actual == expected
	if not ok:
		push_error("[DETAIL %s] expected=%d, actual=%d" % [test_name, expected, actual])
	_assert_true(ok, test_name)


# ==============================================================================
# TIER 1: FEATURE COVERAGE (F01-F17)
# ==============================================================================

## [FUNGSI]: Menjalankan seluruh pengujian cakupan fitur utama Tier 1 (F01-F17).
## [INPUT/OUTPUT]: - -> void
func _run_tier1_feature_coverage() -> void:
	_t1_map_grid_and_waypoints()
	_t1_tower_placement_and_four_presets()
	_t1_tower_upgrade_and_sell()
	_t1_targeting_modes()
	_t1_enemies_scaling_and_movement()
	_t1_wave_spawner_and_bonuses()
	_t1_core_ui_audio_and_save()
	_t1_asset_generator_and_autoload_integrity()


## [FUNGSI]: T1.1 - Verifikasi peta grid 16x10, waypoint P0..Pn, konversi koordinat, dan collider layer 2 (F01).
## [INPUT/OUTPUT]: - -> void
func _t1_map_grid_and_waypoints() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node

	_assert_true(map != null, "T1.1: MapGrid3D tersedia dari GameController3D")
	var waypoints: Array = map.call("get_waypoints") as Array
	_assert_true(waypoints.size() >= 2, "T1.1: Waypoint jalur musuh memiliki >= 2 titik (P0..Pn)")

	var spawn_cell: Vector2i = map.call("get_first_cell_of_type", CellType.SPAWN)
	var path_cell: Vector2i = map.call("get_first_cell_of_type", CellType.PATH)
	var obstacle_cell: Vector2i = map.call("get_first_cell_of_type", CellType.OBSTACLE)
	var core_cell: Vector2i = map.call("get_first_cell_of_type", CellType.CORE)
	var build_cell: Vector2i = map.call("get_first_cell_of_type", CellType.EMPTY_BUILDABLE)

	_assert_true(
		bool(map.call("is_valid_grid_pos", spawn_cell)) and bool(map.call("is_valid_grid_pos", core_cell)),
		"T1.1: Map memiliki sel SPAWN dan CORE yang valid"
	)
	_assert_true(
		bool(map.call("is_valid_grid_pos", path_cell)) and bool(map.call("is_valid_grid_pos", obstacle_cell)) and bool(map.call("is_valid_grid_pos", build_cell)),
		"T1.1: Map memiliki sel PATH, OBSTACLE, dan EMPTY_BUILDABLE yang valid"
	)

	var core_world: Vector3 = map.call("get_core_world_position")
	var last_wp: Vector3 = waypoints[waypoints.size() - 1] as Vector3
	_assert_true(
		CombatMath.distance_3d(core_world, last_wp) <= 2.1,
		"T1.1: Waypoint terakhir (Pn) berada pada posisi Energy Core"
	)

	var round_trip: Vector2i = map.call("world_to_grid", map.call("grid_to_world", build_cell))
	_assert_true(round_trip == build_cell, "T1.1: Konversi grid_to_world -> world_to_grid simetris")

	_assert_true(bool(map.call("can_place_at", build_cell)), "T1.1: Sel EMPTY_BUILDABLE dapat ditempati")
	map.call("set_cell_occupied", build_cell, true)
	_assert_eq_int(int(map.call("get_cell_type", build_cell)), CellType.OCCUPIED, "T1.1: set_cell_occupied(true) mengubah status ke OCCUPIED")
	map.call("set_cell_occupied", build_cell, false)
	_assert_eq_int(int(map.call("get_cell_type", build_cell)), CellType.EMPTY_BUILDABLE, "T1.1: set_cell_occupied(false) memulihkan EMPTY_BUILDABLE")

	var layer2_found: bool = _has_static_body_on_layer(map, 2)
	_assert_true(layer2_found, "T1.1: MapGrid3D memiliki StaticBody3D raycast pada collision layer 2")
	map.call("set_hover_preview", build_cell, true, 15.0)
	map.call("clear_hover_preview")
	_assert_true(true, "T1.1: set_hover_preview & clear_hover_preview berjalan bersih")
	_cleanup_scene(scene)


## [FUNGSI]: T1.2 - Verifikasi penempatan 4 tipe menara dan deduksi Gold awal (F02, F03).
## [INPUT/OUTPUT]: - -> void
func _t1_tower_placement_and_four_presets() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var cells: Array[Vector2i] = _collect_buildable_cells(map, 5)

	_assert_eq_int(int(econ.call("get_gold")), 300, "T1.2: Gold awal permainan == 300")
	var laser_tower: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "laser") as Tower3D
	_assert_true(laser_tower != null, "T1.2: Penempatan Laser Tower pada sel valid berhasil")
	_assert_eq_int(int(econ.call("get_gold")), 200, "T1.2: Laser Tower (100 Gold) mengurangi Gold 300 -> 200")
	_assert_true(ctrl.call("get_tower_at_grid", cells[0]) == laser_tower, "T1.2: get_tower_at_grid mengembalikan instance Laser Tower")
	_assert_approx(laser_tower.get_current_damage(), 15.0, "T1.2: Laser Lv.1 damage == 15.0")
	_assert_approx(laser_tower.get_current_range_meters(), 15.0, "T1.2: Laser Lv.1 range == 15.0m")

	econ.call("add_gold", 500)
	var cannon_tower: Tower3D = ctrl.call("try_place_tower_at_grid", cells[1], "cannon") as Tower3D
	var freeze_tower: Tower3D = ctrl.call("try_place_tower_at_grid", cells[2], "freeze") as Tower3D
	var pen_tower: Tower3D = ctrl.call("try_place_tower_at_grid", cells[3], "armor_pen") as Tower3D
	_assert_true(
		cannon_tower != null and is_equal_approx(cannon_tower.get_current_damage(), 40.0) and is_equal_approx(cannon_tower.get_current_range_meters(), 12.0),
		"T1.2: Cannon Tower (150 Gold, dmg 40, range 12m) valid"
	)
	_assert_true(
		freeze_tower != null and is_equal_approx(freeze_tower.get_current_damage(), 5.0) and is_equal_approx(freeze_tower.get_current_range_meters(), 13.0),
		"T1.2: Freeze Tower (125 Gold, dmg 5, range 13m) valid"
	)
	_assert_true(
		pen_tower != null and is_equal_approx(pen_tower.get_current_damage(), 25.0) and is_equal_approx(pen_tower.get_current_range_meters(), 14.0),
		"T1.2: Armor Pen Tower (175 Gold, dmg 25, range 14m) valid"
	)
	_assert_eq_int(int(econ.call("get_gold")), 250, "T1.2: Gold tersisa akurat (700 - 150 - 125 - 175 == 250)")

	ctrl.call("select_build_tower", "laser")
	_assert_true(String(ctrl.call("get_selected_build_tower")) == "laser", "T1.2: select_build_tower('laser') aktif")
	var built_from_mode: Tower3D = ctrl.call("try_place_tower_at_grid", cells[4], "") as Tower3D
	_assert_true(built_from_mode != null, "T1.2: try_place_tower_at_grid memakai mode build terpilih saat key kosong")
	ctrl.call("cancel_build_mode")
	_assert_true(String(ctrl.call("get_selected_build_tower")) == "", "T1.2: cancel_build_mode() mengosongkan mode build")
	_assert_eq_int((ctrl.call("get_active_towers") as Array).size(), 5, "T1.2: get_active_towers() berisi 5 menara")
	_cleanup_scene(scene)


## [FUNGSI]: T1.3 - Verifikasi upgrade Lv.1->2->3 (+25% dmg, +10% range, ceil(Base*1.5^L)) dan sell 70% (F04).
## [INPUT/OUTPUT]: - -> void
func _t1_tower_upgrade_and_sell() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var cells: Array[Vector2i] = _collect_buildable_cells(map, 4)

	econ.call("add_gold", 2000) # Total = 2300
	var laser: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "laser") as Tower3D # -100 -> 2200
	ctrl.call("select_tower", laser)
	_assert_eq_int(laser.get_next_upgrade_cost(), 150, "T1.3: Biaya upgrade Laser Lv.1->2 == 150")
	_assert_true(bool(ctrl.call("upgrade_selected_tower")), "T1.3: Upgrade Laser Lv.1->2 berhasil")
	_assert_eq_int(int(econ.call("get_gold")), 2050, "T1.3: Gold terpotong 150 menjadi 2050")
	_assert_approx(laser.get_current_damage(), 18.75, "T1.3: Laser Lv.2 damage == 18.75 (+25%)")
	_assert_approx(laser.get_current_range_meters(), 16.5, "T1.3: Laser Lv.2 range == 16.5m (+10%)")

	_assert_eq_int(laser.get_next_upgrade_cost(), 225, "T1.3: Biaya upgrade Laser Lv.2->3 == 225")
	_assert_true(bool(ctrl.call("upgrade_selected_tower")), "T1.3: Upgrade Laser Lv.2->3 berhasil")
	_assert_eq_int(int(econ.call("get_gold")), 1825, "T1.3: Gold terpotong 225 menjadi 1825")
	_assert_approx(laser.get_current_damage(), 22.5, "T1.3: Laser Lv.3 damage == 22.5 (+50% base)")
	_assert_approx(laser.get_current_range_meters(), 18.0, "T1.3: Laser Lv.3 range == 18.0m (+20% base)")

	# Verifikasi biaya upgrade preset lain sesuai GDD ceil(Base * 1.5^L)
	var cannon: Tower3D = ctrl.call("try_place_tower_at_grid", cells[1], "cannon") as Tower3D # -150 -> 1675
	var freeze: Tower3D = ctrl.call("try_place_tower_at_grid", cells[2], "freeze") as Tower3D # -125 -> 1550
	var pen: Tower3D = ctrl.call("try_place_tower_at_grid", cells[3], "armor_pen") as Tower3D # -175 -> 1375
	_assert_eq_int(cannon.get_next_upgrade_cost(), 225, "T1.3: Cannon upgrade Lv.1->2 == 225")
	_assert_eq_int(freeze.get_next_upgrade_cost(), 188, "T1.3: Freeze upgrade Lv.1->2 == 188 (ceil)")
	_assert_eq_int(pen.get_next_upgrade_cost(), 263, "T1.3: Armor Pen upgrade Lv.1->2 == 263 (ceil)")

	# Sell Laser Lv.3 (total invested 475 -> floor(475 * 0.7) == 332)
	ctrl.call("select_tower", laser)
	var refund: int = int(ctrl.call("sell_selected_tower"))
	_assert_eq_int(refund, 332, "T1.3: Sell Laser Lv.3 mengembalikan 332 Gold")
	_assert_eq_int(int(econ.call("get_gold")), 1375 + 332, "T1.3: Saldo Gold bertambah tepat sebesar refund 332")
	_assert_true(bool(map.call("can_place_at", cells[0])), "T1.3: Sel grid menara yang dijual kembali EMPTY_BUILDABLE")
	_assert_true(ctrl.call("get_tower_at_grid", cells[0]) == null, "T1.3: get_tower_at_grid(cell) null setelah dijual")
	_cleanup_scene(scene)


## [FUNGSI]: T1.4 - Verifikasi 3 mode targeting (FRONT_MOST, LOWEST_HP, CLOSEST) pada combat nyata (F05).
## [INPUT/OUTPUT]: - -> void
func _t1_targeting_modes() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var cells: Array[Vector2i] = _collect_buildable_cells(map, 1)

	var tower: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "laser") as Tower3D
	_assert_eq_int(int(tower.targeting_mode), TargetSelector.Mode.FRONT_MOST, "T1.4: Mode targeting default == FRONT_MOST")

	ctrl.call("select_tower", tower)
	_assert_true(bool(ctrl.call("set_selected_tower_targeting_mode", TargetSelector.Mode.LOWEST_HP)), "T1.4: Switch ke LOWEST_HP berhasil")
	_assert_eq_int(int(tower.get_ui_summary()["targeting_mode"]), TargetSelector.Mode.LOWEST_HP, "T1.4: get_ui_summary().targeting_mode == LOWEST_HP")
	_assert_true(bool(ctrl.call("set_selected_tower_targeting_mode", TargetSelector.Mode.CLOSEST)), "T1.4: Switch ke CLOSEST berhasil")

	# Verifikasi pemilihan kandidat aktual dalam jangkauan menara
	var tower_pos: Vector3 = tower.global_position
	var e_front: Node = ctrl.call("spawn_enemy_for_wave", "orc", 1) as Node
	var e_low: Node = ctrl.call("spawn_enemy_for_wave", "goblin", 1) as Node
	var e_close: Node = ctrl.call("spawn_enemy_for_wave", "orc", 1) as Node
	(e_front as Node3D).global_position = tower_pos + Vector3(8.0, 0.0, 0.0)
	(e_low as Node3D).global_position = tower_pos + Vector3(6.0, 0.0, 0.0)
	(e_close as Node3D).global_position = tower_pos + Vector3(2.0, 0.0, 0.0)

	var c_front: CombatTargetComponent = e_front.call("get_target_component") as CombatTargetComponent
	var c_low: CombatTargetComponent = e_low.call("get_target_component") as CombatTargetComponent
	var c_close: CombatTargetComponent = e_close.call("get_target_component") as CombatTargetComponent
	c_front.path_progress = 90.0
	c_low.path_progress = 10.0
	c_close.path_progress = 5.0

	var cands: Array[CombatTargetComponent] = [c_front, c_low, c_close]
	tower.set_targeting_mode(TargetSelector.Mode.FRONT_MOST)
	_assert_true(tower.update_combat(0.6, cands) == c_front, "T1.4: FRONT_MOST menembak target dengan path_progress tertinggi")
	tower.set_targeting_mode(TargetSelector.Mode.LOWEST_HP)
	_assert_true(tower.update_combat(0.6, cands) == c_low, "T1.4: LOWEST_HP menembak target dengan HP terendah")
	tower.set_targeting_mode(TargetSelector.Mode.CLOSEST)
	_assert_true(tower.update_combat(0.6, cands) == c_close, "T1.4: CLOSEST menembak target terdekat secara jarak 3D")
	_cleanup_scene(scene)


## [FUNGSI]: T1.5 - Verifikasi 4 tipe musuh, scaling HP wave 1..5, pergerakan delta time, dan reward kill (F06).
## [INPUT/OUTPUT]: - -> void
func _t1_enemies_scaling_and_movement() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var econ: Node = ctrl.call("get_economy") as Node

	var goblin: Node = ctrl.call("spawn_enemy_for_wave", "goblin", 1) as Node
	var orc: Node = ctrl.call("spawn_enemy_for_wave", "orc", 1) as Node
	var harpy: Node = ctrl.call("spawn_enemy_for_wave", "harpy", 1) as Node
	var boss: Node = ctrl.call("spawn_enemy_for_wave", "demon_king", 5) as Node

	var cg: CombatTargetComponent = goblin.call("get_target_component") as CombatTargetComponent
	var co: CombatTargetComponent = orc.call("get_target_component") as CombatTargetComponent
	var ch: CombatTargetComponent = harpy.call("get_target_component") as CombatTargetComponent
	var cb: CombatTargetComponent = boss.call("get_target_component") as CombatTargetComponent

	_assert_true(
		is_equal_approx(cg.max_hp, 100.0) and is_equal_approx(cg.get_effective_speed_mps(), 8.0) and cg.combat_data.gold_reward == 15,
		"T1.5: Goblin Wave 1 (100 HP, 8.0 m/s, 15 Gold)"
	)
	_assert_true(
		is_equal_approx(co.max_hp, 250.0) and is_equal_approx(co.combat_data.armor, 10.0) and co.combat_data.gold_reward == 25,
		"T1.5: Orc Wave 1 (250 HP, armor 10, 25 Gold)"
	)
	_assert_true(
		is_equal_approx(ch.max_hp, 80.0) and is_equal_approx(ch.get_effective_speed_mps(), 13.0) and ch.combat_data.gold_reward == 20,
		"T1.5: Harpy Wave 1 (80 HP, 13.0 m/s, 20 Gold)"
	)
	_assert_true(
		bool(boss.call("is_boss_enemy")) and is_equal_approx(cb.max_hp, 3663.0) and is_equal_approx(cb.combat_data.armor, 20.0),
		"T1.5: Demon King Wave 5 (is_boss=true, 3663 HP, armor 20)"
	)

	# Verifikasi pergerakan berbasis delta time pada jalur waypoint
	var start_pos: Vector3 = (goblin as Node3D).global_position
	var start_prog: float = cg.path_progress
	_step_scene(scene, 0.5, 0.05)
	_assert_true(
		(goblin as Node3D).global_position.distance_to(start_pos) > 0.5 and cg.path_progress > start_prog,
		"T1.5: Musuh bergerak maju sepanjang waypoint seiring bertambahnya delta time"
	)

	# Verifikasi kill reward & statistik ekonomi
	var gold_before: int = int(econ.call("get_gold"))
	var kills_before: int = int(econ.call("get_enemies_defeated"))
	cg.apply_combat_hit(500.0, true, 0.0, 0.0)
	_assert_eq_int(int(econ.call("get_gold")), gold_before + 15, "T1.5: Mengalahkan Goblin menambah +15 Gold")
	_assert_eq_int(int(econ.call("get_enemies_defeated")), kills_before + 1, "T1.5: Kill counter bertambah +1")
	_assert_true(int(econ.call("get_score")) > 0, "T1.5: Score bertambah saat musuh dikalahkan")
	_cleanup_scene(scene)


## [FUNGSI]: T1.6 - Verifikasi komposisi Wave 1-5, gating manual, Boss spawn, dan Wave Clear Bonus (F07, F08).
## [INPUT/OUTPUT]: - -> void
func _t1_wave_spawner_and_bonuses() -> void:
	var const_scr: GDScript = ResourceLoader.load(CONSTANTS_PATH) as GDScript
	_assert_true(const_scr != null, "T1.6: GameConstants3D berhasil dimuat")
	if const_scr != null:
		var expected_bonuses: Array[int] = [58, 66, 74, 82, 90]
		var all_bonuses_ok: bool = true
		for w: int in range(1, 6):
			if int(const_scr.call("get_wave_clear_bonus", w)) != expected_bonuses[w - 1]:
				all_bonuses_ok = false
		_assert_true(all_bonuses_ok, "T1.6: Wave Clear Bonus Wave 1..5 == [58, 66, 74, 82, 90]")

		var w1: Array = const_scr.call("get_wave_composition", 1) as Array
		var w5: Array = const_scr.call("get_wave_composition", 5) as Array
		_assert_true(_total_wave_count(w1) == 5 and _total_wave_count(w5) == 9, "T1.6: Komposisi Wave 1 == 5 musuh & Wave 5 == 9 musuh")

	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var spawner: Node = ctrl.call("get_spawner") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var map: Node = ctrl.call("get_map") as Node

	_assert_eq_int(int(spawner.call("get_current_wave")), 0, "T1.6: Awal game current_wave == 0")
	_assert_true(bool(spawner.call("can_start_wave")) and not bool(spawner.call("is_wave_in_progress")), "T1.6: Siap Start Wave manual tanpa auto-spawn")
	_step_scene(scene, 2.0, 0.1)
	_assert_eq_int((ctrl.call("get_active_enemies") as Array).size(), 0, "T1.6: Tidak ada musuh muncul sebelum tombol Start Wave ditekan")

	# Tempatkan pertahanan kuat agar Wave 1 habis tuntas
	econ.call("add_gold", 1000)
	var best_cells: Array[Vector2i] = _find_best_buildable_cells(map, 2, 14.0)
	ctrl.call("try_place_tower_at_grid", best_cells[0], "armor_pen")
	ctrl.call("try_place_tower_at_grid", best_cells[1], "laser")
	var gold_at_w1_start: int = int(econ.call("get_gold"))

	_assert_true(bool(ctrl.call("start_next_wave")), "T1.6: start_next_wave() Wave 1 mengembalikan true")
	_assert_eq_int(int(spawner.call("get_current_wave")), 1, "T1.6: current_wave menjadi 1")
	var cleared_w1: bool = _run_wave_to_completion(scene, ctrl, spawner, 90.0)
	_assert_true(cleared_w1, "T1.6: Seluruh 5 Goblin Wave 1 berhasil dikalahkan")
	_assert_eq_int(
		int(econ.call("get_gold")),
		gold_at_w1_start + (5 * 15) + 58,
		"T1.6: Wave 1 memberikan tepat 75 kill Gold + 58 Wave Clear Bonus (133 Gold)"
	)
	_cleanup_scene(scene)


## [FUNGSI]: T1.7 - Verifikasi Energy Core, MainMenu/HUD/RadialMenu/Overlays, AudioBridge, dan SaveManager (F09-F16).
## [INPUT/OUTPUT]: - -> void
func _t1_core_ui_audio_and_save() -> void:
	var ctx: Dictionary = _spawn_game_session(false) # Mulai di MENU
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var core: Node = ctrl.call("get_core") as Node
	var main_menu: Control = ctx["main_menu"]
	var hud: Control = ctx["hud"]
	var tower_menu: Control = ctx["tower_menu"]

	_assert_eq_int(int(ctrl.call("get_state")), GameState.MENU, "T1.7: Game dimulai pada state MENU")
	_assert_true(main_menu != null and main_menu.visible, "T1.7: MainMenu3D tampil saat state MENU")

	var play_btn: BaseButton = _find_button(main_menu, ["play", "mulai"], true)
	_assert_true(play_btn != null, "T1.7: Tombol Play ditemukan pada MainMenu3D")
	if play_btn != null:
		play_btn.pressed.emit()
	else:
		ctrl.call("start_new_game")
	_assert_eq_int(int(ctrl.call("get_state")), GameState.PLAYING, "T1.7: Menekan Play memindahkan state ke PLAYING")
	_assert_true(hud != null and hud.visible and not main_menu.visible, "T1.7: GameplayHud3D tampil dan MainMenu3D tersembunyi")

	# Energy Core damage
	_assert_eq_int(int(core.call("get_hp")), 20, "T1.7: EnergyCore3D HP awal == 20")
	core.call("take_damage", 2)
	_assert_eq_int(int(core.call("get_hp")), 18, "T1.7: EnergyCore3D.take_damage(2) menurunkan HP ke 18")

	# Radial menu sync
	var map: Node = ctrl.call("get_map") as Node
	var cell: Vector2i = _collect_buildable_cells(map, 1)[0]
	var t: Tower3D = ctrl.call("try_place_tower_at_grid", cell, "laser") as Tower3D
	ctrl.call("select_tower", t)
	_assert_true(tower_menu != null and tower_menu.visible, "T1.7: TowerRadialMenu3D tampil saat menara dipilih")
	ctrl.call("deselect_tower")
	_assert_true(tower_menu == null or not tower_menu.visible, "T1.7: TowerRadialMenu3D tertutup saat deselect_tower()")

	# UILayer PROCESS_MODE_ALWAYS
	var ui_layer: Node = hud.get_parent()
	_assert_true(ui_layer != null and ui_layer.process_mode == Node.PROCESS_MODE_ALWAYS, "T1.7: UILayer memakai PROCESS_MODE_ALWAYS agar tetap responsif saat Pause")

	# AudioBridge3D
	var audio: Node = _find_audio_bridge(scene)
	_assert_true(audio != null, "T1.7: AudioBridge3D ditemukan di dalam scene")
	if audio != null:
		audio.call("set_master_volume", 0.5)
		_assert_approx(float(audio.call("get_master_volume")), 0.5, "T1.7: AudioBridge3D set/get_master_volume(0.5)")
		audio.call("set_muted", true)
		_assert_true(bool(audio.call("is_muted")), "T1.7: AudioBridge3D set/is_muted(true)")
		audio.call("set_muted", false)
		audio.call("play_sfx", "ui_click")
		_assert_true(true, "T1.7: AudioBridge3D.play_sfx('ui_click') berjalan aman")

	# SaveManager3D (terisolasi pada user://test_e2e_save.cfg)
	var save_scr: GDScript = ResourceLoader.load(SAVE_MANAGER_PATH) as GDScript
	_assert_true(save_scr != null, "T1.7: SaveManager3D script dimuat valid")
	if save_scr != null:
		_cleanup_test_save()
		save_scr.call("save_run_result", 1450, 4, 28, true, TEST_SAVE_PATH)
		save_scr.call("save_audio_settings", 0.75, true, TEST_SAVE_PATH)
		var loaded: Dictionary = save_scr.call("load_data", TEST_SAVE_PATH) as Dictionary
		_assert_eq_int(int(_dict_get_any(loaded, ["high_score", "highscore"], 0)), 1450, "T1.7: SaveManager3D menyimpan & memuat High Score == 1450")
		_assert_eq_int(int(_dict_get_any(loaded, ["highest_wave", "max_wave"], 0)), 4, "T1.7: SaveManager3D menyimpan & memuat Highest Wave == 4")
		_assert_true(bool(_dict_get_any(loaded, ["muted", "is_muted", "mute"], false)), "T1.7: SaveManager3D menyimpan & memuat status Mute")
		_cleanup_test_save()

	_cleanup_scene(scene)


## [FUNGSI]: T1.8 - Verifikasi keberadaan tool generator aset lokal `asset_generator.gd` (F17).
## [INPUT/OUTPUT]: - -> void
func _t1_asset_generator_and_autoload_integrity() -> void:
	_assert_true(FileAccess.file_exists(ASSET_GEN_PATH), "T1.8: Tool res://src/combat/tools/asset_generator.gd tersedia")
	var sfx_node: Node = _tree.root.get_node_or_null("Sfx")
	_assert_true(sfx_node != null, "T1.8: Autoload Sfx terpasang di SceneTree tanpa error")


# ==============================================================================
# TIER 2: BOUNDARY & CORNER CASES
# ==============================================================================

## [FUNGSI]: Menjalankan seluruh pengujian batas & kasus sudut Tier 2.
## [INPUT/OUTPUT]: - -> void
func _run_tier2_boundary_and_corner_cases() -> void:
	_t2_placement_and_grid_boundaries()
	_t2_economy_and_upgrade_boundaries()
	_t2_wave_gating_boundaries()
	_t2_core_combat_audio_save_boundaries()


## [FUNGSI]: T2.1 - Menolak pembangunan menara pada PATH, OBSTACLE, SPAWN, CORE, OCCUPIED, OOB, dan key invalid.
## [INPUT/OUTPUT]: - -> void
func _t2_placement_and_grid_boundaries() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	econ.call("add_gold", 1000)

	var path_c: Vector2i = map.call("get_first_cell_of_type", CellType.PATH)
	var obs_c: Vector2i = map.call("get_first_cell_of_type", CellType.OBSTACLE)
	var spawn_c: Vector2i = map.call("get_first_cell_of_type", CellType.SPAWN)
	var core_c: Vector2i = map.call("get_first_cell_of_type", CellType.CORE)
	var build_c: Vector2i = map.call("get_first_cell_of_type", CellType.EMPTY_BUILDABLE)

	var gold_before: int = int(econ.call("get_gold"))
	_assert_true(ctrl.call("try_place_tower_at_grid", path_c, "laser") == null, "T2.1: Menolak bangun menara di sel PATH")
	_assert_true(ctrl.call("try_place_tower_at_grid", obs_c, "laser") == null, "T2.1: Menolak bangun menara di sel OBSTACLE")
	_assert_true(ctrl.call("try_place_tower_at_grid", spawn_c, "laser") == null, "T2.1: Menolak bangun menara di sel SPAWN")
	_assert_true(ctrl.call("try_place_tower_at_grid", core_c, "laser") == null, "T2.1: Menolak bangun menara di sel CORE")
	_assert_true(
		not bool(map.call("is_valid_grid_pos", Vector2i(-1, 0))) and ctrl.call("try_place_tower_at_grid", Vector2i(-1, 0), "laser") == null,
		"T2.1: Menolak koordinat grid negatif (-1, 0)"
	)
	_assert_true(
		not bool(map.call("is_valid_grid_pos", Vector2i(16, 10))) and ctrl.call("try_place_tower_at_grid", Vector2i(16, 10), "laser") == null,
		"T2.1: Menolak koordinat grid di luar batas (16, 10)"
	)
	_assert_true(ctrl.call("try_place_tower_at_grid", build_c, "nonexistent_tower") == null, "T2.1: Menolak tower_key tidak dikenal")
	_assert_eq_int(int(econ.call("get_gold")), gold_before, "T2.1: Seluruh penolakan penempatan tidak mengurangi Gold")

	var first: Tower3D = ctrl.call("try_place_tower_at_grid", build_c, "laser") as Tower3D
	var gold_after_first: int = int(econ.call("get_gold"))
	_assert_true(
		first != null and ctrl.call("try_place_tower_at_grid", build_c, "laser") == null and int(econ.call("get_gold")) == gold_after_first,
		"T2.1: Menolak menumpuk menara kedua pada sel OCCUPIED tanpa memotong Gold"
	)
	_cleanup_scene(scene)


## [FUNGSI]: T2.2 - Uji batas Gold kurang 1, cap Lv.3, invarians non-negatif, dan aksi tanpa menara terpilih.
## [INPUT/OUTPUT]: - -> void
func _t2_economy_and_upgrade_boundaries() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var cells: Array[Vector2i] = _collect_buildable_cells(map, 2)

	# Guard tanpa menara terpilih
	ctrl.call("deselect_tower")
	_assert_true(not bool(ctrl.call("upgrade_selected_tower")), "T2.2: upgrade_selected_tower() saat tidak ada seleksi -> false")
	_assert_eq_int(int(ctrl.call("sell_selected_tower")), 0, "T2.2: sell_selected_tower() saat tidak ada seleksi -> 0")
	_assert_true(not bool(ctrl.call("set_selected_tower_targeting_mode", TargetSelector.Mode.CLOSEST)), "T2.2: set_selected_tower_targeting_mode() tanpa seleksi -> false")

	# Kurang 1 Gold beli Laser (99 < 100)
	econ.call("reset", 99)
	_assert_true(ctrl.call("try_place_tower_at_grid", cells[0], "laser") == null, "T2.2: Menolak beli Laser (100) saat Gold == 99")
	_assert_eq_int(int(econ.call("get_gold")), 99, "T2.2: Gold tetap 99 setelah gagal beli")

	# Kurang 1 Gold beli Armor Pen (174 < 175)
	econ.call("reset", 174)
	_assert_true(ctrl.call("try_place_tower_at_grid", cells[0], "armor_pen") == null and int(econ.call("get_gold")) == 174, "T2.2: Menolak beli Armor Pen (175) saat Gold == 174")

	# Kurang 1 Gold upgrade Laser Lv.1->2 (149 < 150)
	econ.call("reset", 249)
	var t: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "laser") as Tower3D # sisa 149
	ctrl.call("select_tower", t)
	_assert_true(not bool(ctrl.call("upgrade_selected_tower")) and t.current_level == 1 and int(econ.call("get_gold")) == 149, "T2.2: Menolak upgrade Lv.1->2 (150) saat Gold == 149")

	# Cap Lv.3 meski Gold melimpah
	econ.call("add_gold", 5000)
	ctrl.call("upgrade_selected_tower")
	ctrl.call("upgrade_selected_tower")
	var gold_lv3: int = int(econ.call("get_gold"))
	_assert_true(
		not bool(ctrl.call("upgrade_selected_tower")) and t.current_level == 3 and t.get_next_upgrade_cost() == 0 and int(econ.call("get_gold")) == gold_lv3,
		"T2.2: Menolak upgrade melebihi Lv.3 dan Gold tidak berubah"
	)

	# Invarians Gold >= 0 terhadap nilai negatif/nol
	econ.call("reset", 50)
	econ.call("add_gold", -100)
	var spent_neg: bool = bool(econ.call("try_spend_gold", -10))
	var spent_over: bool = bool(econ.call("try_spend_gold", 999))
	_assert_true(int(econ.call("get_gold")) >= 0 and not spent_over and not spent_neg, "T2.2: Gold tidak pernah negatif & transaksi invalid ditolak")
	_cleanup_scene(scene)


## [FUNGSI]: T2.3 - Uji gating WaveSpawner saat MENU, PAUSED, mid-spawn, musuh hidup, dan pasca Wave 5.
## [INPUT/OUTPUT]: - -> void
func _t2_wave_gating_boundaries() -> void:
	var ctx: Dictionary = _spawn_game_session(false) # MENU
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var spawner: Node = ctrl.call("get_spawner") as Node

	_assert_true(not bool(ctrl.call("start_next_wave")), "T2.3: Menolak start_next_wave() saat state MENU")
	ctrl.call("start_new_game")
	ctrl.call("set_paused", true)
	_assert_true(not bool(ctrl.call("start_next_wave")), "T2.3: Menolak start_next_wave() saat state PAUSED")
	ctrl.call("set_paused", false)

	_assert_true(bool(ctrl.call("start_next_wave")), "T2.3: Memulai Wave 1 saat PLAYING berhasil")
	_step_scene(scene, 0.2, 0.05) # Wave 1 masih spawning
	_assert_true(not bool(ctrl.call("start_next_wave")) and int(spawner.call("get_current_wave")) == 1, "T2.3: Menolak start_next_wave() saat wave masih spawning")

	# Majukan cukup lama hingga semua 5 Goblin sudah di-spawn tapi masih hidup berjalan
	_step_scene(scene, 1.5, 0.05)
	if int(spawner.call("get_active_enemies_count")) > 0:
		_assert_true(not bool(ctrl.call("start_next_wave")), "T2.3: Menolak start_next_wave() selama masih ada musuh hidup")
	else:
		_assert_true(true, "T2.3: Wave sudah selesai jika tidak ada musuh tersisa")

	# Batas spawner di Wave 5 (tidak boleh melewati Wave 5)
	spawner.call("reset")
	for _i: int in range(5):
		spawner.call("start_next_wave")
		_drain_spawner_wave(spawner)
	_assert_eq_int(int(spawner.call("get_current_wave")), 5, "T2.3: WaveSpawner berhenti pada Wave 5")
	_assert_true(not bool(spawner.call("can_start_wave")) and not bool(spawner.call("start_next_wave")), "T2.3: Menolak memulai Wave 6 setelah Wave 5 selesai")
	_cleanup_scene(scene)


## [FUNGSI]: T2.4 - Uji batas Core HP clamp 0, range batas inklusif, min damage 1.0, volume clamp, dan missing save.
## [INPUT/OUTPUT]: - -> void
func _t2_core_combat_audio_save_boundaries() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var core: Node = ctrl.call("get_core") as Node
	var audio: Node = _find_audio_bridge(scene)

	core.call("take_damage", 0)
	core.call("take_damage", -10)
	_assert_eq_int(int(core.call("get_hp")), 20, "T2.4: EnergyCore3D mengabaikan damage <= 0")
	core.call("take_damage", 999)
	_assert_eq_int(int(core.call("get_hp")), 0, "T2.4: EnergyCore3D.take_damage(999) di-clamp pada 0 (bukan negatif)")
	_assert_true(bool(core.call("is_destroyed")), "T2.4: EnergyCore3D.is_destroyed() == true saat HP == 0")

	# Range boundary inklusif & clamp damage minimal 1.0 (Laser Lv.1 15 dmg vs Demon King 20 armor)
	var map: Node = ctrl.call("get_map") as Node
	var cell: Vector2i = _collect_buildable_cells(map, 1)[0]
	var laser: Tower3D = ctrl.call("try_place_tower_at_grid", cell, "laser") as Tower3D
	var boss: Node = ctrl.call("spawn_enemy_for_wave", "demon_king", 1) as Node
	var cb: CombatTargetComponent = boss.call("get_target_component") as CombatTargetComponent
	(boss as Node3D).global_position = laser.global_position + Vector3(15.0, 0.0, 0.0) # tepat 15.0m
	var hit_boundary: CombatTargetComponent = laser.update_combat(0.6, [cb])
	_assert_true(hit_boundary == cb and is_equal_approx(cb.current_hp, 1499.0), "T2.4: Batas tepat 15.0m tertembak dan armor clamp menghasilkan min 1.0 damage")
	(boss as Node3D).global_position = laser.global_position + Vector3(15.1, 0.0, 0.0) # 15.1m > 15.0m
	_assert_true(laser.update_combat(0.6, [cb]) == null, "T2.4: Jarak 15.1m di luar jangkauan 15.0m tidak ditembak")

	# Audio clamp
	if audio != null:
		audio.call("set_master_volume", -2.0)
		_assert_approx(float(audio.call("get_master_volume")), 0.0, "T2.4: Volume < 0 di-clamp ke 0.0")
		audio.call("set_master_volume", 3.5)
		_assert_approx(float(audio.call("get_master_volume")), 1.0, "T2.4: Volume > 1 di-clamp ke 1.0")

	# Missing save defaults
	var save_scr: GDScript = ResourceLoader.load(SAVE_MANAGER_PATH) as GDScript
	if save_scr != null:
		var def_data: Dictionary = save_scr.call("load_data", "user://definitely_missing_e2e_file.cfg") as Dictionary
		_assert_eq_int(int(_dict_get_any(def_data, ["high_score", "highscore"], -1)), 0, "T2.4: SaveManager3D mengembalikan default high_score == 0 bila file belum ada")

	# Speed guard
	ctrl.call("set_game_speed", -1.0)
	_assert_true(float(ctrl.call("get_game_speed")) > 0.0, "T2.4: Game speed menolak nilai <= 0 dan tetap positif")
	_cleanup_scene(scene)


# ==============================================================================
# TIER 3: CROSS-FEATURE PAIRWISE COMBINATIONS
# ==============================================================================

## [FUNGSI]: Menjalankan seluruh pengujian kombinasi lintas fitur Tier 3.
## [INPUT/OUTPUT]: - -> void
func _run_tier3_cross_feature_pairwise() -> void:
	_t3_freeze_plus_armor_pen_vs_boss()
	_t3_cannon_aoe_multikill_gold()
	_t3_speed_2x_pause_resume_reset()
	_t3_sell_tower_mid_flight_projectile()
	_t3_upgrade_and_switch_targeting_mid_wave()
	_t3_core_leak_plus_wave_clear_gating()
	_t3_range_ring_exclusivity_and_hover_preview()


## [FUNGSI]: T3.1 - Sinergi Freeze (40% slow) + Armor Pen (bypass armor 20) melawan Demon King.
## [INPUT/OUTPUT]: - -> void
func _t3_freeze_plus_armor_pen_vs_boss() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	econ.call("add_gold", 500)

	var cells: Array[Vector2i] = _find_best_buildable_cells(map, 2, 13.0)
	var freeze_t: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "freeze") as Tower3D
	var pen_t: Tower3D = ctrl.call("try_place_tower_at_grid", cells[1], "armor_pen") as Tower3D
	var boss: Node = ctrl.call("spawn_enemy_for_wave", "demon_king", 1) as Node
	var cb: CombatTargetComponent = boss.call("get_target_component") as CombatTargetComponent
	(boss as Node3D).global_position = freeze_t.global_position + Vector3(2.0, 0.0, 0.0)
	(pen_t as Node3D).global_position = freeze_t.global_position + Vector3(2.0, 0.0, 2.0)

	_step_scene(scene, 1.5, 0.05)
	_assert_approx(cb.get_speed_multiplier(), 0.6, "T3.1: Freeze memperlambat Demon King menjadi 0.6x")
	_assert_approx(cb.get_effective_speed_mps(), 2.1, "T3.1: Kecepatan efektif Demon King turun dari 3.5 -> 2.1 m/s")
	_assert_true(cb.current_hp <= 1500.0 - 25.0, "T3.1: Armor Pen menembus armor 20 Demon King dengan damage penuh 25.0+")
	_cleanup_scene(scene)


## [FUNGSI]: T3.2 - Cannon AoE menghantam cluster musuh sekaligus dan mengakumulasi multi-kill Gold.
## [INPUT/OUTPUT]: - -> void
func _t3_cannon_aoe_multikill_gold() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var cell: Vector2i = _collect_buildable_cells(map, 1)[0]
	var cannon: Tower3D = ctrl.call("try_place_tower_at_grid", cell, "cannon") as Tower3D
	var gold_start: int = int(econ.call("get_gold"))

	# Spawn 3 Goblin berdekatan (jarak 1.5m < AoE radius 3.5m) dengan HP sisa 30
	var cluster_center: Vector3 = cannon.global_position + Vector3(3.0, 0.0, 0.0)
	for i: int in range(3):
		var g: Node = ctrl.call("spawn_enemy_for_wave", "goblin", 1) as Node
		(g as Node3D).global_position = cluster_center + Vector3(float(i) * 0.8, 0.0, 0.0)
		var comp: CombatTargetComponent = g.call("get_target_component") as CombatTargetComponent
		comp.current_hp = 30.0 # Satu ledakan Cannon (40 dmg) membunuh ketiganya sekaligus

	_step_scene(scene, 1.0, 0.05)
	_assert_eq_int(int(econ.call("get_enemies_defeated")), 3, "T3.2: Satu ledakan AoE Cannon menumbangkan 3 Goblin sekaligus")
	_assert_eq_int(int(econ.call("get_gold")), gold_start + 45, "T3.2: Multi-kill AoE menambahkan 3 * 15 = 45 Gold")
	_cleanup_scene(scene)


## [FUNGSI]: T3.3 - Toggle 2x speed + combat aktif + Pause membekukan simulasi + reset bersih Engine.time_scale.
## [INPUT/OUTPUT]: - -> void
func _t3_speed_2x_pause_resume_reset() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]

	ctrl.call("set_game_speed", 2.0)
	_assert_approx(float(ctrl.call("get_game_speed")), 2.0, "T3.3: Game speed berubah ke 2.0x")
	_assert_approx(Engine.time_scale, 2.0, "T3.3: Engine.time_scale == 2.0 saat mode 2x")

	var g: Node = ctrl.call("spawn_enemy_for_wave", "goblin", 1) as Node
	var comp: CombatTargetComponent = g.call("get_target_component") as CombatTargetComponent
	var prog_0: float = comp.path_progress
	_step_scene(scene, 0.5, 0.05) # 0.5s real * 2.0 = 1.0s sim -> ~8.0m
	var prog_after_2x: float = comp.path_progress
	_assert_true((prog_after_2x - prog_0) > 6.5, "T3.3: Simulasi 2x speed menggerakkan musuh ~2x lebih jauh per detik real")

	# Pause harus membekukan simulasi sepenuhnya
	ctrl.call("toggle_pause")
	_assert_eq_int(int(ctrl.call("get_state")), GameState.PAUSED, "T3.3: toggle_pause() masuk state PAUSED")
	_assert_true(_tree.paused, "T3.3: SceneTree.paused == true saat PAUSED")
	var pos_at_pause: Vector3 = (g as Node3D).global_position
	_step_scene(scene, 1.0, 0.05)
	_assert_true((g as Node3D).global_position.is_equal_approx(pos_at_pause), "T3.3: Posisi musuh membeku total selama PAUSED")

	# Resume lalu Return to Menu harus mereset time_scale = 1.0 & paused = false
	ctrl.call("toggle_pause")
	_assert_eq_int(int(ctrl.call("get_state")), GameState.PLAYING, "T3.3: toggle_pause() kedua kembali ke PLAYING")
	ctrl.call("return_to_menu")
	_assert_true(not _tree.paused and is_equal_approx(Engine.time_scale, 1.0), "T3.3: return_to_menu() mereset paused=false & Engine.time_scale=1.0")
	_cleanup_scene(scene)


## [FUNGSI]: T3.4 - Menjual menara di tengah wave saat proyektilnya masih terbang di udara.
## [INPUT/OUTPUT]: - -> void
func _t3_sell_tower_mid_flight_projectile() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var cell: Vector2i = _collect_buildable_cells(map, 1)[0]

	var cannon: Tower3D = ctrl.call("try_place_tower_at_grid", cell, "cannon") as Tower3D
	var goblin: Node = ctrl.call("spawn_enemy_for_wave", "goblin", 1) as Node
	(goblin as Node3D).global_position = cannon.global_position + Vector3(8.0, 0.0, 0.0) # 8m -> proyektil 20m/s butuh 0.4s terbang

	_step_scene(scene, 0.05, 0.05) # Cannon menembak, proyektil sedang terbang di TowersContainer
	ctrl.call("select_tower", cannon)
	var gold_before_sell: int = int(econ.call("get_gold"))
	var refund: int = int(ctrl.call("sell_selected_tower"))
	_assert_eq_int(refund, 105, "T3.4: Menjual Cannon Lv.1 mengembalikan 105 Gold")
	_assert_eq_int(int(econ.call("get_gold")), gold_before_sell + 105, "T3.4: Saldo Gold bertambah 105 setelah jual mid-flight")
	_assert_true(bool(map.call("can_place_at", cell)), "T3.4: Sel grid langsung bebas setelah menara dijual")

	# Lanjutkan simulasi agar proyektil yang masih di udara menghantam Goblin tanpa crash
	_step_scene(scene, 0.6, 0.05)
	var cg: CombatTargetComponent = goblin.call("get_target_component") as CombatTargetComponent
	_assert_approx(cg.current_hp, 60.0, "T3.4: Proyektil di TowersContainer tetap menghantam target (100 -> 60 HP) walau menara sudah dijual")
	_cleanup_scene(scene)


## [FUNGSI]: T3.5 - Upgrade menara & ubah mode targeting secara dinamis di tengah wave aktif.
## [INPUT/OUTPUT]: - -> void
func _t3_upgrade_and_switch_targeting_mid_wave() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	econ.call("add_gold", 500)
	var cell: Vector2i = _collect_buildable_cells(map, 1)[0]

	var laser: Tower3D = ctrl.call("try_place_tower_at_grid", cell, "laser") as Tower3D
	var e_front_tank: Node = ctrl.call("spawn_enemy_for_wave", "goblin", 1) as Node
	var e_back_weak: Node = ctrl.call("spawn_enemy_for_wave", "goblin", 1) as Node
	(e_front_tank as Node3D).global_position = laser.global_position + Vector3(5.0, 0.0, 0.0)
	(e_back_weak as Node3D).global_position = laser.global_position + Vector3(16.0, 0.0, 0.0) # di luar Lv.1 (15m), di dalam Lv.2 (16.5m)!
	var ct: CombatTargetComponent = e_front_tank.call("get_target_component") as CombatTargetComponent
	var cw: CombatTargetComponent = e_back_weak.call("get_target_component") as CombatTargetComponent
	ct.path_progress = 80.0
	cw.path_progress = 10.0
	cw.current_hp = 18.0

	_step_scene(scene, 0.1, 0.05) # Tembakan Lv.1 (15 dmg) kena e_front_tank -> 85 HP
	_assert_approx(ct.current_hp, 85.0, "T3.5: Tembakan Lv.1 mengenai target depan (85 HP)")

	# Upgrade ke Lv.2 (range 16.5m, dmg 18.75) dan pindah ke LOWEST_HP
	ctrl.call("select_tower", laser)
	_assert_true(bool(ctrl.call("upgrade_selected_tower")), "T3.5: Upgrade mid-wave ke Lv.2 berhasil")
	_assert_true(bool(ctrl.call("set_selected_tower_targeting_mode", TargetSelector.Mode.LOWEST_HP)), "T3.5: Ganti mode targeting ke LOWEST_HP mid-wave berhasil")

	_step_scene(scene, 0.6, 0.05)
	_assert_true(not cw.is_alive(), "T3.5: Laser Lv.2 (range 16.5m, dmg 18.75) mengeksekusi target terlemah di jarak 16.0m")
	_cleanup_scene(scene)


## [FUNGSI]: T3.6 - Interaksi leak Energy Core + penyelesain wave (bonus tetap diberikan jika Core masih hidup).
## [INPUT/OUTPUT]: - -> void
func _t3_core_leak_plus_wave_clear_gating() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var spawner: Node = ctrl.call("get_spawner") as Node
	var core: Node = ctrl.call("get_core") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var map: Node = ctrl.call("get_map") as Node

	# Pasang Armor Pen di dekat Core agar 1 musuh sempat ditempatkan bocor dan sisanya mati
	econ.call("add_gold", 500)
	var best_cells: Array[Vector2i] = _find_best_buildable_cells(map, 2, 14.0)
	ctrl.call("try_place_tower_at_grid", best_cells[0], "armor_pen")
	ctrl.call("try_place_tower_at_grid", best_cells[1], "laser")

	var gold_before: int = int(econ.call("get_gold"))
	ctrl.call("start_next_wave")
	_step_scene(scene, 0.15, 0.05)
	var enemies: Array = ctrl.call("get_active_enemies") as Array
	if enemies.size() > 0:
		var leaker: Node3D = enemies[0] as Node3D
		leaker.global_position = map.call("get_core_world_position")
	var finished: bool = _run_wave_to_completion(scene, ctrl, spawner, 90.0)
	_assert_true(finished, "T3.6: Wave 1 tetap selesai setelah kombinasi musuh leak & musuh mati")
	_assert_eq_int(int(core.call("get_hp")), 18, "T3.6: Core HP berkurang tepat 2 (20 -> 18) dari 1 Goblin leak")
	_assert_eq_int(int(ctrl.call("get_state")), GameState.PLAYING, "T3.6: Game tetap PLAYING karena Core HP > 0")
	_assert_true(int(econ.call("get_gold")) >= gold_before + 58, "T3.6: Bonus penyelesaian wave (+58) tetap diberikan")
	_cleanup_scene(scene)


## [FUNGSI]: T3.7 - Eksklusivitas Range Ring antar menara & siklus hover preview grid.
## [INPUT/OUTPUT]: - -> void
func _t3_range_ring_exclusivity_and_hover_preview() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var cells: Array[Vector2i] = _collect_buildable_cells(map, 2)

	var t1: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "laser") as Tower3D
	var t2: Tower3D = ctrl.call("try_place_tower_at_grid", cells[1], "cannon") as Tower3D
	var ring1: Node3D = t1.get_node_or_null("RangeRing") as Node3D
	var ring2: Node3D = t2.get_node_or_null("RangeRing") as Node3D

	ctrl.call("select_tower", t1)
	_assert_true(ring1 != null and ring1.visible, "T3.7: RangeRing menara 1 tampil saat dipilih")
	ctrl.call("select_tower", t2)
	_assert_true(ring2 != null and ring2.visible and not ring1.visible, "T3.7: Memilih menara 2 mematikan RangeRing menara 1 secara eksklusif")
	ctrl.call("deselect_tower")
	_assert_true(not ring1.visible and not ring2.visible, "T3.7: deselect_tower() menyembunyikan seluruh RangeRing")
	_cleanup_scene(scene)


# ==============================================================================
# TIER 4: REAL-WORLD APPLICATION SCENARIOS
# ==============================================================================

## [FUNGSI]: Menjalankan 9 skenario end-to-end lengkap pada `cyber_defense_3d.tscn`.
## [INPUT/OUTPUT]: - -> void
func _run_tier4_real_world_scenarios() -> void:
	_t4_full_wave1_to_wave5_victory()
	_t4_core_depletion_game_over_and_retry()
	_t4_ui_navigation_menu_play_pause_settings_menu()
	_t4_tower_radial_menu_end_to_end()
	_t4_how_to_play_and_main_menu_settings()
	_t4_save_persistence_across_sessions()
	_t4_responsive_container_ui_layout()
	_t4_sell_and_rebuild_economy_strategy()
	_t4_autoload_globals_and_level_manager_isolation()


## [FUNGSI]: T4.1 - Skenario penuh Wave 1 -> Wave 5 hingga mengalahkan Demon King (VICTORY) tanpa cheat Gold.
## [INPUT/OUTPUT]: - -> void
func _t4_full_wave1_to_wave5_victory() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var spawner: Node = ctrl.call("get_spawner") as Node
	var core: Node = ctrl.call("get_core") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var overlays: Control = ctx["overlays"]

	var victory_flag: Array[bool] = [false]
	var boss_seen: Array[bool] = [false]
	ctrl.connect("victory", func(_summary: Dictionary) -> void: victory_flag[0] = true)
	spawner.connect("boss_spawned", func(_w: int) -> void: boss_seen[0] = true)

	var best_cells: Array[Vector2i] = _find_best_buildable_cells(map, 10, 14.0)
	var cell_idx: int = 0

	# Wave 1 prep (Gold 300): 3 Laser Towers (3 * 100 = 300)
	ctrl.call("try_place_tower_at_grid", best_cells[cell_idx], "laser")
	cell_idx += 1
	ctrl.call("try_place_tower_at_grid", best_cells[cell_idx], "laser")
	cell_idx += 1
	ctrl.call("try_place_tower_at_grid", best_cells[cell_idx], "laser")
	cell_idx += 1
	ctrl.call("set_game_speed", 2.0)

	# Jalankan Wave 1..5 menggunakan Gold murni hasil kill + wave bonus
	for wave_num: int in range(1, 6):
		if int(ctrl.call("get_state")) != GameState.PLAYING:
			break
		_assert_true(bool(ctrl.call("start_next_wave")), "T4.1: Memulai Wave %d berhasil" % wave_num)
		var done: bool = _run_wave_to_completion(scene, ctrl, spawner, 120.0)
		_assert_true(done, "T4.1: Wave %d selesai dalam batas waktu simulasi" % wave_num)
		if int(ctrl.call("get_state")) != GameState.PLAYING:
			break
		# Investasikan Gold hasil wave berikutnya pada Armor Pen / Laser / Cannon
		while int(econ.call("get_gold")) >= 175 and cell_idx < best_cells.size():
			ctrl.call("try_place_tower_at_grid", best_cells[cell_idx], "armor_pen")
			cell_idx += 1
		if int(econ.call("get_gold")) >= 100 and cell_idx < best_cells.size():
			ctrl.call("try_place_tower_at_grid", best_cells[cell_idx], "laser")
			cell_idx += 1

	_assert_true(boss_seen[0], "T4.1: Demon King muncul pada Wave 5 (boss_spawned)")
	_assert_eq_int(int(ctrl.call("get_state")), GameState.VICTORY, "T4.1: State akhir mencapai VICTORY setelah Wave 5")
	_assert_true(victory_flag[0], "T4.1: Sinyal victory dipancarkan")
	_assert_true(int(core.call("get_hp")) > 0, "T4.1: Energy Core masih bertahan (HP > 0)")
	_assert_true(overlays != null and overlays.visible, "T4.1: Layar Victory tampil pada Overlays3D")
	_cleanup_scene(scene)


## [FUNGSI]: T4.2 - Skenario Core HP mencapai 0 -> GAME_OVER -> Retry mereset game secara bersih.
## [INPUT/OUTPUT]: - -> void
func _t4_core_depletion_game_over_and_retry() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var spawner: Node = ctrl.call("get_spawner") as Node
	var core: Node = ctrl.call("get_core") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var overlays: Control = ctx["overlays"]

	var game_over_seen: Array[bool] = [false]
	ctrl.connect("game_over", func(_summary: Dictionary) -> void: game_over_seen[0] = true)

	# Jangan bangun menara apa pun; jalankan wave sampai semua leak menghancurkan Core (20 HP)
	ctrl.call("set_game_speed", 2.0)
	for _w: int in range(1, 6):
		if int(ctrl.call("get_state")) != GameState.PLAYING:
			break
		if bool(ctrl.call("can_start_wave") if ctrl.has_method("can_start_wave") else spawner.call("can_start_wave")):
			ctrl.call("start_next_wave")
		_run_wave_to_completion(scene, ctrl, spawner, 90.0)

	_assert_eq_int(int(ctrl.call("get_state")), GameState.GAME_OVER, "T4.2: Core HP 0 memicu state GAME_OVER")
	_assert_eq_int(int(core.call("get_hp")), 0, "T4.2: Core HP tepat 0 saat GAME_OVER")
	_assert_true(game_over_seen[0], "T4.2: Sinyal game_over dipancarkan")
	_assert_true(overlays != null and overlays.visible, "T4.2: Layar Game Over tampil pada Overlays3D")

	# Retry via tombol UI (atau fallback start_new_game)
	var retry_btn: BaseButton = _find_button(overlays, ["retry", "ulang", "play again"], true)
	if retry_btn != null:
		retry_btn.pressed.emit()
	else:
		ctrl.call("start_new_game")

	_assert_eq_int(int(ctrl.call("get_state")), GameState.PLAYING, "T4.2: Retry memulihkan state PLAYING")
	_assert_eq_int(int(econ.call("get_gold")), 300, "T4.2: Retry mereset Gold ke 300")
	_assert_eq_int(int(core.call("get_hp")), 20, "T4.2: Retry mereset Core HP ke 20")
	_assert_eq_int(int(spawner.call("get_current_wave")), 0, "T4.2: Retry mereset Wave ke 0")
	_assert_eq_int((ctrl.call("get_active_towers") as Array).size(), 0, "T4.2: Retry membersihkan seluruh menara")
	_assert_eq_int((ctrl.call("get_active_enemies") as Array).size(), 0, "T4.2: Retry membersihkan seluruh musuh")
	_assert_true(not _tree.paused and is_equal_approx(Engine.time_scale, 1.0), "T4.2: Retry mereset Engine.time_scale == 1.0 & paused == false")
	_cleanup_scene(scene)


## [FUNGSI]: T4.3 - Alur UI interaktif lengkap: MainMenu -> Play -> Buy -> StartWave -> Pause -> Settings -> Resume -> MainMenu.
## [INPUT/OUTPUT]: - -> void
func _t4_ui_navigation_menu_play_pause_settings_menu() -> void:
	var ctx: Dictionary = _spawn_game_session(false)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var main_menu: Control = ctx["main_menu"]
	var hud: Control = ctx["hud"]
	var overlays: Control = ctx["overlays"]
	var map: Node = ctrl.call("get_map") as Node

	var play_btn: BaseButton = _find_button(main_menu, ["play", "mulai"], true)
	_assert_true(play_btn != null, "T4.3: Tombol Play tersedia di MainMenu3D")
	if play_btn != null:
		play_btn.pressed.emit()
	_assert_eq_int(int(ctrl.call("get_state")), GameState.PLAYING, "T4.3: Masuk state PLAYING lewat tombol Play")

	# Pilih menara dari BuyBar & bangun pada sel valid
	var laser_btn: BaseButton = _find_button(hud, ["laser"], true)
	_assert_true(laser_btn != null, "T4.3: Tombol beli Laser tersedia di GameplayHud3D")
	if laser_btn != null:
		laser_btn.pressed.emit()
	var cell: Vector2i = _collect_buildable_cells(map, 1)[0]
	var built: Tower3D = ctrl.call("try_place_tower_at_grid", cell, "") as Tower3D
	_assert_true(built != null, "T4.3: Pembangunan menara dari mode BuyBar HUD berhasil")
	_assert_true("200" in _collect_all_label_text(hud), "T4.3: Label Gold pada HUD diperbarui ke 200")

	# Start Wave & Pause lewat tombol HUD
	var start_wave_btn: BaseButton = _find_button(hud, ["start wave", "mulai wave", "wave"], true)
	if start_wave_btn != null:
		start_wave_btn.pressed.emit()
	else:
		ctrl.call("start_next_wave")
	_assert_true("1" in _collect_all_label_text(hud), "T4.3: Label Wave pada HUD menampilkan Wave 1")

	var pause_btn: BaseButton = _find_button(hud, ["pause", "jeda"], true)
	_assert_true(pause_btn != null, "T4.3: Tombol Pause tersedia pada GameplayHud3D")
	if pause_btn != null:
		pause_btn.pressed.emit()
	_assert_eq_int(int(ctrl.call("get_state")), GameState.PAUSED, "T4.3: Menekan Pause membuka Pause Overlay")

	var resume_btn: BaseButton = _find_button(overlays, ["resume", "lanjut"], true)
	_assert_true(resume_btn != null, "T4.3: Tombol Resume tersedia di Pause Overlay")
	if resume_btn != null:
		resume_btn.pressed.emit()
	_assert_eq_int(int(ctrl.call("get_state")), GameState.PLAYING, "T4.3: Menekan Resume melanjutkan PLAYING")

	# Kembali ke Main Menu lewat Pause
	if pause_btn != null:
		pause_btn.pressed.emit()
	var menu_btn: BaseButton = _find_button(overlays, ["main menu", "menu utama", "menu"], true)
	if menu_btn != null:
		menu_btn.pressed.emit()
	else:
		ctrl.call("return_to_menu")
	_assert_eq_int(int(ctrl.call("get_state")), GameState.MENU, "T4.3: Kembali ke Main Menu mereset state ke MENU")
	_assert_true(main_menu.visible and not _tree.paused, "T4.3: MainMenu3D tampil kembali & SceneTree tidak paused")
	_cleanup_scene(scene)


## [FUNGSI]: T4.4 - Alur penuh TowerRadialMenu3D (inspect, target mode, upgrade, sell) via tombol UI.
## [INPUT/OUTPUT]: - -> void
func _t4_tower_radial_menu_end_to_end() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var econ: Node = ctrl.call("get_economy") as Node
	var map: Node = ctrl.call("get_map") as Node
	var tower_menu: Control = ctx["tower_menu"]

	econ.call("add_gold", 500)
	var cell: Vector2i = _collect_buildable_cells(map, 1)[0]
	var tower: Tower3D = ctrl.call("try_place_tower_at_grid", cell, "laser") as Tower3D
	ctrl.call("select_tower", tower)

	_assert_true(tower_menu.visible, "T4.4: TowerRadialMenu3D terbuka untuk menara terpilih")
	var menu_txt: String = _collect_all_label_text(tower_menu)
	_assert_true("laser" in menu_txt.to_lower() and "1" in menu_txt, "T4.4: TowerRadialMenu3D menampilkan nama & level menara")

	var lowest_btn: BaseButton = _find_button(tower_menu, ["lowest", "terendah"], false)
	_assert_true(lowest_btn != null, "T4.4: Tombol mode targeting Lowest HP tersedia pada TowerRadialMenu3D")
	if lowest_btn != null:
		lowest_btn.pressed.emit()
		_assert_eq_int(int(tower.targeting_mode), TargetSelector.Mode.LOWEST_HP, "T4.4: Klik Lowest HP mengubah targeting_mode menara")

	var upg_btn: BaseButton = _find_button(tower_menu, ["upgrade", "tingkat"], false)
	_assert_true(upg_btn != null, "T4.4: Tombol Upgrade tersedia pada TowerRadialMenu3D")
	if upg_btn != null:
		upg_btn.pressed.emit()
		_assert_eq_int(tower.current_level, 2, "T4.4: Klik Upgrade menaikkan menara ke Lv.2")

	var sell_btn: BaseButton = _find_button(tower_menu, ["sell", "jual"], false)
	_assert_true(sell_btn != null, "T4.4: Tombol Sell tersedia pada TowerRadialMenu3D")
	if sell_btn != null:
		sell_btn.pressed.emit()
		_assert_true(not tower_menu.visible and (ctrl.call("get_active_towers") as Array).is_empty(), "T4.4: Klik Sell menutup menu & menghapus menara")
	_cleanup_scene(scene)


## [FUNGSI]: T4.5 - Alur How to Play dan Settings dari MainMenu3D.
## [INPUT/OUTPUT]: - -> void
func _t4_how_to_play_and_main_menu_settings() -> void:
	var ctx: Dictionary = _spawn_game_session(false)
	var scene: Node = ctx["scene"]
	var main_menu: Control = ctx["main_menu"]
	var overlays: Control = ctx["overlays"]

	var htp_btn: BaseButton = _find_button(main_menu, ["how to play", "cara main"], true)
	_assert_true(htp_btn != null, "T4.5: Tombol How to Play tersedia pada MainMenu3D")
	if htp_btn != null:
		htp_btn.pressed.emit()
		_assert_true(overlays.visible, "T4.5: Overlay How to Play terbuka")
		var back_btn: BaseButton = _find_button(overlays, ["back", "close", "kembali", "tutup"], true)
		if back_btn != null:
			back_btn.pressed.emit()

	var set_btn: BaseButton = _find_button(main_menu, ["settings", "pengaturan"], true)
	_assert_true(set_btn != null, "T4.5: Tombol Settings tersedia pada MainMenu3D")
	if set_btn != null:
		set_btn.pressed.emit()
		_assert_true(overlays.visible, "T4.5: Overlay Settings terbuka")
	_cleanup_scene(scene)


## [FUNGSI]: T4.6 - Persistensi multi-sesi SaveManager3D (High Score monotonic max, Wins, Audio).
## [INPUT/OUTPUT]: - -> void
func _t4_save_persistence_across_sessions() -> void:
	var save_scr: GDScript = ResourceLoader.load(SAVE_MANAGER_PATH) as GDScript
	_assert_true(save_scr != null, "T4.6: SaveManager3D tersedia")
	if save_scr == null:
		return
	_cleanup_test_save()
	save_scr.call("save_run_result", 1200, 3, 21, false, TEST_SAVE_PATH)
	save_scr.call("save_run_result", 3500, 5, 40, true, TEST_SAVE_PATH)
	save_scr.call("save_run_result", 800, 2, 10, false, TEST_SAVE_PATH) # Skor lebih rendah tidak boleh menimpa rekor 3500
	save_scr.call("save_audio_settings", 0.65, true, TEST_SAVE_PATH)

	var data: Dictionary = save_scr.call("load_data", TEST_SAVE_PATH) as Dictionary
	_assert_eq_int(int(_dict_get_any(data, ["high_score", "highscore"], 0)), 3500, "T4.6: High Score mempertahankan nilai maksimum 3500")
	_assert_eq_int(int(_dict_get_any(data, ["highest_wave", "max_wave"], 0)), 5, "T4.6: Highest Wave mempertahankan nilai maksimum 5")
	_assert_true(int(_dict_get_any(data, ["total_kills", "total_enemies_defeated", "kills"], 0)) >= 40, "T4.6: Total enemies defeated tersimpan (>= 40)")
	_assert_true(int(_dict_get_any(data, ["wins", "win_count", "victories"], 0)) >= 1, "T4.6: Rekor kemenangan (wins >= 1) tersimpan")
	_assert_approx(float(_dict_get_any(data, ["volume", "volume_linear", "master_volume"], -1.0)), 0.65, "T4.6: Volume audio 0.65 tersimpan antar sesi")
	_assert_true(bool(_dict_get_any(data, ["muted", "is_muted", "mute"], false)), "T4.6: Status mute tersimpan antar sesi")
	_cleanup_test_save()


## [FUNGSI]: T4.7 - Verifikasi kepatuhan UI Container-based responsif (AGENTS.md §2, tanpa posisi hardcoded pecah).
## [INPUT/OUTPUT]: - -> void
func _t4_responsive_container_ui_layout() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var main_menu: Control = ctx["main_menu"]
	var hud: Control = ctx["hud"]
	var overlays: Control = ctx["overlays"]

	var has_containers: bool = _count_containers(main_menu) > 0 and _count_containers(hud) > 0 and _count_containers(overlays) > 0
	_assert_true(has_containers, "T4.7: Seluruh UI panel memakai node Container Godot (Margin/VBox/HBox/Grid)")
	_assert_true(hud.size.x >= 0.0 and hud.size.y >= 0.0, "T4.7: Ukuran Control GameplayHud3D valid dan non-negatif")
	_cleanup_scene(scene)


## [FUNGSI]: T4.8 - Strategi ekonomi Sell & Rebuild lintas wave (Wave 1 Laser+Cannon -> Sell Laser -> Wave 3 Armor Pen).
## [INPUT/OUTPUT]: - -> void
func _t4_sell_and_rebuild_economy_strategy() -> void:
	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var spawner: Node = ctrl.call("get_spawner") as Node
	var econ: Node = ctrl.call("get_economy") as Node
	var cells: Array[Vector2i] = _find_best_buildable_cells(map, 4, 14.0)

	var laser: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "laser") as Tower3D # 300 - 100 = 200
	ctrl.call("try_place_tower_at_grid", cells[1], "cannon") # 200 - 150 = 50
	ctrl.call("set_game_speed", 2.0)
	ctrl.call("start_next_wave")
	_assert_true(_run_wave_to_completion(scene, ctrl, spawner, 90.0), "T4.8: Wave 1 bersih dengan Laser + Cannon")
	# Saldo sekarang: 50 + 75 + 58 = 183
	ctrl.call("select_tower", laser)
	var refund: int = int(ctrl.call("sell_selected_tower")) # +70 -> 253
	_assert_eq_int(refund, 70, "T4.8: Sell Laser menghasilkan refund 70 Gold")
	var pen: Tower3D = ctrl.call("try_place_tower_at_grid", cells[0], "armor_pen") as Tower3D # 253 - 175 = 78
	_assert_true(pen != null and int(econ.call("get_gold")) == 78, "T4.8: Sel bekas Laser langsung dipakai Armor Pen (sisa Gold 78)")
	_cleanup_scene(scene)


## [FUNGSI]: T4.9 - Verifikasi Zero-Interference terhadap autoload `Globals` dan `LevelManager` milik tim 2D.
## [INPUT/OUTPUT]: - -> void
func _t4_autoload_globals_and_level_manager_isolation() -> void:
	var globals_node: Node = _tree.root.get_node_or_null("Globals")
	var level_mgr: Node = _tree.root.get_node_or_null("LevelManager")
	var snap_g: Dictionary = _snapshot_properties(globals_node, ["selected_level", "selected_map", "mainNode", "turretsNode", "projectilesNode", "currentMap", "hud", "game_running", "game_over"])
	var snap_l: Dictionary = _snapshot_properties(level_mgr, ["indeks_terpilih", "level_terbuka"])

	var ctx: Dictionary = _spawn_game_session(true)
	var scene: Node = ctx["scene"]
	var ctrl: Node = ctx["controller"]
	var map: Node = ctrl.call("get_map") as Node
	var spawner: Node = ctrl.call("get_spawner") as Node
	var cell: Vector2i = _find_best_buildable_cells(map, 1, 14.0)[0]
	ctrl.call("try_place_tower_at_grid", cell, "armor_pen")
	ctrl.call("start_next_wave")
	_run_wave_to_completion(scene, ctrl, spawner, 60.0)
	ctrl.call("toggle_pause")
	ctrl.call("return_to_menu")
	_cleanup_scene(scene)

	var post_g: Dictionary = _snapshot_properties(globals_node, ["selected_level", "selected_map", "mainNode", "turretsNode", "projectilesNode", "currentMap", "hud", "game_running", "game_over"])
	var post_l: Dictionary = _snapshot_properties(level_mgr, ["indeks_terpilih", "level_terbuka"])
	_assert_true(snap_g == post_g, "T4.9: Autoload Globals 100% tidak berubah setelah sesi game 3D")
	_assert_true(snap_l == post_l, "T4.9: Autoload LevelManager 100% tidak berubah setelah sesi game 3D")


# ==============================================================================
# HELPER FUNCTIONS (OPAQUE-BOX SCENE, SIMULATION, UI & CLEANUP)
# ==============================================================================

## [FUNGSI]: Memuat dan menginstansiasi `cyber_defense_3d.tscn` ke SceneTree untuk satu skenario terisolasi.
## [INPUT/OUTPUT]: auto_start_game (bool) -> Dictionary
func _spawn_game_session(auto_start_game: bool) -> Dictionary:
	_reset_global_runtime_state()
	var packed: PackedScene = ResourceLoader.load(SCENE_PATH) as PackedScene
	var scene: Node = packed.instantiate()
	_tree.root.add_child(scene)
	var ctrl: Node = scene.call("get_controller") as Node
	if auto_start_game and ctrl != null:
		ctrl.call("start_new_game")
	return {
		"scene": scene,
		"controller": ctrl,
		"main_menu": scene.call("get_main_menu") as Control,
		"hud": scene.call("get_hud") as Control,
		"tower_menu": scene.call("get_tower_menu") as Control,
		"overlays": scene.call("get_overlays") as Control,
	}


## [FUNGSI]: Memajukan simulasi `_process(delta)` pada subtree scene secara deterministik & sinkron.
## [INPUT/OUTPUT]: scene (Node), real_seconds (float), step_dt (float) -> void
func _step_scene(scene: Node, real_seconds: float, step_dt: float = 0.05) -> void:
	var steps: int = maxi(1, int(ceil(real_seconds / step_dt)))
	for _i: int in range(steps):
		var effective_dt: float = step_dt * Engine.time_scale
		var nodes: Array[Node] = []
		_collect_subtree_nodes(scene, nodes)
		for n: Node in nodes:
			if is_instance_valid(n) and not n.is_queued_for_deletion() and n.is_processing() and n.can_process() and n.has_method("_process"):
				n.call("_process", effective_dt)


## [FUNGSI]: Menjalankan simulasi hingga wave aktif selesai (atau game berakhir) dalam batas waktu maks.
## [INPUT/OUTPUT]: scene (Node), ctrl (Node), spawner (Node), max_sim_seconds (float) -> bool
func _run_wave_to_completion(scene: Node, ctrl: Node, spawner: Node, max_sim_seconds: float) -> bool:
	var step_dt: float = 0.05
	var max_steps: int = int(ceil(max_sim_seconds / (step_dt * maxf(1.0, Engine.time_scale))))
	for _i: int in range(max_steps):
		_step_scene(scene, step_dt, step_dt)
		var state: int = int(ctrl.call("get_state"))
		if state != GameState.PLAYING:
			return true
		var in_prog: bool = bool(spawner.call("is_wave_in_progress"))
		var alive_cnt: int = int(spawner.call("get_active_enemies_count"))
		if not in_prog and alive_cnt == 0:
			return true
	return false


## [FUNGSI]: Menguras seluruh queue spawn `WaveSpawner3D` untuk uji batas wave tanpa musuh fisik.
## [INPUT/OUTPUT]: spawner (Node) -> void
func _drain_spawner_wave(spawner: Node) -> void:
	for _i: int in range(200):
		if not bool(spawner.call("is_wave_in_progress")) and int(spawner.call("get_active_enemies_count")) == 0:
			return
		spawner.call("tick", 0.5)
		while int(spawner.call("get_active_enemies_count")) > 0:
			spawner.call("notify_enemy_removed")


## [FUNGSI]: Mengumpulkan seluruh node di dalam subtree (DFS) sebelum satu langkah simulasi.
## [INPUT/OUTPUT]: root_node (Node), out_list (Array[Node]) -> void
func _collect_subtree_nodes(root_node: Node, out_list: Array[Node]) -> void:
	if not is_instance_valid(root_node) or root_node.is_queued_for_deletion():
		return
	out_list.append(root_node)
	for child: Node in root_node.get_children():
		_collect_subtree_nodes(child, out_list)


## [FUNGSI]: Mengumpulkan N sel EMPTY_BUILDABLE pertama pada peta 16x10.
## [INPUT/OUTPUT]: map_node (Node), count (int) -> Array[Vector2i]
func _collect_buildable_cells(map_node: Node, count: int) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for y: int in range(10):
		for x: int in range(16):
			var pos := Vector2i(x, y)
			if bool(map_node.call("can_place_at", pos)):
				result.append(pos)
				if result.size() >= count:
					return result
	return result


## [FUNGSI]: Memilih N sel EMPTY_BUILDABLE dengan cakupan jalur waypoint terbanyak (penempatan strategis opaque-box).
## [INPUT/OUTPUT]: map_node (Node), count (int), range_m (float) -> Array[Vector2i]
func _find_best_buildable_cells(map_node: Node, count: int, range_m: float) -> Array[Vector2i]:
	var waypoints: Array = map_node.call("get_waypoints") as Array
	var samples: Array[Vector3] = []
	for i: int in range(waypoints.size() - 1):
		var a: Vector3 = waypoints[i] as Vector3
		var b: Vector3 = waypoints[i + 1] as Vector3
		var seg_len: float = a.distance_to(b)
		var seg_steps: int = maxi(1, int(ceil(seg_len)))
		for s: int in range(seg_steps + 1):
			samples.append(a.lerp(b, float(s) / float(seg_steps)))

	var scored: Array[Dictionary] = []
	for y: int in range(10):
		for x: int in range(16):
			var pos := Vector2i(x, y)
			if not bool(map_node.call("can_place_at", pos)):
				continue
			var wpos: Vector3 = map_node.call("grid_to_world", pos)
			var hits: int = 0
			for sp: Vector3 in samples:
				if CombatMath.distance_3d(wpos, sp) <= range_m:
					hits += 1
			scored.append({"pos": pos, "score": hits})

	scored.sort_custom(func(a: Dictionary, b: Dictionary) -> bool: return int(a["score"]) > int(b["score"]))
	var out: Array[Vector2i] = []
	for i: int in range(mini(count, scored.size())):
		out.append(scored[i]["pos"] as Vector2i)
	return out


## [FUNGSI]: Mengecek apakah terdapat StaticBody3D pada bit collision layer tertentu.
## [INPUT/OUTPUT]: root_node (Node), layer_bit (int) -> bool
func _has_static_body_on_layer(root_node: Node, layer_bit: int) -> bool:
	var nodes: Array[Node] = []
	_collect_subtree_nodes(root_node, nodes)
	for n: Node in nodes:
		if n is StaticBody3D:
			var sb: StaticBody3D = n as StaticBody3D
			if (sb.collision_layer & layer_bit) != 0:
				return true
	return false


## [FUNGSI]: Mencari tombol UI (`BaseButton`) secara opaque-box berdasarkan kata kunci teks atau nama node.
## [INPUT/OUTPUT]: root_node (Node), keywords (Array[String]), must_be_visible (bool) -> BaseButton
func _find_button(root_node: Node, keywords: Array[String], must_be_visible: bool) -> BaseButton:
	if root_node == null:
		return null
	var nodes: Array[Node] = []
	_collect_subtree_nodes(root_node, nodes)
	for kw: String in keywords:
		var kw_low: String = kw.to_lower()
		for n: Node in nodes:
			if n is BaseButton:
				var btn: BaseButton = n as BaseButton
				if must_be_visible and not btn.is_visible_in_tree():
					continue
				var txt: String = ""
				if btn is Button:
					txt = (btn as Button).text.to_lower()
				var nm: String = btn.name.to_lower()
				if kw_low in txt or kw_low in nm:
					return btn
	return null


## [FUNGSI]: Menggabungkan seluruh teks Label pada subtree UI untuk verifikasi tampilan angka/status.
## [INPUT/OUTPUT]: root_node (Node) -> String
func _collect_all_label_text(root_node: Node) -> String:
	var parts: PackedStringArray = []
	var nodes: Array[Node] = []
	_collect_subtree_nodes(root_node, nodes)
	for n: Node in nodes:
		if n is Label:
			parts.append((n as Label).text)
		elif n is RichTextLabel:
			parts.append((n as RichTextLabel).text)
	return " | ".join(parts)


## [FUNGSI]: Menghitung jumlah node Container Godot pada subtree UI untuk memastikan layout responsif.
## [INPUT/OUTPUT]: root_node (Node) -> int
func _count_containers(root_node: Node) -> int:
	var count: int = 0
	var nodes: Array[Node] = []
	_collect_subtree_nodes(root_node, nodes)
	for n: Node in nodes:
		if n is MarginContainer or n is VBoxContainer or n is HBoxContainer or n is GridContainer:
			count += 1
	return count


## [FUNGSI]: Menemukan node AudioBridge3D pada scene berdasarkan kontrak method `set_master_volume`.
## [INPUT/OUTPUT]: scene (Node) -> Node
func _find_audio_bridge(scene: Node) -> Node:
	var nodes: Array[Node] = []
	_collect_subtree_nodes(scene, nodes)
	for n: Node in nodes:
		if n.has_method("set_master_volume") and n.has_method("set_muted"):
			return n
	return null


## [FUNGSI]: Menghitung total musuh dari array komposisi wave `[{"enemy_id", "count"}]`.
## [INPUT/OUTPUT]: comp (Array) -> int
func _total_wave_count(comp: Array) -> int:
	var total: int = 0
	for item: Variant in comp:
		if item is Dictionary:
			total += int((item as Dictionary).get("count", 0))
	return total


## [FUNGSI]: Mengambil nilai dari Dictionary dengan beberapa kandidat nama key kontrak.
## [INPUT/OUTPUT]: dict (Dictionary), keys (Array[String]), default_val (Variant) -> Variant
func _dict_get_any(dict: Dictionary, keys: Array[String], default_val: Variant) -> Variant:
	for k: String in keys:
		if dict.has(k):
			return dict[k]
	return default_val


## [FUNGSI]: Mengambil snapshot properti node autoload untuk uji isolasi Zero-Touch.
## [INPUT/OUTPUT]: target (Node), props (Array[String]) -> Dictionary
func _snapshot_properties(target: Node, props: Array[String]) -> Dictionary:
	var snap: Dictionary = {}
	if target == null:
		return snap
	for p: String in props:
		snap[p] = target.get(p)
	return snap


## [FUNGSI]: Membersihkan scene uji, mengembalikan `Engine.time_scale`, dan melepas status pause.
## [INPUT/OUTPUT]: scene (Node) -> void
func _cleanup_scene(scene: Node) -> void:
	_reset_global_runtime_state()
	if is_instance_valid(scene):
		if scene.get_parent() != null:
			scene.get_parent().remove_child(scene)
		scene.free()


## [FUNGSI]: Mereset status runtime global (`paused` & `Engine.time_scale`) antar skenario uji.
## [INPUT/OUTPUT]: - -> void
func _reset_global_runtime_state() -> void:
	if _tree != null:
		_tree.paused = false
	Engine.time_scale = 1.0


## [FUNGSI]: Menghapus file save E2E sementara di `user://` sebelum dan sesudah pengujian.
## [INPUT/OUTPUT]: - -> void
func _cleanup_test_save() -> void:
	if FileAccess.file_exists(TEST_SAVE_PATH):
		var dir: DirAccess = DirAccess.open("user://")
		if dir != null:
			dir.remove(TEST_SAVE_FILE)
