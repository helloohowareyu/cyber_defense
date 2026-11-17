class_name TowerRadialMenu3D
extends Control
## Menu inspeksi kontekstual bergaya radial berbasis Container saat menara dipilih.
##
## [FUNGSI_MODUL]: Menampilkan nama menara, level (Lv.N/3), Damage, Range, Fire Rate,
##   tombol Upgrade (beserta biaya/status MAX & cek affordability), tombol Sell (+70% refund),
##   3 mode Targeting (Front Most, Lowest HP, Closest), dan tombol Close tanpa koordinat piksel.
## [REFERENSI_KURIKULUM]: GDD §9.3 (Tower Interaction Menu) & AGENTS.md §2 (Container UI).
## [ARAH_INTERAKSI]: Memancarkan sinyal aksi pemain ke CyberDefense3D (Signal Up);
##   menerima pembaruan menara terpilih & saldo Gold via setup() / show_for_tower() (Call Down).

## [FUNGSI]: Dipancarkan saat pemain menekan tombol Upgrade pada menara terpilih.
signal upgrade_requested()
## [FUNGSI]: Dipancarkan saat pemain menekan tombol Sell untuk menjual menara terpilih.
signal sell_requested()
## [FUNGSI]: Dipancarkan saat pemain mengganti mode penargetan menara terpilih.
signal targeting_mode_requested(mode: TargetSelector.Mode)
## [FUNGSI]: Dipancarkan saat pemain menekan tombol Close untuk menutup inspeksi menara.
signal close_requested()

const COLOR_BG_PANEL: Color = Color("#0f172a")
const COLOR_BG_CARD: Color = Color("#1e293b")
const COLOR_CYAN: Color = Color("#22d3ee")
const COLOR_AMBER: Color = Color("#f59e0b")
const COLOR_CRIMSON: Color = Color("#ef4444")
const COLOR_EMERALD: Color = Color("#10b981")
const COLOR_TEXT_MAIN: Color = Color("#f8fafc")
const COLOR_TEXT_MUTED: Color = Color("#94a3b8")

var _controller: GameController3D = null
var _economy: EconomyManager3D = null
var _current_tower: Tower3D = null
var _current_gold: int = GameConstants3D.STARTING_GOLD

var _panel: PanelContainer = null
var _title_label: Label = null
var _level_badge_label: Label = null
var _stats_label: Label = null
var _upgrade_button: Button = null
var _sell_button: Button = null
var _close_button: Button = null

var _btn_front: Button = null
var _btn_lowest: Button = null
var _btn_closest: Button = null


## [FUNGSI]: Membangun tata letak Container responsif dan menyembunyikan panel di awal.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_ensure_layout()
	hide_menu()


## [FUNGSI]: Memastikan seluruh node UI menu menara telah dibuat sebelum diakses.
## [INPUT/OUTPUT]: - -> void
func _ensure_layout() -> void:
	if _panel == null:
		_build_ui_layout()


## [FUNGSI]: Menghubungkan sinyal baca-saja seleksi menara dan perubahan Gold ke menu inspeksi.
## [INPUT/OUTPUT]: controller (GameController3D) -> void
func setup(controller: GameController3D) -> void:
	_ensure_layout()
	_controller = controller
	if _controller != null:
		if not _controller.tower_selected_for_ui.is_connected(show_for_tower):
			_controller.tower_selected_for_ui.connect(show_for_tower)
		if not _controller.tower_deselected.is_connected(hide_menu):
			_controller.tower_deselected.connect(hide_menu)
		var econ: EconomyManager3D = _controller.get_economy()
		if econ != null and econ != _economy:
			_economy = econ
			if not _economy.gold_changed.is_connected(_on_gold_changed):
				_economy.gold_changed.connect(_on_gold_changed)
			_current_gold = _economy.get_gold()


## [FUNGSI]: Menampilkan menu kontekstual untuk menara terpilih dan menyegarkan statistiknya.
## [INPUT/OUTPUT]: tower (Tower3D) -> void
func show_for_tower(tower: Tower3D) -> void:
	_ensure_layout()
	if tower == null or not is_instance_valid(tower) or tower.is_queued_for_deletion():
		hide_menu()
		return
	_current_tower = tower
	if _economy != null:
		_current_gold = _economy.get_gold()
	_refresh_display()
	visible = true


## [FUNGSI]: Menutup menu inspeksi dan menghapus referensi menara terpilih.
## [INPUT/OUTPUT]: - -> void
func hide_menu() -> void:
	_current_tower = null
	visible = false


## [FUNGSI]: Memperbarui tampilan statistik, biaya upgrade, refund jual, dan sorotan mode targeting.
## [INPUT/OUTPUT]: - -> void
func _refresh_display() -> void:
	if _current_tower == null or not is_instance_valid(_current_tower):
		return

	var summary: Dictionary = _current_tower.get_ui_summary()
	var tower_name: String = str(summary.get("display_name", "Tower"))
	var level: int = int(summary.get("level", 1))
	var max_level: int = int(summary.get("max_level", CombatMath.MAX_TOWER_LEVEL))
	var dmg: float = float(summary.get("current_damage", _current_tower.get_current_damage()))
	var rng_meters: float = _current_tower.get_current_range_meters()
	var fire_rate: float = float(summary.get("fire_rate_sec", 1.0))
	var upg_cost: int = int(summary.get("next_upgrade_cost", 0))
	var refund: int = int(summary.get("sell_refund_gold", 0))
	var can_upg: bool = bool(summary.get("can_upgrade", false))

	_title_label.text = tower_name
	_level_badge_label.text = "Lv.%d/%d" % [level, max_level]
	_stats_label.text = "DMG: %.1f  |  RANGE: %.1fm  |  RATE: %.2fs" % [dmg, rng_meters, fire_rate]

	if can_upg:
		var affordable: bool = _current_gold >= upg_cost
		_upgrade_button.text = "Upgrade (%dG)" % upg_cost
		_upgrade_button.disabled = not affordable
		_upgrade_button.modulate = Color.WHITE if affordable else Color(0.65, 0.65, 0.72, 0.75)
	else:
		_upgrade_button.text = "MAX"
		_upgrade_button.disabled = true
		_upgrade_button.modulate = Color(0.75, 0.90, 1.0, 0.85)

	_sell_button.text = "Sell (+%dG)" % refund

	var cur_mode: TargetSelector.Mode = _current_tower.targeting_mode
	_update_target_button_visual(_btn_front, cur_mode == TargetSelector.Mode.FRONT_MOST)
	_update_target_button_visual(_btn_lowest, cur_mode == TargetSelector.Mode.LOWEST_HP)
	_update_target_button_visual(_btn_closest, cur_mode == TargetSelector.Mode.CLOSEST)


## [FUNGSI]: Membangun tata letak Container di sudut kanan-bawah tanpa koordinat piksel hardcoded.
## [INPUT/OUTPUT]: - -> void
func _build_ui_layout() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE

	var outer_margin := MarginContainer.new()
	outer_margin.name = "RadialOuterMargin"
	outer_margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	outer_margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	outer_margin.add_theme_constant_override("margin_left", 24)
	outer_margin.add_theme_constant_override("margin_top", 24)
	outer_margin.add_theme_constant_override("margin_right", 24)
	outer_margin.add_theme_constant_override("margin_bottom", 86)
	add_child(outer_margin)

	var align_vbox := VBoxContainer.new()
	align_vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	outer_margin.add_child(align_vbox)

	var top_spacer := Control.new()
	top_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	top_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	align_vbox.add_child(top_spacer)

	var bottom_hbox := HBoxContainer.new()
	bottom_hbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	align_vbox.add_child(bottom_hbox)

	var left_spacer := Control.new()
	left_spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	left_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bottom_hbox.add_child(left_spacer)

	_panel = PanelContainer.new()
	_panel.name = "RadialInspectionPanel"
	_panel.custom_minimum_size = Vector2(360.0, 0.0)
	_panel.mouse_filter = Control.MOUSE_FILTER_STOP
	_panel.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_PANEL, COLOR_CYAN, 2, 18))
	bottom_hbox.add_child(_panel)

	var inner := MarginContainer.new()
	inner.add_theme_constant_override("margin_left", 18)
	inner.add_theme_constant_override("margin_top", 14)
	inner.add_theme_constant_override("margin_right", 18)
	inner.add_theme_constant_override("margin_bottom", 14)
	_panel.add_child(inner)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 10)
	inner.add_child(vbox)

	# Header: Nama Tower + Badge Level + Tombol Close
	var head_hbox := HBoxContainer.new()
	head_hbox.add_theme_constant_override("separation", 8)
	vbox.add_child(head_hbox)

	_title_label = Label.new()
	_title_label.name = "TowerNameLabel"
	_title_label.text = "Laser Tower"
	_title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_title_label.add_theme_font_size_override("font_size", 17)
	_title_label.add_theme_color_override("font_color", COLOR_CYAN)
	head_hbox.add_child(_title_label)

	var level_badge := PanelContainer.new()
	level_badge.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_CARD, COLOR_AMBER, 1, 12))
	head_hbox.add_child(level_badge)

	var badge_margin := MarginContainer.new()
	badge_margin.add_theme_constant_override("margin_left", 10)
	badge_margin.add_theme_constant_override("margin_top", 2)
	badge_margin.add_theme_constant_override("margin_right", 10)
	badge_margin.add_theme_constant_override("margin_bottom", 2)
	level_badge.add_child(badge_margin)

	_level_badge_label = Label.new()
	_level_badge_label.name = "TowerLevelLabel"
	_level_badge_label.text = "Lv.1/3"
	_level_badge_label.add_theme_font_size_override("font_size", 13)
	_level_badge_label.add_theme_color_override("font_color", COLOR_AMBER)
	badge_margin.add_child(_level_badge_label)

	_close_button = Button.new()
	_close_button.name = "CloseButton"
	_close_button.text = "Close"
	_close_button.custom_minimum_size = Vector2(62.0, 28.0)
	_apply_button_style(_close_button, COLOR_TEXT_MUTED, COLOR_BG_CARD)
	_close_button.pressed.connect(_on_close_pressed)
	head_hbox.add_child(_close_button)

	# Stats card
	var stats_panel := PanelContainer.new()
	stats_panel.add_theme_stylebox_override("panel", _make_panel_style(COLOR_BG_CARD, Color(0.22, 0.32, 0.44, 0.8), 1, 10))
	vbox.add_child(stats_panel)

	var stats_margin := MarginContainer.new()
	stats_margin.add_theme_constant_override("margin_left", 12)
	stats_margin.add_theme_constant_override("margin_top", 6)
	stats_margin.add_theme_constant_override("margin_right", 12)
	stats_margin.add_theme_constant_override("margin_bottom", 6)
	stats_panel.add_child(stats_margin)

	_stats_label = Label.new()
	_stats_label.name = "TowerStatsLabel"
	_stats_label.text = "DMG: 15.0  |  RANGE: 15.0m  |  RATE: 0.50s"
	_stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_stats_label.add_theme_font_size_override("font_size", 13)
	_stats_label.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	stats_margin.add_child(_stats_label)

	# Targeting radial pill selector
	var target_label := Label.new()
	target_label.text = "TARGETING PRIORITY"
	target_label.add_theme_font_size_override("font_size", 11)
	target_label.add_theme_color_override("font_color", COLOR_TEXT_MUTED)
	vbox.add_child(target_label)

	var target_hbox := HBoxContainer.new()
	target_hbox.add_theme_constant_override("separation", 6)
	vbox.add_child(target_hbox)

	_btn_front = Button.new()
	_btn_front.name = "FrontMostButton"
	_btn_front.text = "Front Most"
	_btn_front.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_btn_front.custom_minimum_size = Vector2(0.0, 34.0)
	_btn_front.pressed.connect(func() -> void: _on_set_target_mode(TargetSelector.Mode.FRONT_MOST))
	target_hbox.add_child(_btn_front)

	_btn_lowest = Button.new()
	_btn_lowest.name = "LowestHpButton"
	_btn_lowest.text = "Lowest HP"
	_btn_lowest.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_btn_lowest.custom_minimum_size = Vector2(0.0, 34.0)
	_btn_lowest.pressed.connect(func() -> void: _on_set_target_mode(TargetSelector.Mode.LOWEST_HP))
	target_hbox.add_child(_btn_lowest)

	_btn_closest = Button.new()
	_btn_closest.name = "ClosestButton"
	_btn_closest.text = "Closest"
	_btn_closest.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_btn_closest.custom_minimum_size = Vector2(0.0, 34.0)
	_btn_closest.pressed.connect(func() -> void: _on_set_target_mode(TargetSelector.Mode.CLOSEST))
	target_hbox.add_child(_btn_closest)

	var sep := HSeparator.new()
	vbox.add_child(sep)

	# Upgrade & Sell action buttons
	var action_hbox := HBoxContainer.new()
	action_hbox.add_theme_constant_override("separation", 10)
	vbox.add_child(action_hbox)

	_upgrade_button = Button.new()
	_upgrade_button.name = "UpgradeButton"
	_upgrade_button.text = "Upgrade"
	_upgrade_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_upgrade_button.custom_minimum_size = Vector2(0.0, 38.0)
	_apply_button_style(_upgrade_button, COLOR_EMERALD, Color(0.05, 0.25, 0.20, 0.95))
	_upgrade_button.pressed.connect(_on_upgrade_pressed)
	action_hbox.add_child(_upgrade_button)

	_sell_button = Button.new()
	_sell_button.name = "SellButton"
	_sell_button.text = "Sell (+70%)"
	_sell_button.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_sell_button.custom_minimum_size = Vector2(0.0, 38.0)
	_apply_button_style(_sell_button, COLOR_CRIMSON, Color(0.24, 0.10, 0.14, 0.95))
	_sell_button.pressed.connect(_on_sell_pressed)
	action_hbox.add_child(_sell_button)


## [FUNGSI]: Memperbarui warna gaya tombol mode targeting aktif vs tidak aktif.
## [INPUT/OUTPUT]: btn (Button), is_active (bool) -> void
func _update_target_button_visual(btn: Button, is_active: bool) -> void:
	if btn == null:
		return
	if is_active:
		_apply_button_style(btn, COLOR_EMERALD, Color(0.06, 0.28, 0.24, 0.98))
		btn.modulate = Color(0.65, 1.0, 0.85, 1.0)
	else:
		_apply_button_style(btn, COLOR_CYAN, COLOR_BG_CARD)
		btn.modulate = Color.WHITE


## [FUNGSI]: Membuat StyleBoxFlat untuk panel/kartu inspeksi bergaya radial.
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


## [FUNGSI]: Menerapkan gaya visual tombol normal/hover/pressed/disabled yang konsisten.
## [INPUT/OUTPUT]: btn (Button), accent (Color), base_bg (Color) -> void
static func _apply_button_style(btn: Button, accent: Color, base_bg: Color) -> void:
	btn.add_theme_font_size_override("font_size", 13)
	btn.add_theme_color_override("font_color", COLOR_TEXT_MAIN)
	btn.add_theme_color_override("font_hover_color", Color.WHITE)
	btn.add_theme_color_override("font_disabled_color", COLOR_TEXT_MUTED)
	btn.add_theme_stylebox_override("normal", _make_panel_style(base_bg, accent * Color(1.0, 1.0, 1.0, 0.65), 1, 10))
	btn.add_theme_stylebox_override("hover", _make_panel_style(base_bg.lightened(0.14), accent, 2, 10))
	btn.add_theme_stylebox_override("pressed", _make_panel_style(base_bg.darkened(0.15), accent, 2, 10))
	btn.add_theme_stylebox_override("disabled", _make_panel_style(Color(0.08, 0.11, 0.17, 0.75), Color(0.25, 0.30, 0.38, 0.5), 1, 10))


## [FUNGSI]: Memperbarui tampilan affordance upgrade saat saldo Gold berubah di tengah wave.
## [INPUT/OUTPUT]: new_gold (int) -> void
func _on_gold_changed(new_gold: int) -> void:
	_current_gold = new_gold
	if visible and _current_tower != null:
		_refresh_display()


## [FUNGSI]: Memancarkan sinyal permintaan upgrade ke CyberDefense3D.
## [INPUT/OUTPUT]: - -> void
func _on_upgrade_pressed() -> void:
	upgrade_requested.emit()


## [FUNGSI]: Memancarkan sinyal permintaan jual menara ke CyberDefense3D.
## [INPUT/OUTPUT]: - -> void
func _on_sell_pressed() -> void:
	sell_requested.emit()


## [FUNGSI]: Memancarkan sinyal perubahan mode targeting menara ke CyberDefense3D.
## [INPUT/OUTPUT]: mode (TargetSelector.Mode) -> void
func _on_set_target_mode(mode: TargetSelector.Mode) -> void:
	targeting_mode_requested.emit(mode)


## [FUNGSI]: Memancarkan sinyal permintaan menutup panel inspeksi menara.
## [INPUT/OUTPUT]: - -> void
func _on_close_pressed() -> void:
	close_requested.emit()
