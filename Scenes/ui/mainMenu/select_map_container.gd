extends PanelContainer

func _ready():
	populate_maps()

func populate_maps():
	var mcs := preload("res://Scenes/ui/mainMenu/map_container.tscn")
	for map in LevelManager.daftar_level:
		var mapCont := mcs.instantiate()
		mapCont.map_id = map
		%MapsList.add_child(mapCont)

func _on_close_button_pressed():
	Sfx.play("ui_click", -6.0)
	queue_free()
