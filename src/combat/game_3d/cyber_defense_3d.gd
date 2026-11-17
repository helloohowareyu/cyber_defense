class_name CyberDefense3D
extends Node3D
## Controller root scene CYBER DEFENSE 3D (`cyber_defense_3d.tscn`).
##
## [FUNGSI_MODUL]: Mengorkestrasi inisialisasi World3D, Systems, dan UILayer, menghubungkan
##   seluruh sinyal UI (Signal Up -> Call Down), menangani raycasting mouse 3D ke MapGrid3D
##   (layer 2) dan Tower3D (layer 1), hover preview penempatan, serta kontrol kamera taktis.
## [REFERENSI_KURIKULUM]: GDD §1, §3, §4, §9, §10 & AGENTS.md §2, §4.
## [ARAH_INTERAKSI]: Menyediakan aksesor get_controller(), get_main_menu(), get_hud(),
##   get_tower_menu(), get_overlays() untuk test E2E dan inspeksi.

## [FUNGSI]: Posisi awal kamera taktis untuk membingkai penuh arena 16x10 (32m x 20m).
const DEFAULT_CAMERA_POS: Vector3 = Vector3(0.0, 22.0, 19.0)
## [FUNGSI]: Titik fokus awal kamera taktis pada arena 3D.
const DEFAULT_CAMERA_TARGET: Vector3 = Vector3(0.0, 0.0, 0.5)
## [FUNGSI]: Kecepatan gerak pan kamera menggunakan keyboard WASD/Panah (meter/detik).
const CAMERA_PAN_SPEED: float = 16.0
## [FUNGSI]: Panjang raycast picking 3D dari kamera ke arena (meter).
const RAYCAST_MAX_DISTANCE: float = 120.0

var _camera: Camera3D = null
var _map: MapGrid3D = null
var _core: EnergyCore3D = null
var _towers_container: Node3D = null
var _enemies_container: Node3D = null
var _vfx: VFXManager3D = null

var _controller: GameController3D = null
var _economy: EconomyManager3D = null
var _spawner: WaveSpawner3D = null
var _audio: AudioBridge3D = null

var _main_menu: MainMenu3D = null
var _hud: GameplayHud3D = null
var _tower_menu: TowerRadialMenu3D = null
var _overlays: Overlays3D = null

var _initialized: bool = false
var _tower_preset_cache: Dictionary = {}


## [FUNGSI]: Memastikan subsistem dan sinyal terhubung segera saat scene memasuki tree.
## [INPUT/OUTPUT]: - -> void
func _enter_tree() -> void:
	_ensure_initialized()


## [FUNGSI]: Menyiapkan kamera awal, memuat pengaturan audio tersimpan, dan masuk state MENU.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	_ensure_initialized()
	_reset_camera()
	_apply_saved_audio_if_present()
	if _controller != null and _controller.get_state() == GameController3D.GameState.MENU:
		_on_game_state_changed(GameController3D.GameState.MENU)


## [FUNGSI]: Memproses pan kamera taktis WASD/Panah saat permainan berada di state PLAYING.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	if _camera == null or _controller == null:
		return
	if _controller.get_state() != GameController3D.GameState.PLAYING:
		return

	var pan_x: float = 0.0
	var pan_z: float = 0.0
	if Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT):
		pan_x -= 1.0
	if Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT):
		pan_x += 1.0
	if Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP):
		pan_z -= 1.0
	if Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN):
		pan_z += 1.0

	if not is_zero_approx(pan_x) or not is_zero_approx(pan_z):
		var dir := Vector3(pan_x, 0.0, pan_z).normalized()
		var next_pos: Vector3 = _camera.position + dir * CAMERA_PAN_SPEED * delta
		next_pos.x = clampf(next_pos.x, -10.0, 10.0)
		next_pos.z = clampf(next_pos.z, 8.0, 28.0)
		_camera.position = next_pos


## [FUNGSI]: Menangani input mouse 3D (hover preview, klik bangun/pilih/batal) dan tombol Escape.
## [INPUT/OUTPUT]: event (InputEvent) -> void
func _unhandled_input(event: InputEvent) -> void:
	if _controller == null or _controller.get_state() != GameController3D.GameState.PLAYING:
		return

	if event is InputEventKey:
		var ke: InputEventKey = event as InputEventKey
		if ke.pressed and not ke.echo and ke.keycode == KEY_ESCAPE:
			_handle_escape_in_playing()
			var vp_key: Viewport = get_viewport()
			if vp_key != null:
				vp_key.set_input_as_handled()
		return

	var vp: Viewport = get_viewport()
	if vp == null or vp.gui_get_hovered_control() != null:
		if _map != null:
			_map.clear_hover_preview()
		return

	if event is InputEventMouseMotion:
		_update_hover_preview((event as InputEventMouseMotion).position)
		return

	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event as InputEventMouseButton
		if not mb.pressed:
			return
		match mb.button_index:
			MOUSE_BUTTON_WHEEL_UP:
				_zoom_camera(-1.8)
				vp.set_input_as_handled()
			MOUSE_BUTTON_WHEEL_DOWN:
				_zoom_camera(1.8)
				vp.set_input_as_handled()
			MOUSE_BUTTON_RIGHT:
				_handle_right_click()
				vp.set_input_as_handled()
			MOUSE_BUTTON_LEFT:
				_handle_left_click(mb.position)
				vp.set_input_as_handled()


## [FUNGSI]: Mengembalikan referensi GameController3D untuk orkestrasi match dan test E2E.
## [INPUT/OUTPUT]: - -> GameController3D
func get_controller() -> GameController3D:
	_ensure_initialized()
	return _controller


## [FUNGSI]: Mengembalikan referensi MainMenu3D.
## [INPUT/OUTPUT]: - -> MainMenu3D
func get_main_menu() -> MainMenu3D:
	_ensure_initialized()
	return _main_menu


## [FUNGSI]: Mengembalikan referensi GameplayHud3D.
## [INPUT/OUTPUT]: - -> GameplayHud3D
func get_hud() -> GameplayHud3D:
	_ensure_initialized()
	return _hud


## [FUNGSI]: Mengembalikan referensi TowerRadialMenu3D.
## [INPUT/OUTPUT]: - -> TowerRadialMenu3D
func get_tower_menu() -> TowerRadialMenu3D:
	_ensure_initialized()
	return _tower_menu


## [FUNGSI]: Mengembalikan referensi Overlays3D.
## [INPUT/OUTPUT]: - -> Overlays3D
func get_overlays() -> Overlays3D:
	_ensure_initialized()
	return _overlays


## [FUNGSI]: Menginisialisasi seluruh subsistem, menyambungkan sinyal UI (Signal Up), dan sinkronisasi Core.
## [INPUT/OUTPUT]: - -> void
func _ensure_initialized() -> void:
	_resolve_nodes()

	if _map != null and _core != null and _core.position == Vector3.ZERO:
		_core.position = _map.get_core_world_position()

	if _controller != null and (_controller.get_map() == null or not _initialized):
		_controller.initialize_systems(
			_map,
			_core,
			_towers_container,
			_enemies_container,
			_vfx,
			_economy,
			_spawner,
			_audio
		)
		if not _controller.state_changed.is_connected(_on_game_state_changed):
			_controller.state_changed.connect(_on_game_state_changed)

	_wire_ui_subsystems()
	_initialized = true


## [FUNGSI]: Mencari dan menyimpan referensi seluruh node World3D, Systems, dan UILayer.
## [INPUT/OUTPUT]: - -> void
func _resolve_nodes() -> void:
	if _camera == null:
		_camera = get_node_or_null("World3D/Camera3D") as Camera3D
	if _map == null:
		_map = get_node_or_null("World3D/MapGrid3D") as MapGrid3D
	if _core == null:
		_core = get_node_or_null("World3D/EnergyCore3D") as EnergyCore3D
	if _towers_container == null:
		_towers_container = get_node_or_null("World3D/TowersContainer") as Node3D
	if _enemies_container == null:
		_enemies_container = get_node_or_null("World3D/EnemiesContainer") as Node3D
	if _vfx == null:
		_vfx = get_node_or_null("World3D/VFXManager3D") as VFXManager3D

	if _controller == null:
		_controller = get_node_or_null("Systems/GameController3D") as GameController3D
	if _economy == null:
		_economy = get_node_or_null("Systems/EconomyManager3D") as EconomyManager3D
	if _spawner == null:
		_spawner = get_node_or_null("Systems/WaveSpawner3D") as WaveSpawner3D
	if _audio == null:
		_audio = get_node_or_null("Systems/AudioBridge3D") as AudioBridge3D

	if _main_menu == null:
		_main_menu = get_node_or_null("UILayer/MainMenu3D") as MainMenu3D
	if _hud == null:
		_hud = get_node_or_null("UILayer/GameplayHud3D") as GameplayHud3D
	if _tower_menu == null:
		_tower_menu = get_node_or_null("UILayer/TowerRadialMenu3D") as TowerRadialMenu3D
	if _overlays == null:
		_overlays = get_node_or_null("UILayer/Overlays3D") as Overlays3D


## [FUNGSI]: Menghubungkan seluruh sinyal keluar UI ke handler CyberDefense3D (Signal Up -> Call Down).
## [INPUT/OUTPUT]: - -> void
func _wire_ui_subsystems() -> void:
	if _main_menu != null:
		_main_menu.setup(_controller, _overlays)
		if not _main_menu.play_requested.is_connected(_on_main_menu_play_requested):
			_main_menu.play_requested.connect(_on_main_menu_play_requested)
		if not _main_menu.settings_requested.is_connected(_on_open_settings_requested):
			_main_menu.settings_requested.connect(_on_open_settings_requested)
		if not _main_menu.how_to_play_requested.is_connected(_on_open_how_to_play_requested):
			_main_menu.how_to_play_requested.connect(_on_open_how_to_play_requested)
		if not _main_menu.exit_requested.is_connected(_on_exit_requested):
			_main_menu.exit_requested.connect(_on_exit_requested)

	if _hud != null and _controller != null:
		_hud.setup(_controller, _economy, _spawner, _core)
		if not _hud.speed_toggle_requested.is_connected(_on_hud_speed_toggle_requested):
			_hud.speed_toggle_requested.connect(_on_hud_speed_toggle_requested)
		if not _hud.start_wave_requested.is_connected(_on_hud_start_wave_requested):
			_hud.start_wave_requested.connect(_on_hud_start_wave_requested)
		if not _hud.pause_requested.is_connected(_on_hud_pause_requested):
			_hud.pause_requested.connect(_on_hud_pause_requested)
		if not _hud.tower_buy_selected.is_connected(_on_hud_tower_buy_selected):
			_hud.tower_buy_selected.connect(_on_hud_tower_buy_selected)
		if not _hud.build_cancel_requested.is_connected(_on_hud_build_cancel_requested):
			_hud.build_cancel_requested.connect(_on_hud_build_cancel_requested)

	if _tower_menu != null and _controller != null:
		_tower_menu.setup(_controller)
		if not _tower_menu.upgrade_requested.is_connected(_on_tower_upgrade_requested):
			_tower_menu.upgrade_requested.connect(_on_tower_upgrade_requested)
		if not _tower_menu.sell_requested.is_connected(_on_tower_sell_requested):
			_tower_menu.sell_requested.connect(_on_tower_sell_requested)
		if not _tower_menu.targeting_mode_requested.is_connected(_on_tower_targeting_requested):
			_tower_menu.targeting_mode_requested.connect(_on_tower_targeting_requested)
		if not _tower_menu.close_requested.is_connected(_on_tower_close_requested):
			_tower_menu.close_requested.connect(_on_tower_close_requested)

	if _overlays != null and _controller != null:
		_overlays.setup(_controller, _audio)
		if not _overlays.resume_requested.is_connected(_on_overlay_resume_requested):
			_overlays.resume_requested.connect(_on_overlay_resume_requested)
		if not _overlays.retry_requested.is_connected(_on_overlay_retry_requested):
			_overlays.retry_requested.connect(_on_overlay_retry_requested)
		if not _overlays.main_menu_requested.is_connected(_on_overlay_menu_requested):
			_overlays.main_menu_requested.connect(_on_overlay_menu_requested)
		if not _overlays.settings_requested.is_connected(_on_open_settings_requested):
			_overlays.settings_requested.connect(_on_open_settings_requested)
		if not _overlays.back_requested.is_connected(_on_overlay_back_requested):
			_overlays.back_requested.connect(_on_overlay_back_requested)
		if not _overlays.volume_changed.is_connected(_on_overlay_volume_changed):
			_overlays.volume_changed.connect(_on_overlay_volume_changed)
		if not _overlays.mute_toggled.is_connected(_on_overlay_mute_toggled):
			_overlays.mute_toggled.connect(_on_overlay_mute_toggled)


## [FUNGSI]: Memuat preferensi volume & mute dari file simpanan bila sudah ada di disk.
## [INPUT/OUTPUT]: - -> void
func _apply_saved_audio_if_present() -> void:
	if _audio == null:
		return
	if not FileAccess.file_exists(GameConstants3D.SAVE_FILE_PATH):
		return
	var data: Dictionary = SaveManager3D.load_data()
	_audio.set_master_volume(float(data.get("master_volume", 1.0)))
	_audio.set_muted(bool(data.get("muted", false)))


## [FUNGSI]: Mengatur ulang posisi dan orientasi kamera taktis ke sudut pandang default arena.
## [INPUT/OUTPUT]: - -> void
func _reset_camera() -> void:
	if _camera == null:
		return
	_camera.position = DEFAULT_CAMERA_POS
	_camera.look_at(DEFAULT_CAMERA_TARGET, Vector3.UP)


## [FUNGSI]: Melakukan zoom kamera sepanjang sumbu pandang dengan batas ketinggian aman.
## [INPUT/OUTPUT]: step_delta (float) -> void
func _zoom_camera(step_delta: float) -> void:
	if _camera == null:
		return
	var forward: Vector3 = -_camera.global_transform.basis.z.normalized()
	var candidate: Vector3 = _camera.position - forward * step_delta
	if candidate.y < 13.0 or candidate.y > 30.0:
		return
	candidate.x = clampf(candidate.x, -10.0, 10.0)
	candidate.z = clampf(candidate.z, 8.0, 28.0)
	_camera.position = candidate


## [FUNGSI]: Melakukan raycast dari posisi layar mouse ke PhysicsWorld3D untuk mask tertentu.
## [INPUT/OUTPUT]: screen_pos (Vector2), collision_mask (int) -> Dictionary
func _raycast_from_screen(screen_pos: Vector2, collision_mask: int) -> Dictionary:
	if _camera == null or not is_inside_tree():
		return {}
	var world_3d: World3D = get_world_3d()
	if world_3d == null or world_3d.direct_space_state == null:
		return {}
	var origin: Vector3 = _camera.project_ray_origin(screen_pos)
	var ray_dir: Vector3 = _camera.project_ray_normal(screen_pos)
	var query := PhysicsRayQueryParameters3D.create(
		origin,
		origin + ray_dir * RAYCAST_MAX_DISTANCE,
		collision_mask
	)
	return world_3d.direct_space_state.intersect_ray(query)


## [FUNGSI]: Memperbarui tile highlight hover & Range Ring pada MapGrid3D saat mode pembangunan aktif.
## [INPUT/OUTPUT]: screen_pos (Vector2) -> void
func _update_hover_preview(screen_pos: Vector2) -> void:
	if _map == null or _controller == null:
		return
	var build_key: String = _controller.get_selected_build_tower()
	if build_key.is_empty():
		_map.clear_hover_preview()
		return
	var hit: Dictionary = _raycast_from_screen(screen_pos, MapGrid3D.RAYCAST_LAYER_MASK)
	if hit.is_empty():
		_map.clear_hover_preview()
		return
	var world_pos: Vector3 = hit.get("position", Vector3.ZERO) as Vector3
	var grid_pos: Vector2i = _map.world_to_grid(world_pos)
	var valid: bool = _map.can_place_at(grid_pos) and _controller.get_tower_at_grid(grid_pos) == null
	var range_m: float = _get_tower_range_meters(build_key)
	_map.set_hover_preview(grid_pos, valid, range_m)


## [FUNGSI]: Memproses klik kiri 3D untuk menempatkan menara, memilih menara, atau menutup seleksi.
## [INPUT/OUTPUT]: screen_pos (Vector2) -> void
func _handle_left_click(screen_pos: Vector2) -> void:
	if _controller == null or _map == null:
		return
	var build_key: String = _controller.get_selected_build_tower()
	var grid_hit: Dictionary = _raycast_from_screen(screen_pos, MapGrid3D.RAYCAST_LAYER_MASK)
	if not build_key.is_empty():
		if not grid_hit.is_empty():
			var gp: Vector2i = _map.world_to_grid(grid_hit["position"] as Vector3)
			_controller.try_place_tower_at_grid(gp)
		return

	# Cek collider Tower3D (layer 1) lebih dulu, lalu fallback lookup koordinat grid
	var tower_hit: Dictionary = _raycast_from_screen(screen_pos, 1)
	if not tower_hit.is_empty():
		var col_obj: Object = tower_hit.get("collider", null)
		if col_obj is Node:
			var parent_node: Node = (col_obj as Node).get_parent()
			if parent_node is Tower3D:
				_controller.select_tower(parent_node as Tower3D)
				return

	if not grid_hit.is_empty():
		var gp_sel: Vector2i = _map.world_to_grid(grid_hit["position"] as Vector3)
		var found_tower: Tower3D = _controller.get_tower_at_grid(gp_sel)
		if found_tower != null:
			_controller.select_tower(found_tower)
			return
		if _map.can_place_at(gp_sel) and _hud != null:
			_hud.set_status_message("Pilih menara di bar BUILD bawah (Laser / Cannon / Freeze / Armor Pen) dulu, lalu klik sel ini!")

	_controller.deselect_tower()


## [FUNGSI]: Membatalkan mode build atau menutup seleksi menara saat klik kanan ditekan.
## [INPUT/OUTPUT]: - -> void
func _handle_right_click() -> void:
	if _controller == null:
		return
	if not _controller.get_selected_build_tower().is_empty():
		_controller.cancel_build_mode()
	elif _controller.get_selected_tower() != null:
		_controller.deselect_tower()


## [FUNGSI]: Menangani tombol Escape saat PLAYING (batal build -> batal seleksi -> toggle pause).
## [INPUT/OUTPUT]: - -> void
func _handle_escape_in_playing() -> void:
	if _controller == null:
		return
	if not _controller.get_selected_build_tower().is_empty():
		_controller.cancel_build_mode()
	elif _controller.get_selected_tower() != null:
		_controller.deselect_tower()
	else:
		_controller.toggle_pause()


## [FUNGSI]: Mengambil jarak serangan Level 1 dalam meter untuk preview penempatan menara.
## [INPUT/OUTPUT]: tower_key (String) -> float
func _get_tower_range_meters(tower_key: String) -> float:
	if not _tower_preset_cache.has(tower_key):
		var path: String = GameConstants3D.get_tower_preset_path(tower_key)
		if not path.is_empty() and ResourceLoader.exists(path):
			_tower_preset_cache[tower_key] = ResourceLoader.load(path) as TowerStatsData
		else:
			_tower_preset_cache[tower_key] = null
	var preset: TowerStatsData = _tower_preset_cache.get(tower_key, null) as TowerStatsData
	if preset == null:
		return 0.0
	return CombatMath.get_scaled_range_meters(preset.base_range_gdd, 1)


## [FUNGSI]: Menyelaraskan lapisan UI dengan perubahan state GameController3D.
## [INPUT/OUTPUT]: new_state (int) -> void
func _on_game_state_changed(new_state: int) -> void:
	match new_state:
		GameController3D.GameState.MENU:
			_reset_camera()
			if _map != null:
				_map.clear_hover_preview()
			if _main_menu != null:
				_main_menu.show_menu()
			if _hud != null:
				_hud.hide_hud()
			if _tower_menu != null:
				_tower_menu.hide_menu()
			if _overlays != null:
				_overlays.hide_all()
		GameController3D.GameState.PLAYING:
			if _main_menu != null:
				_main_menu.hide_menu()
			if _overlays != null:
				_overlays.hide_all()
			if _hud != null:
				_hud.show_hud()
				_hud.set_status_message("")
		GameController3D.GameState.PAUSED:
			if _map != null:
				_map.clear_hover_preview()
			if _tower_menu != null:
				_tower_menu.hide_menu()
		GameController3D.GameState.VICTORY, GameController3D.GameState.GAME_OVER:
			if _map != null:
				_map.clear_hover_preview()
			if _tower_menu != null:
				_tower_menu.hide_menu()


## [FUNGSI]: Memulai match baru saat MainMenu3D memancarkan sinyal play_requested.
## [INPUT/OUTPUT]: - -> void
func _on_main_menu_play_requested() -> void:
	if _main_menu != null:
		_main_menu.hide_menu()
	if _controller != null:
		_controller.start_new_game()


## [FUNGSI]: Membuka overlay Settings dari MainMenu3D atau Pause Overlay.
## [INPUT/OUTPUT]: - -> void
func _on_open_settings_requested() -> void:
	if _audio != null:
		_audio.play_sfx("ui_click")
	if _overlays != null:
		_overlays.show_settings()


## [FUNGSI]: Membuka overlay How to Play dari MainMenu3D.
## [INPUT/OUTPUT]: - -> void
func _on_open_how_to_play_requested() -> void:
	if _audio != null:
		_audio.play_sfx("ui_click")
	if _overlays != null:
		_overlays.show_how_to_play()


## [FUNGSI]: Keluar aplikasi dengan aman (menghindari terminasi paksa pada runner headless).
## [INPUT/OUTPUT]: - -> void
func _on_exit_requested() -> void:
	if DisplayServer.get_name() == "headless":
		return
	var tree: SceneTree = get_tree()
	if tree != null:
		tree.quit()


## [FUNGSI]: Mengubah kecepatan simulasi 1x <-> 2x dan menyinkronkan tombol HUD.
## [INPUT/OUTPUT]: - -> void
func _on_hud_speed_toggle_requested() -> void:
	if _controller == null:
		return
	var cur_spd: float = _controller.get_game_speed()
	var next_spd: float = 2.0 if cur_spd < 1.5 else 1.0
	_controller.set_game_speed(next_spd)
	if _hud != null:
		_hud.sync_speed(next_spd)
	if _audio != null:
		_audio.play_sfx("ui_click")


## [FUNGSI]: Memulai gelombang serangan berikutnya saat tombol Start Wave ditekan.
## [INPUT/OUTPUT]: - -> void
func _on_hud_start_wave_requested() -> void:
	if _controller != null:
		_controller.start_next_wave()


## [FUNGSI]: Mengalihkan status jeda saat tombol Pause ditekan.
## [INPUT/OUTPUT]: - -> void
func _on_hud_pause_requested() -> void:
	if _controller != null:
		_controller.toggle_pause()


## [FUNGSI]: Mengaktifkan mode pembangunan menara terpilih dan memutar SFX UI.
## [INPUT/OUTPUT]: tower_key (String) -> void
func _on_hud_tower_buy_selected(tower_key: String) -> void:
	if _audio != null:
		_audio.play_sfx("ui_click")
	if _controller != null:
		_controller.select_build_tower(tower_key)


## [FUNGSI]: Membatalkan mode pembangunan menara saat tombol Cancel pada HUD ditekan.
## [INPUT/OUTPUT]: - -> void
func _on_hud_build_cancel_requested() -> void:
	if _controller != null:
		_controller.cancel_build_mode()


## [FUNGSI]: Memproses upgrade menara terpilih dari TowerRadialMenu3D.
## [INPUT/OUTPUT]: - -> void
func _on_tower_upgrade_requested() -> void:
	if _controller != null:
		_controller.upgrade_selected_tower()


## [FUNGSI]: Memproses penjualan menara terpilih dari TowerRadialMenu3D.
## [INPUT/OUTPUT]: - -> void
func _on_tower_sell_requested() -> void:
	if _controller != null:
		_controller.sell_selected_tower()


## [FUNGSI]: Mengubah mode penargetan menara terpilih dari TowerRadialMenu3D.
## [INPUT/OUTPUT]: mode (TargetSelector.Mode) -> void
func _on_tower_targeting_requested(mode: TargetSelector.Mode) -> void:
	if _controller != null:
		_controller.set_selected_tower_targeting_mode(mode)


## [FUNGSI]: Menutup seleksi menara saat tombol Close pada TowerRadialMenu3D ditekan.
## [INPUT/OUTPUT]: - -> void
func _on_tower_close_requested() -> void:
	if _controller != null:
		_controller.deselect_tower()


## [FUNGSI]: Melanjutkan permainan dari overlay Pause.
## [INPUT/OUTPUT]: - -> void
func _on_overlay_resume_requested() -> void:
	if _controller != null:
		_controller.set_paused(false)
	elif _overlays != null:
		_overlays.hide_all()


## [FUNGSI]: Mengulang match baru dari overlay Pause, Victory, atau Game Over.
## [INPUT/OUTPUT]: - -> void
func _on_overlay_retry_requested() -> void:
	if _overlays != null:
		_overlays.hide_all()
	if _controller != null:
		_controller.start_new_game()


## [FUNGSI]: Mengembalikan permainan ke Main Menu dari overlay.
## [INPUT/OUTPUT]: - -> void
func _on_overlay_menu_requested() -> void:
	if _overlays != null:
		_overlays.hide_all()
	if _controller != null:
		_controller.return_to_menu()


## [FUNGSI]: Menangani tombol Back pada overlay Settings atau How to Play.
## [INPUT/OUTPUT]: - -> void
func _on_overlay_back_requested() -> void:
	if _overlays == null:
		return
	if _controller != null and _controller.get_state() == GameController3D.GameState.PAUSED:
		_overlays.show_pause()
	else:
		_overlays.hide_all()


## [FUNGSI]: Menerapkan perubahan Master Volume ke AudioBridge3D dan menyimpannya ke SaveManager3D.
## [INPUT/OUTPUT]: vol (float) -> void
func _on_overlay_volume_changed(vol: float) -> void:
	if _audio != null:
		_audio.set_master_volume(vol)
	var muted: bool = _audio.is_muted() if _audio != null else false
	SaveManager3D.save_audio_settings(vol, muted)


## [FUNGSI]: Menerapkan status mute ke AudioBridge3D dan menyimpannya ke SaveManager3D.
## [INPUT/OUTPUT]: muted (bool) -> void
func _on_overlay_mute_toggled(muted: bool) -> void:
	if _audio != null:
		_audio.set_muted(muted)
	var vol: float = _audio.get_master_volume() if _audio != null else 1.0
	SaveManager3D.save_audio_settings(vol, muted)
