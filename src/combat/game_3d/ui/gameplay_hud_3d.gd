class_name GameplayHud3D
extends Control
## Heads-Up Display (HUD) 3D responsif berbasis Container (Anti-AI-Slop).
##
## [FUNGSI_MODUL]: Menampilkan status Gold, Wave N/5, Energy Core HP, tombol speed (1x/2x),
##   Start Wave, Pause, banner peringatan Boss Wave 5, pesan status taktis, serta Buy Bar
##   4 menara (Laser/Cannon/Freeze/Armor Pen + Cancel) lengkap dengan affordability dimming.
## [REFERENSI_KURIKULUM]: GDD §9.2 (Gameplay HUD) & AGENTS.md §2 (Container UI).
## [ARAH_INTERAKSI]: Memancarkan sinyal aksi pemain ke CyberDefense3D (Signal Up);
##   menerima pembaruan status dari subsistem yang diinjeksikan via setup().

## [FUNGSI]: Dipancarkan saat pemain menekan tombol pengubah kecepatan 1x/2x.
signal speed_toggle_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan tombol Start Wave.
signal start_wave_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan tombol Pause.
signal pause_requested()
## [FUNGSI]: Dipancarkan saat pemain memilih menara pada Buy Bar untuk dibangun.
signal tower_buy_selected(tower_key: String)
## [FUNGSI]: Dipancarkan saat pemain membatalkan mode pembangunan menara.
signal build_cancel_requested()

const COLOR_BG_PANEL: Color = Color("#0f172a")
const COLOR_BG_BTN: Color = Color("#1e293b")
const COLOR_CYAN: Color = Color("#22d3ee")
const COLOR_AMBER: Color = Color("#f59e0b")
const COLOR_CRIMSON: Color = Color("#ef4444")
const COLOR_EMERALD: Color = Color("#10b981")
const COLOR_TEXT_MAIN: Color = Color("#f8fafc")
const COLOR_TEXT_MUTED: Color = Color("#94a3b8")

var _economy: EconomyManager3D = null
var _spawner: WaveSpawner3D = null
var _core: EnergyCore3D = null
var _controller: GameController3D = null

var _gold_label: Label = null
var _wave_label: Label = null
var _core_hp_label: Label = null
var _status_label: Label = null
var _status_panel: PanelContainer = null
var _boss_alert_panel: PanelContainer = null
var _boss_alert_label: Label = null

var _speed_button: Button = null
var _start_wave_button: Button = null
var _pause_button: Button = null

var _laser_button: Button = null
var _cannon_button: Button = null
var _freeze_button: Button = null
var _armor_pen_button: Button = null
var _cancel_build_button: Button = null

var _tower_costs: Dictionary = {
	"laser": 100,
	"cannon": 150,
	"freeze": 125,
	"armor_pen": 175,
}
var _current_gold: int = GameConstants3D.STARTING_GOLD
var _active_build_key: String = ""


## [FUNGSI]: Membangun tata letak Container HUD dan memastikan mode selalu aktif saat tree pause.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load_tower_costs_from_presets()
	_ensure_layout()
	_refresh_buy_buttons_state()


## [FUNGSI]: Memastikan seluruh node UI HUD telah dibangun sebelum dimodifikasi.
## [INPUT/OUTPUT]: - -> void
func _ensure_layout() -> void:
	if _gold_label == null:
		_build_ui_layout()


## [FUNGSI]: Menghubungkan sinyal baca-saja dari controller, economy, spawner, dan core ke tampilan HUD.
## [INPUT/OUTPUT]: controller, economy, spawner, core -> void
func setup(
	controller: GameController3D,
	economy: EconomyManager3D,
	spawner: WaveSpawner3D,
	core: EnergyCore3D
) -> void:
	_ensure_layout()
	_controller = controller
	_economy = economy
	_spawner = spawner
	_core = core

	if _economy != null:
		if not _economy.gold_changed.is_connected(update_gold):
			_economy.gold_changed.connect(update_gold)
		update_gold(_economy.get_gold())

	if _spawner != null:
		if not _spawner.wave_started.is_connected(_on_wave_started):
			_spawner.wave_started.connect(_on_wave_started)
		if not _spawner.wave_cleared.is_connected(_on_wave_cleared):
			_spawner.wave_cleared.connect(_on_wave_cleared)
		if not _spawner.boss_spawned.is_connected(_on_boss_spawned):
			_spawner.boss_spawned.connect(_on_boss_spawned)
		update_wave(_spawner.get_current_wave(), GameConstants3D.TOTAL_WAVES)
		_refresh_wave_button_state()

	if _core != null:
		if not _core.hp_changed.is_connected(update_core_hp):
			_core.hp_changed.connect(update_core_hp)
		update_core_hp(_core.get_hp(), _core.get_max_hp())

	if _controller != null:
		if not _controller.status_message.is_connected(set_status_message):
			_controller.status_message.connect(set_status_message)
		if not _controller.build_mode_changed.is_connected(_on_build_mode_changed):
			_controller.build_mode_changed.connect(_on_build_mode_changed)
		sync_speed(_controller.get_game_speed())


## [FUNGSI]: Memperbarui label Gold dan status keterjangkauan (affordability) seluruh tombol beli menara.
## [INPUT/OUTPUT]: amount (int) -> void
func update_gold(amount: int) -> void:
	_current_gold = maxi(0, amount)
	if _gold_label != null:
		_gold_label.text = "GOLD: %d" % _current_gold
	_refresh_buy_buttons_state()


## [FUNGSI]: Memperbarui label indikator wave aktif (`WAVE: N / 5`) serta status tombol Start Wave.
## [INPUT/OUTPUT]: current_w (int), total_w (int) -> void
func update_wave(current_w: int, total_w: int = GameConstants3D.TOTAL_WAVES) -> void:
	if _wave_label != null:
		_wave_label.text = "WAVE: %d / %d" % [current_w, total_w]
	if current_w == 0:
		clear_boss_alert()
	_refresh_wave_button_state()


## [FUNGSI]: Memperbarui label dan warna kontras HP Energy Core sesuai rasio kesehatan tersisa.
## [INPUT/OUTPUT]: hp (int), max_hp (int) -> void
func update_core_hp(hp: int, max_hp: int = GameConstants3D.STARTING_CORE_HP) -> void:
	if _core_hp_label == null:
		return
	_core_hp_label.text = "CORE HP: %d / %d" % [hp, max_hp]
	var ratio: float = float(hp) / float(maxi(1, max_hp))
	if ratio > 0.5:
		_core_hp_label.add_theme_color_override("font_color", COLOR_EMERALD)
	elif ratio > 0.25:
		_core_hp_label.add_theme_color_override("font_color", COLOR_AMBER)
	else:
		_core_hp_label.add_theme_color_override("font_color", COLOR_CRIMSON)


## [FUNGSI]: Menyinkronkan teks tombol kecepatan (`1x` / `2x`) dengan kecepatan simulasi aktif.
## [INPUT/OUTPUT]: speed_multiplier (float) -> void
func sync_speed(speed_multiplier: float) -> void:
	if _speed_button == null:
		return
	var is_fast: bool = speed_multiplier >= 1.5
	_speed_button.text = "2x" if is_fast else "1x"
	var accent: Color = COLOR_AMBER if is_fast else COLOR_CYAN
	_apply_button_style(_speed_button, accent, COLOR_BG_BTN)


## [FUNGSI]: Menampilkan atau menyembunyikan banner pesan umpan balik taktis secara responsif.
## [INPUT/OUTPUT]: msg (String) -> void
func set_status_message(msg: String) -> void:
	if _status_label != null:
		_status_label.text = msg
	if _status_panel != null:
		_status_panel.visible = not msg.is_empty()


## [FUNGSI]: Menampilkan banner peringatan Boss Wave 5 (Demon King).
## [INPUT/OUTPUT]: - -> void
func show_boss_alert() -> void:
	if _boss_alert_panel != null:
		_boss_alert_panel.visible = true


## [FUNGSI]: Menyembunyikan banner peringatan Boss Wave 5.
## [INPUT/OUTPUT]: - -> void
func clear_boss_alert() -> void:
	if _boss_alert_panel != null:
		_boss_alert_panel.visible = false


## [FUNGSI]: Menampilkan HUD gameplay dan menyinkronkan seluruh status terkini.
## [INPUT/OUTPUT]: - -> void
func show_hud() -> void:
	_ensure_layout()
	if _economy != null:
		update_gold(_economy.get_gold())
	if _spawner != null:
		update_wave(_spawner.get_current_wave(), GameConstants3D.TOTAL_WAVES)
	if _core != null:
		update_core_hp(_core.get_hp(), _core.get_max_hp())
	if _controller != null:
		sync_speed(_controller.get_game_speed())
	visible = true


## [FUNGSI]: Menyembunyikan HUD gameplay saat berada di menu utama.
## [INPUT/OUTPUT]: - -> void
func hide_hud() -> void:
	visible = false


## [FUNGSI]: Membaca harga awal 4 menara dari preset `.tres` agar selalu selaras dengan Resource data.
## [INPUT/OUTPUT]: - -> void
func _load_tower_costs_from_presets() -> void:
	for key: String in ["laser", "cannon", "freeze", "armor_pen"]:
		var path: String = GameConstants3D.get_tower_preset_path(key)
		if not path.is_empty() and ResourceLoader.exists(path):
			var preset: TowerStatsData = ResourceLoader.load(path) as TowerStatsData
			if preset != null and preset.base_cost > 0:
				_tower_costs[key] = preset.base_cost


## [FUNGSI]: Membangun seluruh tata letak Container HUD tanpa koordinat piksel hardcoded.
## [INPUT/OUTPUT]: - -> void
func _build_ui_layout() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	# FULL-SCREEN OUTER CONTAINER (Top Bar + Spacer + Bottom Buy Bar)
	var outer_margin := MarginContainer.new()
	outer_margin.name = "HudOuterMargin"
	outer_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	outer_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	outer_margin.add_theme_constant_override("margin_left", 20)
	outer_margin.add_theme_constant_override("margin_top", 14)
	outer_margin.add_theme_constant_override("margin_right", 20)
	outer_margin.add_theme_constant_override("margin_bottom", 16)
	add_child(outer_margin)

	var main_vbox := VBoxContainer.new()
	main_vbox.name = "HudMainVBox"
	main_vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	main_vbox.add_theme_constant_override("separation", 8)
	outer_margin.add_child(main_vbox)

	var top_stack := VBoxContainer.new()
	top_stack.name = "TopHudStack"
	top_stack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_stack.add_theme_constant_override("separation", 8)
	main_vbox.add_child(top_stack)

	var top_panel := PanelContainer.new()
	top_panel.name = "TopBarPanel"
	top_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	top_panel.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_PANEL, COLOR_CYAN, 2, 8))
	top_stack.add_child(top_panel)

	var top_inner := MarginContainer.new()
	top_inner.add_theme_constant_override("margin_left", 16)
	top_inner.add_theme_constant_override("margin_top", 8)
	top_inner.add_theme_constant_override("margin_right", 16)
	top_inner.add_theme_constant_override("margin_bottom", 8)
	top_panel.add_child(top_inner)

	var top_hbox := HBoxContainer.new()
	top_hbox.add_theme_constant_override("separation", 20)
	top_inner.add_child(top_hbox)

	_gold_label = Label.new()
	_gold_label.name = "GoldLabel"
	_gold_label.text = "GOLD: 300"
	_gold_label.add_theme_font_size_override("font_size", 16)
	_gold_label.add_theme_color_override("font_color", COLOR_AMBER)
	top_hbox.add_child(_gold_label)

	_wave_label = Label.new()
	_wave_label.name = "WaveLabel"
	_wave_label.text = "WAVE: 0 / %d" % GameConstants3D.TOTAL_WAVES
	_wave_label.add_theme_font_size_override("font_size", 16)
	_wave_label.add_theme_color_override("font_color", COLOR_CYAN)
	top_hbox.add_child(_wave_label)

	_core_hp_label = Label.new()
	_core_hp_label.name = "CoreHpLabel"
	_core_hp_label.text = "CORE HP: %d / %d" % [GameConstants3D.STARTING_CORE_HP, GameConstants3D.STARTING_CORE_HP]
	_core_hp_label.add_theme_font_size_override("font_size", 16)
	_core_hp_label.add_theme_color_override("font_color", COLOR_EMERALD)
	top_hbox.add_child(_core_hp_label)

	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_hbox.add_child(spacer)

	_speed_button = Button.new()
	_speed_button.name = "SpeedButton"
	_speed_button.text = "1x"
	_speed_button.custom_minimum_size = Vector2(56.0, 34.0)
	_apply_button_style(_speed_button, COLOR_CYAN, COLOR_BG_BTN)
	_speed_button.pressed.connect(_on_speed_toggle_pressed)
	top_hbox.add_child(_speed_button)

	_start_wave_button = Button.new()
	_start_wave_button.name = "StartWaveButton"
	_start_wave_button.text = "Start Wave"
	_start_wave_button.custom_minimum_size = Vector2(124.0, 34.0)
	_apply_button_style(_start_wave_button, COLOR_EMERALD, Color(0.05, 0.25, 0.20, 0.95))
	_start_wave_button.pressed.connect(_on_start_wave_pressed)
	top_hbox.add_child(_start_wave_button)

	_pause_button = Button.new()
	_pause_button.name = "PauseButton"
	_pause_button.text = "Pause"
	_pause_button.custom_minimum_size = Vector2(78.0, 34.0)
	_apply_button_style(_pause_button, COLOR_AMBER, COLOR_BG_BTN)
	_pause_button.pressed.connect(_on_pause_pressed)
	top_hbox.add_child(_pause_button)

	# Boss Wave 5 Alert Banner (disusun dalam CenterContainer agar terpusat tanpa posisi manual)
	var boss_center := CenterContainer.new()
	boss_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_stack.add_child(boss_center)

	_boss_alert_panel = PanelContainer.new()
	_boss_alert_panel.name = "BossAlertBanner"
	_boss_alert_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_boss_alert_panel.visible = false
	_boss_alert_panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.28, 0.04, 0.08, 0.94), COLOR_CRIMSON, 2, 8))
	boss_center.add_child(_boss_alert_panel)

	var boss_margin := MarginContainer.new()
	boss_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	boss_margin.add_theme_constant_override("margin_left", 18)
	boss_margin.add_theme_constant_override("margin_top", 6)
	boss_margin.add_theme_constant_override("margin_right", 18)
	boss_margin.add_theme_constant_override("margin_bottom", 6)
	_boss_alert_panel.add_child(boss_margin)

	_boss_alert_label = Label.new()
	_boss_alert_label.name = "BossAlertLabel"
	_boss_alert_label.text = "WARNING: BOSS WAVE 5 — DEMON KING APPROACHING!"
	_boss_alert_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_boss_alert_label.add_theme_font_size_override("font_size", 14)
	_boss_alert_label.add_theme_color_override("font_color", COLOR_CRIMSON)
	boss_margin.add_child(_boss_alert_label)

	# Status Banner (CenterContainer agar tidak menggunakan position hardcoded)
	var status_center := CenterContainer.new()
	status_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	top_stack.add_child(status_center)

	_status_panel = PanelContainer.new()
	_status_panel.name = "StatusBanner"
	_status_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_status_panel.visible = false
	_status_panel.add_theme_stylebox_override("panel", _make_panel_style(Color(0.06, 0.09, 0.16, 0.88), COLOR_AMBER, 1, 6))
	status_center.add_child(_status_panel)

	var status_margin := MarginContainer.new()
	status_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	status_margin.add_theme_constant_override("margin_left", 14)
	status_margin.add_theme_constant_override("margin_top", 4)
	status_margin.add_theme_constant_override("margin_right", 14)
	status_margin.add_theme_constant_override("margin_bottom", 4)
	_status_panel.add_child(status_margin)

	_status_label = Label.new()
	_status_label.name = "StatusLabel"
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_status_label.add_theme_font_size_override("font_size", 13)
	_status_label.add_theme_color_override("font_color", COLOR_AMBER)
	status_margin.add_child(_status_label)

	# SPACER VERTIKAL + BOTTOM BUY BAR
	var mid_spacer := Control.new()
	mid_spacer.name = "HudMiddleSpacer"
	mid_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mid_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	main_vbox.add_child(mid_spacer)

	var bot_center := CenterContainer.new()
	bot_center.name = "BottomBuyMargin"
	bot_center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	main_vbox.add_child(bot_center)

	var bot_panel := PanelContainer.new()
	bot_panel.name = "BuyBarPanel"
	bot_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	bot_panel.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_PANEL, COLOR_CYAN, 2, 8))
	bot_center.add_child(bot_panel)

	var bot_inner := MarginContainer.new()
	bot_inner.add_theme_constant_override("margin_left", 16)
	bot_inner.add_theme_constant_override("margin_top", 8)
	bot_inner.add_theme_constant_override("margin_right", 16)
	bot_inner.add_theme_constant_override("margin_bottom", 8)
	bot_panel.add_child(bot_inner)

	var bot_hbox := HBoxContainer.new()
	bot_hbox.add_theme_constant_override("separation", 12)
	bot_inner.add_child(bot_hbox)

	var buy_label := Label.new()
	buy_label.text = "BUILD:"
	buy_label.add_theme_font_size_override("font_size", 14)
	buy_label.add_theme_color_override("font_color", COLOR_TEXT_MUTED)
	bot_hbox.add_child(buy_label)

	_laser_button = _create_buy_button("LaserButton", "Laser", "laser", bot_hbox)
	_cannon_button = _create_buy_button("CannonButton", "Cannon", "cannon", bot_hbox)
	_freeze_button = _create_buy_button("FreezeButton", "Freeze", "freeze", bot_hbox)
	_armor_pen_button = _create_buy_button("ArmorPenButton", "Armor Pen", "armor_pen", bot_hbox)

	_cancel_build_button = Button.new()
	_cancel_build_button.name = "CancelBuildButton"
	_cancel_build_button.text = "Cancel"
	_cancel_build_button.custom_minimum_size = Vector2(84.0, 36.0)
	_cancel_build_button.visible = false
	_apply_button_style(_cancel_build_button, COLOR_CRIMSON, Color(0.24, 0.10, 0.14, 0.95))
	_cancel_build_button.pressed.connect(_on_cancel_build_pressed)
	bot_hbox.add_child(_cancel_build_button)


## [FUNGSI]: Membuat tombol pembelian menara berformat seragam pada Buy Bar.
## [INPUT/OUTPUT]: node_name (String), label_title (String), tower_key (String), parent (HBoxContainer) -> Button
func _create_buy_button(
	node_name: String,
	label_title: String,
	tower_key: String,
	parent: HBoxContainer
) -> Button:
	var btn := Button.new()
	btn.name = node_name
	var cost: int = int(_tower_costs.get(tower_key, 100))
	btn.text = "%s (%dG)" % [label_title, cost]
	btn.custom_minimum_size = Vector2(130.0, 36.0)
	_apply_button_style(btn, COLOR_CYAN, COLOR_BG_BTN)
	btn.pressed.connect(func() -> void: _on_buy_tower_pressed(tower_key))
	parent.add_child(btn)
	return btn


## [FUNGSI]: Memperbarui status disabled dan efek dimming affordability serta sorotan build aktif.
## [INPUT/OUTPUT]: - -> void
func _refresh_buy_buttons_state() -> void:
	var pairs: Array[Array] = [
		[_laser_button, "laser"],
		[_cannon_button, "cannon"],
		[_freeze_button, "freeze"],
		[_armor_pen_button, "armor_pen"],
	]
	for pair: Array in pairs:
		var btn: Button = pair[0] as Button
		var key: String = str(pair[1])
		if btn == null:
			continue
		var cost: int = int(_tower_costs.get(key, 100))
		var affordable: bool = _current_gold >= cost
		var is_selected: bool = (_active_build_key == key)
		btn.disabled = not affordable
		if not affordable:
			btn.modulate = Color(0.55, 0.60, 0.68, 0.65)
		elif is_selected:
			btn.modulate = Color(0.45, 1.0, 1.0, 1.0)
		else:
			btn.modulate = Color.WHITE


## [FUNGSI]: Memperbarui status aktif tombol Start Wave berdasarkan status spawner saat ini.
## [INPUT/OUTPUT]: - -> void
func _refresh_wave_button_state() -> void:
	if _start_wave_button == null:
		return
	var can_start: bool = _spawner == null or _spawner.can_start_wave()
	_start_wave_button.disabled = not can_start
	_start_wave_button.modulate = Color.WHITE if can_start else Color(0.6, 0.65, 0.72, 0.7)


## [FUNGSI]: Membuat StyleBoxFlat konsisten untuk panel HUD.
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


## [FUNGSI]: Menerapkan gaya normal/hover/pressed/disabled pada tombol HUD.
## [INPUT/OUTPUT]: btn (Button), accent (Color), base_bg (Color) -> void
static func _apply_button_style(btn: Button, accent: Color, base_bg: Color) -> void:
	btn.add_theme_font_size_override("font_size", 14)
	btn.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	btn.add_theme_color_override("font_hover_color", Color.WHITE)
	btn.add_theme_color_override("font_disabled_color", COLOR_TEXT_MUTED)
	btn.add_theme_stylebox_override("normal", _make_panel_style(base_bg, accent * Color(1.0, 1.0, 1.0, 0.65), 1, 6))
	btn.add_theme_stylebox_override("hover", _make_panel_style(base_bg.lightened(0.14), accent, 2, 6))
	btn.add_theme_stylebox_override("pressed", _make_panel_style(base_bg.darkened(0.15), accent, 2, 6))
	btn.add_theme_stylebox_override("disabled", _make_panel_style(Color(0.08, 0.11, 0.17, 0.75), Color(0.25, 0.30, 0.38, 0.5), 1, 6))


## [FUNGSI]: Memancarkan sinyal toggle kecepatan 1x/2x ke CyberDefense3D.
## [INPUT/OUTPUT]: - -> void
func _on_speed_toggle_pressed() -> void:
	speed_toggle_requested.emit()


## [FUNGSI]: Memancarkan sinyal memulai gelombang serangan berikutnya.
## [INPUT/OUTPUT]: - -> void
func _on_start_wave_pressed() -> void:
	start_wave_requested.emit()


## [FUNGSI]: Memancarkan sinyal menjeda permainan.
## [INPUT/OUTPUT]: - -> void
func _on_pause_pressed() -> void:
	pause_requested.emit()


## [FUNGSI]: Memancarkan sinyal pemilihan jenis menara untuk dibangun.
## [INPUT/OUTPUT]: tower_key (String) -> void
func _on_buy_tower_pressed(tower_key: String) -> void:
	tower_buy_selected.emit(tower_key)


## [FUNGSI]: Memancarkan sinyal pembatalan mode pembangunan menara.
## [INPUT/OUTPUT]: - -> void
func _on_cancel_build_pressed() -> void:
	build_cancel_requested.emit()


## [FUNGSI]: Menyinkronkan tombol Cancel dan sorotan tombol menara saat build mode berubah.
## [INPUT/OUTPUT]: tower_key (String) -> void
func _on_build_mode_changed(tower_key: String) -> void:
	_active_build_key = tower_key
	if _cancel_build_button != null:
		_cancel_build_button.visible = not tower_key.is_empty()
	_refresh_buy_buttons_state()


## [FUNGSI]: Memperbarui HUD dan menampilkan alert saat Wave 5 (Boss) dimulai.
## [INPUT/OUTPUT]: w_num (int) -> void
func _on_wave_started(w_num: int) -> void:
	update_wave(w_num, GameConstants3D.TOTAL_WAVES)
	if w_num >= GameConstants3D.TOTAL_WAVES:
		show_boss_alert()
		set_status_message("Wave %d (BOSS WAVE) started!" % w_num)
	else:
		clear_boss_alert()
		set_status_message("Wave %d in progress!" % w_num)


## [FUNGSI]: Memperbarui HUD setelah wave selesai dibersihkan.
## [INPUT/OUTPUT]: w_num (int) -> void
func _on_wave_cleared(w_num: int) -> void:
	clear_boss_alert()
	_refresh_wave_button_state()
	set_status_message("Wave %d cleared!" % w_num)


## [FUNGSI]: Menampilkan banner Boss Wave 5 saat Demon King muncul.
## [INPUT/OUTPUT]: _w_num (int) -> void
func _on_boss_spawned(_w_num: int) -> void:
	show_boss_alert()
