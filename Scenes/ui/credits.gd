extends Control

signal kembali_ditekan

func _ready():
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	%BackButton.pressed.connect(_on_back_pressed)

func _unhandled_input(event):
	if visible and event.is_action_pressed("ui_cancel"):
		_on_back_pressed()
		get_viewport().set_input_as_handled()

func _on_back_pressed():
	Sfx.play("ui_click", -6.0)
	kembali_ditekan.emit()

func tampilkan():
	visible = true

func sembunyikan():
	visible = false
