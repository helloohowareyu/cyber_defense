class_name Overlays3D
extends Control
## Pengelola layar overlay modal berbasis Container (Pause, Settings, How to Play, Victory, Game Over).
##
## [FUNGSI_MODUL]: Menyediakan modal interaktif PROCESS_MODE_ALWAYS dengan latar redup pemblokir
##   klik, kontrol volume/mute (HSlider + CheckButton), panduan taktis lengkap, serta layar
##   Victory/Game Over berisi Wave Reached, Enemies Defeated, Score, dan High Score.
## [REFERENSI_KURIKULUM]: GDD §9.4 & §9.5 (Overlays & Game Result Screens) & AGENTS.md §2.
## [ARAH_INTERAKSI]: Memancarkan sinyal aksi ke CyberDefense3D (Signal Up); menerima perintah
##   tampil/sembunyi dan ringkasan statistik akhir match dari CyberDefense3D (Call Down).

## [FUNGSI]: Dipancarkan saat pemain menekan Resume pada overlay Pause.
signal resume_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan Retry / Play Again pada Pause, Victory, atau Game Over.
signal retry_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan Main Menu dari overlay.
signal main_menu_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan Settings dari overlay Pause.
signal settings_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan Back pada Settings atau How to Play.
signal back_requested()
## [FUNGSI]: Dipancarkan saat slider Master Volume digeser oleh pemain.
signal volume_changed(volume_linear: float)
## [FUNGSI]: Dipancarkan saat CheckButton Mute Audio diubah statusnya.
signal mute_toggled(muted: bool)

const COLOR_BG_PANEL: Color = Color("#0f172a")
const COLOR_BG_CARD: Color = Color("#1e293b")
const COLOR_CYAN: Color = Color("#22d3ee")
const COLOR_AMBER: Color = Color("#f59e0b")
const COLOR_CRIMSON: Color = Color("#ef4444")
const COLOR_EMERALD: Color = Color("#10b981")
const COLOR_TEXT_MAIN: Color = Color("#f8fafc")
const COLOR_TEXT_MUTED: Color = Color("#94a3b8")

var _controller: GameController3D = null
var _audio: AudioBridge3D = null

var _pause_panel: PanelContainer = null
var _settings_panel: PanelContainer = null
var _how_to_play_panel: PanelContainer = null
var _victory_panel: PanelContainer = null
var _game_over_panel: PanelContainer = null

var _victory_stats_label: Label = null
var _game_over_stats_label: Label = null

var _volume_slider: HSlider = null
var _volume_value_label: Label = null
var _mute_check: CheckButton = null


## [FUNGSI]: Membangun seluruh modal overlay dan menyembunyikannya saat inisialisasi.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_ensure_layout()
	hide_all()


## [FUNGSI]: Menangani tombol Escape saat overlay modal tampil agar pengguna bisa kembali/resume.
## [INPUT/OUTPUT]: event (InputEvent) -> void
func _unhandled_input(event: InputEvent) -> void:
	if not visible:
		return
	if event is InputEventKey:
		var ke: InputEventKey = event as InputEventKey
		if ke.pressed and not ke.echo and ke.keycode == KEY_ESCAPE:
			if (_settings_panel != null and _settings_panel.visible) or (_how_to_play_panel != null and _how_to_play_panel.visible):
				_on_back_pressed()
				get_viewport().set_input_as_handled()
			elif _pause_panel != null and _pause_panel.visible:
				_on_resume_pressed()
				get_viewport().set_input_as_handled()


## [FUNGSI]: Memastikan seluruh panel modal telah dibangun sebelum diakses.
## [INPUT/OUTPUT]: - -> void
func _ensure_layout() -> void:
	if _pause_panel == null:
		_build_ui_layout()


## [FUNGSI]: Menghubungkan sinyal baca-saja dari GameController3D dan AudioBridge3D ke overlay.
## [INPUT/OUTPUT]: controller (GameController3D), audio (AudioBridge3D) -> void
func setup(controller: GameController3D, audio: AudioBridge3D = null) -> void:
	_ensure_layout()
	_controller = controller
	_audio = audio

	if _controller != null:
		if not _controller.state_changed.is_connected(_on_controller_state_changed):
			_controller.state_changed.connect(_on_controller_state_changed)
		if not _controller.game_over.is_connected(show_game_over):
			_controller.game_over.connect(show_game_over)
		if not _controller.victory.is_connected(show_victory):
			_controller.victory.connect(show_victory)


## [FUNGSI]: Menampilkan overlay menu jeda (Pause).
## [INPUT/OUTPUT]: - -> void
func show_pause() -> void:
	_ensure_layout()
	_hide_all_panels()
	_pause_panel.visible = true
	visible = true


## [FUNGSI]: Menampilkan overlay pengaturan audio dan menyinkronkan nilai slider/mute.
## [INPUT/OUTPUT]: - -> void
func show_settings() -> void:
	_ensure_layout()
	_hide_all_panels()
	_settings_panel.visible = true
	visible = true
	_refresh_audio_controls()


## [FUNGSI]: Menampilkan overlay panduan taktis bermain (How to Play).
## [INPUT/OUTPUT]: - -> void
func show_how_to_play() -> void:
	_ensure_layout()
	_hide_all_panels()
	_how_to_play_panel.visible = true
	visible = true


## [FUNGSI]: Menampilkan layar Victory beserta Wave Reached, Enemies Defeated, Score, dan High Score.
## [INPUT/OUTPUT]: summary (Dictionary) -> void
func show_victory(summary: Dictionary) -> void:
	_ensure_layout()
	_hide_all_panels()
	var wave: int = int(summary.get("wave_reached", GameConstants3D.TOTAL_WAVES))
	var kills: int = int(summary.get("total_kills", 0))
	var score: int = int(summary.get("score", 0))
	var save_data: Dictionary = SaveManager3D.load_data()
	var high_score: int = maxi(score, int(save_data.get("high_score", 0)))
	_victory_stats_label.text = (
		"ALL WAVES CLEARED!\n"
		+ "WAVE REACHED: %d / %d\n" % [wave, GameConstants3D.TOTAL_WAVES]
		+ "ENEMIES DEFEATED: %d\n" % kills
		+ "FINAL SCORE: %d\n" % score
		+ "HIGH SCORE: %d" % high_score
	)
	_victory_panel.visible = true
	visible = true


## [FUNGSI]: Menampilkan layar Game Over beserta Wave Reached, Enemies Defeated, Score, dan High Score.
## [INPUT/OUTPUT]: summary (Dictionary) -> void
func show_game_over(summary: Dictionary) -> void:
	_ensure_layout()
	_hide_all_panels()
	var wave: int = int(summary.get("wave_reached", 0))
	var kills: int = int(summary.get("total_kills", 0))
	var score: int = int(summary.get("score", 0))
	var save_data: Dictionary = SaveManager3D.load_data()
	var high_score: int = maxi(score, int(save_data.get("high_score", 0)))
	_game_over_stats_label.text = (
		"ENERGY CORE DESTROYED!\n"
		+ "WAVE REACHED: %d / %d\n" % [wave, GameConstants3D.TOTAL_WAVES]
		+ "ENEMIES DEFEATED: %d\n" % kills
		+ "FINAL SCORE: %d\n" % score
		+ "HIGH SCORE: %d" % high_score
	)
	_game_over_panel.visible = true
	visible = true


## [FUNGSI]: Menyembunyikan seluruh overlay modal dan backdrop-nya.
## [INPUT/OUTPUT]: - -> void
func hide_all() -> void:
	_hide_all_panels()
	visible = false


## [FUNGSI]: Mengembalikan true jika salah satu sub-panel settings/how-to-play sedang tampil.
## [INPUT/OUTPUT]: - -> bool
func is_settings_visible() -> bool:
	return _settings_panel != null and _settings_panel.visible


## [FUNGSI]: Menyembunyikan seluruh sub-panel overlay tanpa mengubah visibilitas root.
## [INPUT/OUTPUT]: - -> void
func _hide_all_panels() -> void:
	if _pause_panel != null:
		_pause_panel.visible = false
	if _settings_panel != null:
		_settings_panel.visible = false
	if _how_to_play_panel != null:
		_how_to_play_panel.visible = false
	if _victory_panel != null:
		_victory_panel.visible = false
	if _game_over_panel != null:
		_game_over_panel.visible = false


## [FUNGSI]: Menyinkronkan nilai HSlider dan CheckButton dengan kondisi AudioBridge3D atau SaveManager3D.
## [INPUT/OUTPUT]: - -> void
func _refresh_audio_controls() -> void:
	var vol: float = 1.0
	var muted: bool = false
	if _audio != null:
		vol = _audio.get_master_volume()
		muted = _audio.is_muted()
	else:
		var data: Dictionary = SaveManager3D.load_data()
		vol = float(data.get("master_volume", 1.0))
		muted = bool(data.get("muted", false))
	if _volume_slider != null:
		_volume_slider.set_value_no_signal(vol)
	if _volume_value_label != null:
		_volume_value_label.text = "%d%%" % int(round(vol * 100.0))
	if _mute_check != null:
		_mute_check.set_pressed_no_signal(muted)


## [FUNGSI]: Membangun seluruh 5 panel overlay berbasis Container tanpa posisi piksel manual.
## [INPUT/OUTPUT]: - -> void
func _build_ui_layout() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP

	var backdrop := ColorRect.new()
	backdrop.name = "OverlayBackdrop"
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.02, 0.04, 0.09, 0.74)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	var center := CenterContainer.new()
	center.name = "OverlayCenter"
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	_build_pause_panel(center)
	_build_settings_panel(center)
	_build_how_to_play_panel(center)
	_build_victory_panel(center)
	_build_game_over_panel(center)


## [FUNGSI]: Membangun panel Pause (Resume, Settings, Retry, Main Menu).
## [INPUT/OUTPUT]: parent (CenterContainer) -> void
func _build_pause_panel(parent: CenterContainer) -> void:
	_pause_panel = _create_modal_panel("PausePanel", Vector2(380.0, 0.0), COLOR_CYAN, parent)
	var vbox := _add_modal_vbox(_pause_panel, 12)

	var title := Label.new()
	title.text = "GAME PAUSED"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", COLOR_CYAN)
	vbox.add_child(title)

	vbox.add_child(HSeparator.new())

	var resume_btn := _create_modal_button("ResumeButton", "Resume", COLOR_EMERALD, Color(0.05, 0.25, 0.20, 0.95), vbox)
	resume_btn.pressed.connect(_on_resume_pressed)

	var set_btn := _create_modal_button("PauseSettingsButton", "Settings", COLOR_CYAN, COLOR_BG_CARD, vbox)
	set_btn.pressed.connect(_on_settings_pressed)

	var retry_btn := _create_modal_button("PauseRetryButton", "Retry", COLOR_AMBER, COLOR_BG_CARD, vbox)
	retry_btn.pressed.connect(_on_retry_pressed)

	var menu_btn := _create_modal_button("PauseMenuButton", "Main Menu", COLOR_CRIMSON, Color(0.24, 0.10, 0.14, 0.95), vbox)
	menu_btn.pressed.connect(_on_menu_pressed)


## [FUNGSI]: Membangun panel Settings (Master Volume HSlider, Mute CheckButton, Back).
## [INPUT/OUTPUT]: parent (CenterContainer) -> void
func _build_settings_panel(parent: CenterContainer) -> void:
	_settings_panel = _create_modal_panel("SettingsPanel", Vector2(400.0, 0.0), COLOR_CYAN, parent)
	var vbox := _add_modal_vbox(_settings_panel, 14)

	var title := Label.new()
	title.text = "SETTINGS"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", COLOR_CYAN)
	vbox.add_child(title)

	vbox.add_child(HSeparator.new())

	var vol_row := HBoxContainer.new()
	vbox.add_child(vol_row)

	var vol_label := Label.new()
	vol_label.text = "Master Volume"
	vol_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	vol_label.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	vol_row.add_child(vol_label)

	_volume_value_label = Label.new()
	_volume_value_label.name = "VolumeValueLabel"
	_volume_value_label.text = "100%"
	_volume_value_label.add_theme_color_override("font_color", COLOR_AMBER)
	vol_row.add_child(_volume_value_label)

	_volume_slider = HSlider.new()
	_volume_slider.name = "MasterVolumeSlider"
	_volume_slider.min_value = 0.0
	_volume_slider.max_value = 1.0
	_volume_slider.step = 0.05
	_volume_slider.value = 1.0
	_volume_slider.value_changed.connect(_on_volume_changed)
	vbox.add_child(_volume_slider)

	_mute_check = CheckButton.new()
	_mute_check.name = "MuteCheckButton"
	_mute_check.text = "Mute All Audio"
	_mute_check.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	_mute_check.toggled.connect(_on_mute_toggled)
	vbox.add_child(_mute_check)

	var back_btn := _create_modal_button("SettingsBackButton", "Back", COLOR_CYAN, COLOR_BG_CARD, vbox)
	back_btn.pressed.connect(_on_back_pressed)


## [FUNGSI]: Membangun panel How to Play berisi panduan kontrol, menara, musuh, targeting, dan ekonomi.
## [INPUT/OUTPUT]: parent (CenterContainer) -> void
func _build_how_to_play_panel(parent: CenterContainer) -> void:
	_how_to_play_panel = _create_modal_panel("HowToPlayPanel", Vector2(560.0, 0.0), COLOR_CYAN, parent)
	var vbox := _add_modal_vbox(_how_to_play_panel, 10)

	var title := Label.new()
	title.text = "HOW TO PLAY — TACTICAL BRIEFING"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", COLOR_CYAN)
	vbox.add_child(title)

	vbox.add_child(HSeparator.new())

	var guide_card := PanelContainer.new()
	guide_card.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_CARD, Color(0.22, 0.34, 0.46, 0.8), 1, 8))
	vbox.add_child(guide_card)

	var guide_margin := MarginContainer.new()
	guide_margin.add_theme_constant_override("margin_left", 14)
	guide_margin.add_theme_constant_override("margin_top", 10)
	guide_margin.add_theme_constant_override("margin_right", 14)
	guide_margin.add_theme_constant_override("margin_bottom", 10)
	guide_card.add_child(guide_margin)

	var htp_info := Label.new()
	htp_info.name = "HowToPlayGuideLabel"
	htp_info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	htp_info.add_theme_font_size_override("font_size", 13)
	htp_info.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	htp_info.text = (
		"CONTROLS:\n"
		+ "  - Select a tower in the bottom Buy Bar, then Left-Click a valid dark tile to build.\n"
		+ "  - Right-Click or press Esc to cancel build mode; click empty ground to deselect.\n"
		+ "  - WASD / Arrow Keys pan the tactical camera; Mouse Wheel zooms in/out.\n\n"
		+ "4 DEFENSE TOWERS:\n"
		+ "  - Laser (100G): High-frequency beam, steady single-target DPS.\n"
		+ "  - Cannon (150G): Explosive Area-of-Effect (AoE) shells for enemy clusters.\n"
		+ "  - Freeze (125G): Slows enemies by 40% to extend tower firing windows.\n"
		+ "  - Armor Pen (175G): Pierces 100% of enemy armor (crucial vs Orc & Boss).\n\n"
		+ "ENEMIES & TARGETING:\n"
		+ "  - Goblin (balanced), Orc (heavy armor), Harpy (fast), Demon King (Wave 5 Boss).\n"
		+ "  - Click any tower to switch Targeting (Front Most / Lowest HP / Closest).\n\n"
		+ "ECONOMY & VICTORY:\n"
		+ "  - Earn Gold from kills & wave bonuses. Upgrade towers to Lv.3 or Sell for 70% refund.\n"
		+ "  - Defend the 20 HP Energy Core through all 5 waves to achieve Victory!"
	)
	guide_margin.add_child(htp_info)

	var back_btn := _create_modal_button("HowToPlayBackButton", "Back", COLOR_CYAN, COLOR_BG_CARD, vbox)
	back_btn.pressed.connect(_on_back_pressed)


## [FUNGSI]: Membangun panel Victory dengan statistik lengkap dan tombol Play Again / Main Menu.
## [INPUT/OUTPUT]: parent (CenterContainer) -> void
func _build_victory_panel(parent: CenterContainer) -> void:
	_victory_panel = _create_modal_panel("VictoryPanel", Vector2(430.0, 0.0), COLOR_EMERALD, parent)
	var vbox := _add_modal_vbox(_victory_panel, 14)

	var title := Label.new()
	title.text = "VICTORY!"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COLOR_EMERALD)
	vbox.add_child(title)

	vbox.add_child(HSeparator.new())

	_victory_stats_label = Label.new()
	_victory_stats_label.name = "VictoryStatsLabel"
	_victory_stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_victory_stats_label.add_theme_font_size_override("font_size", 15)
	_victory_stats_label.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	_victory_stats_label.text = "ALL WAVES CLEARED!"
	vbox.add_child(_victory_stats_label)

	var play_again_btn := _create_modal_button("VictoryPlayAgainButton", "Play Again", COLOR_EMERALD, Color(0.05, 0.25, 0.20, 0.95), vbox)
	play_again_btn.pressed.connect(_on_retry_pressed)

	var menu_btn := _create_modal_button("VictoryMenuButton", "Main Menu", COLOR_CYAN, COLOR_BG_CARD, vbox)
	menu_btn.pressed.connect(_on_menu_pressed)


## [FUNGSI]: Membangun panel Game Over dengan statistik lengkap dan tombol Retry / Main Menu.
## [INPUT/OUTPUT]: parent (CenterContainer) -> void
func _build_game_over_panel(parent: CenterContainer) -> void:
	_game_over_panel = _create_modal_panel("GameOverPanel", Vector2(430.0, 0.0), COLOR_CRIMSON, parent)
	var vbox := _add_modal_vbox(_game_over_panel, 14)

	var title := Label.new()
	title.text = "GAME OVER"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 30)
	title.add_theme_color_override("font_color", COLOR_CRIMSON)
	vbox.add_child(title)

	vbox.add_child(HSeparator.new())

	_game_over_stats_label = Label.new()
	_game_over_stats_label.name = "GameOverStatsLabel"
	_game_over_stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_game_over_stats_label.add_theme_font_size_override("font_size", 15)
	_game_over_stats_label.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	_game_over_stats_label.text = "ENERGY CORE DESTROYED!"
	vbox.add_child(_game_over_stats_label)

	var retry_btn := _create_modal_button("GameOverRetryButton", "Retry", COLOR_AMBER, Color(0.26, 0.16, 0.06, 0.95), vbox)
	retry_btn.pressed.connect(_on_retry_pressed)

	var menu_btn := _create_modal_button("GameOverMenuButton", "Main Menu", COLOR_CYAN, COLOR_BG_CARD, vbox)
	menu_btn.pressed.connect(_on_menu_pressed)


## [FUNGSI]: Membuat PanelContainer modal seragam dengan border aksen Cyberpunk.
## [INPUT/OUTPUT]: node_name (String), min_size (Vector2), border (Color), parent (Control) -> PanelContainer
func _create_modal_panel(
	node_name: String,
	min_size: Vector2,
	border: Color,
	parent: Control
) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = node_name
	panel.custom_minimum_size = min_size
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_PANEL, border, 2, 12))
	parent.add_child(panel)
	return panel


## [FUNGSI]: Menambahkan MarginContainer dan VBoxContainer di dalam PanelContainer modal.
## [INPUT/OUTPUT]: panel (PanelContainer), separation (int) -> VBoxContainer
func _add_modal_vbox(panel: PanelContainer, separation: int) -> VBoxContainer:
	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 26)
	margin.add_theme_constant_override("margin_top", 24)
	margin.add_theme_constant_override("margin_right", 26)
	margin.add_theme_constant_override("margin_bottom", 24)
	panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", separation)
	margin.add_child(vbox)
	return vbox


## [FUNGSI]: Membuat tombol modal seragam dengan gaya normal/hover/pressed taktis.
## [INPUT/OUTPUT]: node_name (String), label_txt (String), accent (Color), base_bg (Color), parent (VBoxContainer) -> Button
func _create_modal_button(
	node_name: String,
	label_txt: String,
	accent: Color,
	base_bg: Color,
	parent: VBoxContainer
) -> Button:
	var btn := Button.new()
	btn.name = node_name
	btn.text = label_txt
	btn.custom_minimum_size = Vector2(0.0, 40.0)
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	btn.add_theme_color_override("font_hover_color", Color.WHITE)
	btn.add_theme_stylebox_override("normal", _make_panel_style(base_bg, accent * Color(1.0, 1.0, 1.0, 0.65), 1, 6))
	btn.add_theme_stylebox_override("hover", _make_panel_style(base_bg.lightened(0.14), accent, 2, 6))
	btn.add_theme_stylebox_override("pressed", _make_panel_style(base_bg.darkened(0.15), accent, 2, 6))
	parent.add_child(btn)
	return btn


## [FUNGSI]: Membuat StyleBoxFlat konsisten untuk panel/tombol overlay.
## [INPUT/OUTPUT]: bg (Color), border (Color), border_w (int), radius (int) -> StyleBoxFlat
static func _make_panel_style(bg: Color, border: Color, border_w: int, radius: int) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.border_width_left = border_w
	sb.border_width_top = border_w
	sb.border_width_right = border_w
	sb.border_width_bottom = border_w
	sb.corner_radius_top_left = radius
	sb.corner_radius_top_right = radius
	sb.corner_radius_bottom_right = radius
	sb.corner_radius_bottom_left = radius
	return sb


## [FUNGSI]: Menyelaraskan visibilitas overlay otomatis saat state GameController3D berubah.
## [INPUT/OUTPUT]: new_state (int) -> void
func _on_controller_state_changed(new_state: int) -> void:
	_ensure_layout()
	match new_state:
		GameController3D.GameState.PAUSED:
			show_pause()
		GameController3D.GameState.PLAYING, GameController3D.GameState.MENU:
			hide_all()


## [FUNGSI]: Memancarkan sinyal permintaan melanjutkan match.
## [INPUT/OUTPUT]: - -> void
func _on_resume_pressed() -> void:
	resume_requested.emit()


## [FUNGSI]: Memancarkan sinyal permintaan membuka Settings dari overlay Pause.
## [INPUT/OUTPUT]: - -> void
func _on_settings_pressed() -> void:
	settings_requested.emit()


## [FUNGSI]: Memancarkan sinyal permintaan mengulang match dari awal.
## [INPUT/OUTPUT]: - -> void
func _on_retry_pressed() -> void:
	retry_requested.emit()


## [FUNGSI]: Memancarkan sinyal permintaan kembali ke menu utama.
## [INPUT/OUTPUT]: - -> void
func _on_menu_pressed() -> void:
	main_menu_requested.emit()


## [FUNGSI]: Memancarkan sinyal kembali dari overlay Settings atau How to Play.
## [INPUT/OUTPUT]: - -> void
func _on_back_pressed() -> void:
	back_requested.emit()


## [FUNGSI]: Memperbarui label persentase volume dan memancarkan sinyal perubahan volume.
## [INPUT/OUTPUT]: val (float) -> void
func _on_volume_changed(val: float) -> void:
	if _volume_value_label != null:
		_volume_value_label.text = "%d%%" % int(round(val * 100.0))
	volume_changed.emit(val)


## [FUNGSI]: Memancarkan sinyal perubahan status mute audio.
## [INPUT/OUTPUT]: muted (bool) -> void
func _on_mute_toggled(muted: bool) -> void:
	mute_toggled.emit(muted)
