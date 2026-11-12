extends Node2D

var _placeholder: Turret = null
var _tipe := ""

func mulai_bangun(tipe: String) -> void:
	if Globals.game_over:
		return
	batal()
	if not Data.turrets.has(tipe):
		return
	_tipe = tipe
	var turretScene := load(Data.turrets[tipe]["scene"])
	_placeholder = turretScene.instantiate()
	_placeholder.turret_type = tipe
	_placeholder.set_placeholder()
	Globals.turretsNode.add_child(_placeholder)
	_placeholder.global_position = get_global_mouse_position()
	Sfx.play("ui_click", -8.0)

func _process(_delta):
	if is_instance_valid(_placeholder):
		_placeholder.global_position = get_global_mouse_position()

func _unhandled_input(event):
	if not is_instance_valid(_placeholder):
		return
	if event.is_action_pressed("ui_cancel"):
		batal()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventMouseButton and event.pressed:
		if event.button_index == MOUSE_BUTTON_LEFT:
			if _bisa_bangun():
				_bangun()
			else:
				Sfx.play("ui_click", -10.0)
			get_viewport().set_input_as_handled()
		elif event.button_index == MOUSE_BUTTON_RIGHT:
			batal()
			get_viewport().set_input_as_handled()

func _bisa_bangun() -> bool:
	return is_instance_valid(_placeholder) and is_instance_valid(Globals.currentMap) and _placeholder.can_place and Globals.currentMap.gold >= Data.turrets[_tipe]["cost"]

func _bangun():
	Globals.currentMap.gold -= Data.turrets[_tipe]["cost"]
	_placeholder.build()
	_placeholder = null
	_tipe = ""

func batal():
	if is_instance_valid(_placeholder):
		_placeholder.queue_free()
	_placeholder = null
	_tipe = ""
