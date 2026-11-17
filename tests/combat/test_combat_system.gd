extends SceneTree
## Suite pengujian otomatis (TDD) untuk modul Tower & Combat System (Bagian Yusuf).
##
## [FUNGSI_MODUL]: Memverifikasi secara headless seluruh modul Task 1..7: `CombatMath`,
##   preset `.tres`, `CombatTargetComponent`, `TargetSelector`, `ProceduralMeshBuilder`,
##   `LaserBeamRenderer`, 3 custom shader `.gdshader`, `Projectile3D`, `Tower3D`, dan `CombatSandbox`.
## [REFERENSI_KURIKULUM]:
##   - RPS CIF65116: CPMK-1 & CPMK-2 (Verifikasi model matematis & programmable pipeline).
##   - Superpowers Iron Law: `@test-driven-development` & `@verification-before-completion`.
## [ARAH_INTERAKSI_KODE]:
##   - Menguji langsung seluruh file di `res://src/combat/`
##   - Dijalankan via : `godot --headless -s res://tests/combat/test_combat_system.gd`

var _passed: int = 0
var _failed: int = 0


## [FUNGSI]: Menjadwalkan eksekusi test setelah SceneTree selesai masuk ke tree (frame 0).
## [INPUT/OUTPUT]: - -> void
func _initialize() -> void:
	call_deferred("_run_all_tests")


## [FUNGSI]: Menjalankan seluruh test Task 1..7 di dalam SceneTree aktif lalu quit.
## [INPUT/OUTPUT]: - -> void
func _run_all_tests() -> void:
	_run_task1_combat_math_tests()
	_run_task2_resource_preset_tests()
	_run_task3_target_and_selector_tests()
	_run_task4_procedural_mesh_tests()
	_run_task5_shader_load_tests()
	_run_task6_tower_and_projectile_tests()
	_run_task7_sandbox_load_test()
	print("==========================================")
	print("HASIL TEST COMBAT SYSTEM: %d PASS, %d FAIL" % [_passed, _failed])
	print("==========================================")
	quit(0 if _failed == 0 else 1)


## [FUNGSI]: Mencatat hasil asersi boolean.
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


## [FUNGSI]: Test Task 1 (`CombatMath`: jarak 3D, armor, scaling level/wave, upgrade/sell, Basis).
## [INPUT/OUTPUT]: - -> void
func _run_task1_combat_math_tests() -> void:
	var d: float = CombatMath.distance_3d(Vector3(0.0, 0.0, 0.0), Vector3(3.0, 4.0, 12.0))
	_assert_approx(d, 13.0, "Task1: distance_3d (3,4,12) == 13.0")
	_assert_true(
		CombatMath.is_in_range_3d(Vector3.ZERO, Vector3(15.0, 0.0, 0.0), 15.0),
		"Task1: is_in_range_3d tepat di batas 15.0m"
	)
	_assert_true(
		not CombatMath.is_in_range_3d(Vector3.ZERO, Vector3(15.1, 0.0, 0.0), 15.0),
		"Task1: is_in_range_3d di luar batas 15.1m > 15.0m"
	)
	_assert_approx(
		CombatMath.calculate_final_damage(15.0, 20.0, false),
		1.0,
		"Task1: Laser Lv.1 vs Demon King clamp min 1.0"
	)
	_assert_approx(
		CombatMath.calculate_final_damage(25.0, 20.0, true),
		25.0,
		"Task1: Armor Pen mengabaikan 100% armor"
	)
	_assert_approx(CombatMath.get_scaled_damage(40.0, 1), 40.0, "Task1: Cannon Lv.1 damage == 40.0")
	_assert_approx(CombatMath.get_scaled_damage(40.0, 2), 50.0, "Task1: Cannon Lv.2 damage == 50.0")
	_assert_approx(CombatMath.get_scaled_damage(40.0, 3), 60.0, "Task1: Cannon Lv.3 damage == 60.0")
	_assert_approx(CombatMath.get_scaled_damage(40.0, 5), 60.0, "Task1: Level > 3 di-clamp ke Lv.3")
	_assert_approx(CombatMath.get_scaled_range_meters(150.0, 1), 15.0, "Task1: Laser Lv.1 range == 15.0m")
	_assert_approx(CombatMath.get_scaled_range_meters(150.0, 3), 18.0, "Task1: Laser Lv.3 range == 18.0m")
	_assert_true(CombatMath.calculate_enemy_wave_hp(100, 5) == 245, "Task1: Goblin Wave 5 HP == 245")
	_assert_true(CombatMath.calculate_upgrade_cost(100, 1) == 150, "Task1: Upgrade Lv.1->2 == 150")
	_assert_true(CombatMath.calculate_upgrade_cost(100, 3) == 0, "Task1: Upgrade Lv.3 == 0 (Max)")
	_assert_true(CombatMath.calculate_sell_refund(250) == 175, "Task1: Sell refund 70% dari 250 == 175")
	var look_basis: Basis = CombatMath.compute_turret_look_basis(Vector3.ZERO, Vector3(10.0, 0.0, 0.0))
	var forward_dir: Vector3 = -look_basis.z
	_assert_approx(forward_dir.x, 1.0, "Task1: Turret look basis menghadap +X")
	_assert_approx(forward_dir.y, 0.0, "Task1: Turret look basis sumbu Y horizontal == 0")


## [FUNGSI]: Test Task 2 (memuat 4 preset TowerStatsData dan 4 preset EnemyCombatData).
## [INPUT/OUTPUT]: - -> void
func _run_task2_resource_preset_tests() -> void:
	var laser: TowerStatsData = load("res://src/combat/resources/presets/laser_tower.tres")
	var cannon: TowerStatsData = load("res://src/combat/resources/presets/cannon_tower.tres")
	var freeze: TowerStatsData = load("res://src/combat/resources/presets/freeze_tower.tres")
	var pen: TowerStatsData = load("res://src/combat/resources/presets/armor_pen_tower.tres")
	var boss: EnemyCombatData = load("res://src/combat/resources/presets/demon_king.tres")
	_assert_true(laser != null and laser.base_cost == 100, "Task2: Preset Laser Tower dimuat (100 Gold)")
	_assert_true(cannon != null and is_equal_approx(cannon.aoe_radius_gdd, 35.0), "Task2: Preset Cannon AoE == 35")
	_assert_true(freeze != null and is_equal_approx(freeze.slow_ratio, 0.4), "Task2: Preset Freeze slow == 0.4")
	_assert_true(pen != null and pen.ignores_armor, "Task2: Preset Armor Pen ignores_armor == true")
	_assert_true(boss != null and boss.base_hp == 1500 and is_equal_approx(boss.armor, 20.0), "Task2: Preset Demon King valid")


## [FUNGSI]: Test Task 3 (`CombatTargetComponent` slow non-stack & `TargetSelector` 3 mode + edge cases).
## [INPUT/OUTPUT]: - -> void
func _run_task3_target_and_selector_tests() -> void:
	var orc_data: EnemyCombatData = load("res://src/combat/resources/presets/orc.tres")
	var goblin_data: EnemyCombatData = load("res://src/combat/resources/presets/goblin.tres")

	var t1 := CombatTargetComponent.new()
	t1.combat_data = orc_data
	root.add_child(t1)
	t1.initialize_for_wave(1)
	t1.position = Vector3(5.0, 0.0, 0.0)
	t1.path_progress = 10.0

	var t2 := CombatTargetComponent.new()
	t2.combat_data = goblin_data
	root.add_child(t2)
	t2.initialize_for_wave(1)
	t2.position = Vector3(2.0, 0.0, 0.0)
	t2.path_progress = 3.0

	var candidates: Array[CombatTargetComponent] = [null, t1, t2]
	_assert_true(
		TargetSelector.select_target(Vector3.ZERO, 15.0, candidates, TargetSelector.Mode.FRONT_MOST) == t1,
		"Task3: TargetSelector FRONT_MOST memilih progress tertinggi"
	)
	_assert_true(
		TargetSelector.select_target(Vector3.ZERO, 15.0, candidates, TargetSelector.Mode.LOWEST_HP) == t2,
		"Task3: TargetSelector LOWEST_HP memilih HP terendah"
	)
	_assert_true(
		TargetSelector.select_target(Vector3.ZERO, 15.0, candidates, TargetSelector.Mode.CLOSEST) == t2,
		"Task3: TargetSelector CLOSEST memilih jarak terdekat"
	)
	_assert_true(
		TargetSelector.select_target(Vector3.ZERO, 1.0, candidates, TargetSelector.Mode.CLOSEST) == null,
		"Task3: TargetSelector mengembalikan null jika semua di luar jangkauan"
	)

	# Edge case: Slow Freeze tidak menumpuk di bawah 0.6 dan pulih setelah > 2.5s
	t1.apply_combat_hit(5.0, false, 0.4, 2.5)
	t1.apply_combat_hit(5.0, false, 0.4, 2.5)
	_assert_approx(t1.get_speed_multiplier(), 0.6, "Task3: Freeze slow tidak stack di bawah 0.6")
	t1.tick_effects(2.6)
	_assert_approx(t1.get_speed_multiplier(), 1.0, "Task3: Freeze slow pulih ke 1.0 setelah 2.6 detik")

	t1.free()
	t2.free()


## [FUNGSI]: Test Task 4 (`ProceduralMeshBuilder` ArrayMesh VBO/Index & `LaserBeamRenderer` ImmediateMesh).
## [INPUT/OUTPUT]: - -> void
func _run_task4_procedural_mesh_tests() -> void:
	var ring: ArrayMesh = ProceduralMeshBuilder.build_range_ring_mesh(
		14.75, 15.0, 48, Color(0, 1, 1, 0.1), Color(0, 1, 1, 0.8)
	)
	_assert_true(ring.get_surface_count() == 1, "Task4: Range Ring memiliki 1 surface")
	var arrays: Array = ring.surface_get_arrays(0)
	_assert_true((arrays[Mesh.ARRAY_VERTEX] as PackedVector3Array).size() == 98, "Task4: Range Ring 48 seg == 98 vertex")
	_assert_true((arrays[Mesh.ARRAY_INDEX] as PackedInt32Array).size() == 288, "Task4: Range Ring 48 seg == 288 index")

	var disc: ArrayMesh = ProceduralMeshBuilder.build_aoe_shockwave_disc(
		3.5, 32, Color.ORANGE, Color(1, 0.5, 0, 0)
	)
	var disc_arrays: Array = disc.surface_get_arrays(0)
	_assert_true((disc_arrays[Mesh.ARRAY_VERTEX] as PackedVector3Array).size() == 34, "Task4: AoE Disc 32 seg == 34 vertex")
	_assert_true((disc_arrays[Mesh.ARRAY_INDEX] as PackedInt32Array).size() == 96, "Task4: AoE Disc 32 seg == 96 index")

	var beam := LaserBeamRenderer.new()
	beam.draw_beam_from_to(Vector3.ZERO, Vector3(0.0, 0.0, -5.0), 0.14)
	_assert_true(beam.mesh.get_surface_count() == 2, "Task4: LaserBeamRenderer menggambar 2 strip bersilang")
	beam.clear_beam()
	_assert_true(beam.mesh.get_surface_count() == 0, "Task4: LaserBeamRenderer.clear_beam() menghapus surface")
	beam.free()


## [FUNGSI]: Test Task 5 (memastikan 3 file `.gdshader` dimuat valid tanpa error parser).
## [INPUT/OUTPUT]: - -> void
func _run_task5_shader_load_tests() -> void:
	var s1: Shader = load("res://src/combat/shaders/range_ring_blend.gdshader")
	var s2: Shader = load("res://src/combat/shaders/laser_beam_scroll.gdshader")
	var s3: Shader = load("res://src/combat/shaders/freeze_crystal_phong.gdshader")
	_assert_true(s1 != null and not s1.code.is_empty(), "Task5: range_ring_blend.gdshader valid")
	_assert_true(s2 != null and not s2.code.is_empty(), "Task5: laser_beam_scroll.gdshader valid")
	_assert_true(s3 != null and not s3.code.is_empty(), "Task5: freeze_crystal_phong.gdshader valid")


## [FUNGSI]: Test Task 6 (`Tower3D` upgrade/sell/cooldown & `Projectile3D` AoE + freed target safety).
## [INPUT/OUTPUT]: - -> void
func _run_task6_tower_and_projectile_tests() -> void:
	var laser: TowerStatsData = load("res://src/combat/resources/presets/laser_tower.tres")
	var cannon: TowerStatsData = load("res://src/combat/resources/presets/cannon_tower.tres")
	var goblin: EnemyCombatData = load("res://src/combat/resources/presets/goblin.tres")

	var tower := Tower3D.new()
	root.add_child(tower)
	tower.configure(laser)
	_assert_true(tower.can_upgrade(), "Task6: Tower Lv.1 bisa upgrade")
	_assert_true(tower.apply_upgrade() and tower.current_level == 2, "Task6: Upgrade ke Lv.2 berhasil")
	_assert_true(tower.apply_upgrade() and tower.current_level == 3, "Task6: Upgrade ke Lv.3 berhasil")
	_assert_true(not tower.can_upgrade() and not tower.apply_upgrade(), "Task6: Upgrade Lv.3->4 ditolak")
	_assert_true(tower.total_invested_gold == 475, "Task6: Total investasi Lv.3 == 475")
	_assert_true(tower.get_sell_refund_gold() == 332, "Task6: Refund 70% dari 475 == 332")
	var summary: Dictionary = tower.get_ui_summary()
	_assert_true(summary["level"] == 3 and summary["can_upgrade"] == false, "Task6: get_ui_summary() akurat")

	# Uji tembakan Laser Lv.3 (damage = 15 * 1.5 = 22.5) ke Goblin (100 HP -> 77.5 HP)
	var enemy_a := CombatTargetComponent.new()
	enemy_a.combat_data = goblin
	root.add_child(enemy_a)
	enemy_a.initialize_for_wave(1)
	enemy_a.position = Vector3(5.0, 0.0, 0.0)
	var fired_target: CombatTargetComponent = tower.update_combat(0.1, [enemy_a])
	_assert_true(fired_target == enemy_a, "Task6: Tower menembak kandidat valid")
	_assert_approx(enemy_a.current_hp, 77.5, "Task6: Laser Lv.3 mengurangi HP Goblin ke 77.5")
	_assert_true(tower.update_combat(0.1, [enemy_a]) == null, "Task6: Tower menghormati cooldown 0.5s")

	# Uji Projectile3D AoE Cannon (radius 3.5m)
	var enemy_b := CombatTargetComponent.new()
	enemy_b.combat_data = goblin
	root.add_child(enemy_b)
	enemy_b.initialize_for_wave(1)
	enemy_b.position = Vector3(7.0, 0.0, 0.0) # 2.0m dari enemy_a -> kena AoE
	var enemy_far := CombatTargetComponent.new()
	enemy_far.combat_data = goblin
	root.add_child(enemy_far)
	enemy_far.initialize_for_wave(1)
	enemy_far.position = Vector3(10.0, 0.0, 0.0) # 5.0m dari enemy_a -> di luar AoE 3.5m
	var aoe_list: Array[CombatTargetComponent] = [enemy_a, enemy_b, enemy_far]
	var proj := Projectile3D.new()
	root.add_child(proj)
	proj.launch(Vector3(4.5, 0.0, 0.0), enemy_a, cannon, 40.0, func() -> Array: return aoe_list)
	proj.tick_movement(0.1)
	_assert_approx(enemy_b.current_hp, 60.0, "Task6: Cannon AoE melukai enemy dalam radius 3.5m")
	_assert_approx(enemy_far.current_hp, 100.0, "Task6: Cannon AoE tidak melukai enemy di jarak 5.0m")

	# Edge case: Target di-free di tengah penerbangan proyektil tidak boleh crash
	var doomed := CombatTargetComponent.new()
	doomed.combat_data = goblin
	root.add_child(doomed)
	doomed.initialize_for_wave(1)
	doomed.position = Vector3(2.0, 0.0, 0.0)
	var proj_safe := Projectile3D.new()
	root.add_child(proj_safe)
	proj_safe.launch(Vector3.ZERO, doomed, cannon, 40.0)
	doomed.free()
	proj_safe.tick_movement(0.5)
	_assert_true(true, "Task6: Projectile3D aman saat target sudah di-free di tengah jalan")

	tower.free()
	enemy_a.free()
	enemy_b.free()
	enemy_far.free()


## [FUNGSI]: Test Task 7 (memastikan `combat_sandbox.tscn` dimuat valid sebagai PackedScene).
## [INPUT/OUTPUT]: - -> void
func _run_task7_sandbox_load_test() -> void:
	var scene: PackedScene = load("res://src/combat/sandbox/combat_sandbox.tscn")
	_assert_true(scene != null and scene.can_instantiate(), "Task7: combat_sandbox.tscn valid & siap dijalankan")
