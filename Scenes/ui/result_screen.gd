extends Control

signal lanjut_ditekan
signal ulang_ditekan
signal menu_ditekan

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	%NextButton.pressed.connect(func(): _klik(); lanjut_ditekan.emit())
	%RetryButton.pressed.connect(func(): _klik(); ulang_ditekan.emit())
	%MenuButton.pressed.connect(func(): _klik(); menu_ditekan.emit())

func _unhandled_input(event):
	if visible and event.is_action_pressed("ui_cancel"):
		_klik()
		menu_ditekan.emit()
		get_viewport().set_input_as_handled()

func _klik():
	Sfx.play("ui_click", -6.0)

func tampilkan(menang: bool, ada_lanjut: bool):
	visible = true
	if menang:
		%TitleLabel.text = "LEVEL SELESAI!"
		%MessageLabel.text = "Pertahanan berhasil. Lanjutkan ke level berikutnya."
	else:
		%TitleLabel.text = "GAME OVER"
		%MessageLabel.text = "Basis hancur. Coba lagi atau kembali ke menu."
	%NextButton.visible = menang and ada_lanjut
