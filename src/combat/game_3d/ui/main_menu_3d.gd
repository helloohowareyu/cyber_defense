class_name MainMenu3D
extends Control
## Antarmuka Menu Utama 3D responsif berbasis Container (Anti-AI-Slop).
##
## [FUNGSI_MODUL]: Menampilkan logo/judul CYBER DEFENSE, ringkasan rekor SaveManager3D
##   (High Score, Highest Wave, Wins), serta tombol Play, How to Play, Settings, dan Exit.
## [REFERENSI_KURIKULUM]: GDD §9.1 (Main Menu Navigation) & AGENTS.md §2 (Container UI).
## [ARAH_INTERAKSI]: Memancarkan sinyal aksi ke CyberDefense3D (Signal Up); menerima
##   perintah tampil/sembunyi dan pembaruan statistik dari CyberDefense3D (Call Down).

## [FUNGSI]: Dipancarkan saat pemain menekan tombol Play untuk memulai match baru.
signal play_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan tombol Settings dari menu utama.
signal settings_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan tombol How to Play.
signal how_to_play_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan tombol Exit.
signal exit_requested()

const COLOR_BG_PANEL: Color = Color("#0f172a")
const COLOR_BG_BTN: Color = Color("#1e293b")
const COLOR_CYAN: Color = Color("#22d3ee")
const COLOR_AMBER: Color = Color("#f59e0b")
const COLOR_CRIMSON: Color = Color("#ef4444")
const COLOR_TEXT_MAIN: Color = Color("#f8fafc")
const COLOR_TEXT_MUTED: Color = Color("#94a3b8")

var _high_score_label: Label = null
var _wins_label: Label = null
var _play_button: Button = null
var _settings_button: Button = null
var _how_to_play_button: Button = null
var _exit_button: Button = null


## [FUNGSI]: Membangun tata letak Container menu utama dan memuat statistik awal.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_ensure_layout()
	refresh_stats()


## [FUNGSI]: Memastikan seluruh node UI menu utama telah dibangun sebelum diakses.
## [INPUT/OUTPUT]: - -> void
func _ensure_layout() -> void:
	if _high_score_label == null:
		_build_ui_layout()


## [FUNGSI]: Menyiapkan menu utama (kompatibilitas antarmuka Call Down) dan menyegarkan statistik.
## [INPUT/OUTPUT]: _controller (GameController3D), _overlays (Control) -> void
func setup(_controller: GameController3D = null, _overlays: Control = null) -> void:
	_ensure_layout()
	refresh_stats()


## [FUNGSI]: Memuat statistik High Score, Highest Wave, dan Wins dari SaveManager3D ke label UI.
## [INPUT/OUTPUT]: - -> void
func refresh_stats() -> void:
	_ensure_layout()
	var data: Dictionary = SaveManager3D.load_data()
	var high_score: int = int(data.get("high_score", 0))
	var highest_wave: int = int(data.get("highest_wave", 0))
	var wins: int = int(data.get("wins", 0))
	if _high_score_label != null:
		_high_score_label.text = "HIGH SCORE: %d  |  HIGHEST WAVE: %d / %d" % [
			high_score,
			highest_wave,
			GameConstants3D.TOTAL_WAVES,
		]
	if _wins_label != null:
		_wins_label.text = "VICTORIES RECORDED: %d" % wins


## [FUNGSI]: Menampilkan menu utama dan menyinkronkan data rekor terbaru.
## [INPUT/OUTPUT]: - -> void
func show_menu() -> void:
	refresh_stats()
	visible = true


## [FUNGSI]: Menyembunyikan menu utama saat permainan atau overlay lain mengambil fokus.
## [INPUT/OUTPUT]: - -> void
func hide_menu() -> void:
	visible = false


## [FUNGSI]: Membangun hierarki Container responsif bertema Cyberpunk/Tactical tanpa koordinat piksel manual.
## [INPUT/OUTPUT]: - -> void
func _build_ui_layout() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP

	var backdrop := ColorRect.new()
	backdrop.name = "MenuBackdrop"
	backdrop.set_anchors_preset(Control.PRESET_FULL_RECT)
	backdrop.color = Color(0.02, 0.04, 0.09, 0.78)
	backdrop.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(backdrop)

	var center := CenterContainer.new()
	center.name = "MenuCenter"
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(center)

	var panel := PanelContainer.new()
	panel.name = "MainMenuPanel"
	panel.custom_minimum_size = Vector2(460.0, 0.0)
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_PANEL, COLOR_CYAN, 2, 12))
	center.add_child(panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 32)
	margin.add_theme_constant_override("margin_top", 28)
	margin.add_theme_constant_override("margin_right", 32)
	margin.add_theme_constant_override("margin_bottom", 28)
	panel.add_child(margin)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 14)
	margin.add_child(vbox)

	var badge := Label.new()
	badge.text = "[ TACTICAL GRID DEFENSE // 3D ]"
	badge.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	badge.add_theme_font_size_override("font_size", 12)
	badge.add_theme_color_override("font_color", COLOR_CYAN)
	vbox.add_child(badge)

	var title := Label.new()
	title.name = "TitleLabel"
	title.text = "CYBER DEFENSE"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", 36)
	title.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	vbox.add_child(title)

	var subtitle := Label.new()
	subtitle.name = "SubtitleLabel"
	subtitle.text = "PROTECT THE ENERGY CORE ACROSS 5 HOSTILE WAVES"
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", 13)
	subtitle.add_theme_color_override("font_color", COLOR_TEXT_MUTED)
	vbox.add_child(subtitle)

	var stats_panel := PanelContainer.new()
	stats_panel.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_BTN, Color(0.18, 0.27, 0.38, 0.9), 1, 8))
	vbox.add_child(stats_panel)

	var stats_margin := MarginContainer.new()
	stats_margin.add_theme_constant_override("margin_left", 14)
	stats_margin.add_theme_constant_override("margin_top", 10)
	stats_margin.add_theme_constant_override("margin_right", 14)
	stats_margin.add_theme_constant_override("margin_bottom", 10)
	stats_panel.add_child(stats_margin)

	var stats_vbox := VBoxContainer.new()
	stats_vbox.add_theme_constant_override("separation", 4)
	stats_margin.add_child(stats_vbox)

	_high_score_label = Label.new()
	_high_score_label.name = "HighScoreLabel"
	_high_score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_high_score_label.add_theme_font_size_override("font_size", 14)
	_high_score_label.add_theme_color_override("font_color", COLOR_AMBER)
	stats_vbox.add_child(_high_score_label)

	_wins_label = Label.new()
	_wins_label.name = "WinsLabel"
	_wins_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_wins_label.add_theme_font_size_override("font_size", 13)
	_wins_label.add_theme_color_override("font_color", COLOR_CYAN)
	stats_vbox.add_child(_wins_label)

	var sep := HSeparator.new()
	vbox.add_child(sep)

	_play_button = Button.new()
	_play_button.name = "PlayButton"
	_play_button.text = "Play"
	_play_button.custom_minimum_size = Vector2(0.0, 46.0)
	_apply_button_style(_play_button, COLOR_CYAN, Color(0.08, 0.25, 0.35, 1.0))
	_play_button.pressed.connect(_on_play_pressed)
	vbox.add_child(_play_button)

	_how_to_play_button = Button.new()
	_how_to_play_button.name = "HowToPlayButton"
	_how_to_play_button.text = "How to Play"
	_how_to_play_button.custom_minimum_size = Vector2(0.0, 38.0)
	_apply_button_style(_how_to_play_button, Color(0.35, 0.55, 0.72, 0.9), COLOR_BG_BTN)
	_how_to_play_button.pressed.connect(_on_how_to_play_pressed)
	vbox.add_child(_how_to_play_button)

	_settings_button = Button.new()
	_settings_button.name = "SettingsButton"
	_settings_button.text = "Settings"
	_settings_button.custom_minimum_size = Vector2(0.0, 38.0)
	_apply_button_style(_settings_button, Color(0.35, 0.55, 0.72, 0.9), COLOR_BG_BTN)
	_settings_button.pressed.connect(_on_settings_pressed)
	vbox.add_child(_settings_button)

	_exit_button = Button.new()
	_exit_button.name = "ExitButton"
	_exit_button.text = "Exit"
	_exit_button.custom_minimum_size = Vector2(0.0, 38.0)
	_apply_button_style(_exit_button, COLOR_CRIMSON, Color(0.24, 0.10, 0.14, 0.95))
	_exit_button.pressed.connect(_on_exit_pressed)
	vbox.add_child(_exit_button)


## [FUNGSI]: Membuat StyleBoxFlat konsisten untuk panel menu utama.
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


## [FUNGSI]: Menerapkan gaya normal/hover/pressed taktis pada tombol menu.
## [INPUT/OUTPUT]: btn (Button), accent (Color), base_bg (Color) -> void
static func _apply_button_style(btn: Button, accent: Color, base_bg: Color) -> void:
	btn.add_theme_font_size_override("font_size", 15)
	btn.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	btn.add_theme_color_override("font_hover_color", Color.WHITE)
	btn.add_theme_stylebox_override("normal", _make_panel_style(base_bg, accent * Color(1.0, 1.0, 1.0, 0.65), 1, 6))
	btn.add_theme_stylebox_override("hover", _make_panel_style(base_bg.lightened(0.14), accent, 2, 6))
	btn.add_theme_stylebox_override("pressed", _make_panel_style(base_bg.darkened(0.15), accent, 2, 6))


## [FUNGSI]: Memancarkan sinyal permintaan mulai match baru saat tombol Play ditekan.
## [INPUT/OUTPUT]: - -> void
func _on_play_pressed() -> void:
	play_requested.emit()


## [FUNGSI]: Memancarkan sinyal permintaan membuka panduan bermain.
## [INPUT/OUTPUT]: - -> void
func _on_how_to_play_pressed() -> void:
	how_to_play_requested.emit()


## [FUNGSI]: Memancarkan sinyal permintaan membuka pengaturan audio.
## [INPUT/OUTPUT]: - -> void
func _on_settings_pressed() -> void:
	settings_requested.emit()


## [FUNGSI]: Memancarkan sinyal permintaan keluar aplikasi secara aman (termasuk headless).
## [INPUT/OUTPUT]: - -> void
func _on_exit_pressed() -> void:
	exit_requested.emit()
