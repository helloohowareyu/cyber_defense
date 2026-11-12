extends Control

signal kembali_ditekan

var _siap := false

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	%MasterSlider.value_changed.connect(_on_master_changed)
	%MusicSlider.value_changed.connect(_on_music_changed)
	%SfxSlider.value_changed.connect(_on_sfx_changed)
	%FullscreenCheck.toggled.connect(_on_fullscreen_toggled)
	%ResetButton.pressed.connect(_on_reset_pressed)
	%BackButton.pressed.connect(_on_back_pressed)
	_muat_ui()
	_siap = true

func _muat_ui():
	%MasterSlider.value = SettingsManager.volume_master * 100.0
	%MusicSlider.value = SettingsManager.volume_music * 100.0
	%SfxSlider.value = SettingsManager.volume_sfx * 100.0
	%FullscreenCheck.button_pressed = SettingsManager.fullscreen
	_perbarui_label()

func _perbarui_label():
	%MasterValue.text = str(int(round(%MasterSlider.value))) + "%"
	%MusicValue.text = str(int(round(%MusicSlider.value))) + "%"
	%SfxValue.text = str(int(round(%SfxSlider.value))) + "%"

func _on_master_changed(nilai: float):
	if _siap:
		SettingsManager.set_volume_master(nilai / 100.0)
	_perbarui_label()

func _on_music_changed(nilai: float):
	if _siap:
		SettingsManager.set_volume_music(nilai / 100.0)
	_perbarui_label()

func _on_sfx_changed(nilai: float):
	if _siap:
		SettingsManager.set_volume_sfx(nilai / 100.0)
	_perbarui_label()

func _on_fullscreen_toggled(nilai: bool):
	if _siap:
		SettingsManager.set_fullscreen(nilai)

func _on_reset_pressed():
	SettingsManager.reset()
	_muat_ui()
	Sfx.play("ui_click", -6.0)

func _unhandled_input(event):
	if visible and event.is_action_pressed("ui_cancel"):
		_on_back_pressed()
		get_viewport().set_input_as_handled()

func _on_back_pressed():
	Sfx.play("ui_click", -6.0)
	kembali_ditekan.emit()

func tampilkan():
	visible = true
	_muat_ui()

func sembunyikan():
	visible = false
