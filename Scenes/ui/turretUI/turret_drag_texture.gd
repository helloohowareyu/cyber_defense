extends TextureRect

var turretType := ""

func _ready():
	Globals.goldChanged.connect(check_can_purchase)
	if is_instance_valid(Globals.currentMap):
		check_can_purchase(Globals.currentMap.gold)

func _gui_input(event):
	if not is_instance_valid(Globals.currentMap):
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if check_can_purchase(Globals.currentMap.gold):
			Globals.menara_dipilih.emit(turretType)
			Sfx.play("ui_click", -6.0)
			accept_event()

func check_can_purchase(newGold):
	if turretType:
		var bisa: bool = newGold >= Data.turrets[turretType]["cost"]
		get_parent().can_purchase = bisa
		return bisa
	return false
