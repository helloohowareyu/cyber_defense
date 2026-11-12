extends Control

signal lanjut_ditekan
signal pengaturan_ditekan
signal kredit_ditekan
signal menu_ditekan

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	%ResumeButton.pressed.connect(func(): _klik(); lanjut_ditekan.emit())
	%SettingsButton.pressed.connect(func(): _klik(); pengaturan_ditekan.emit())
	%CreditsButton.pressed.connect(func(): _klik(); kredit_ditekan.emit())
	%MenuButton.pressed.connect(func(): _klik(); menu_ditekan.emit())

func _unhandled_input(event):
	if visible and event.is_action_pressed("ui_cancel"):
		_klik()
		lanjut_ditekan.emit()
		get_viewport().set_input_as_handled()

func _klik():
	Sfx.play("ui_click", -6.0)

func tampilkan():
	visible = true

func sembunyikan():
	visible = false
