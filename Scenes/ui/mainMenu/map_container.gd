extends PanelContainer

var map_id := "":
	set(val):
		map_id = val
		var data: Dictionary = Data.levels[val]
		var indeks: int = LevelManager.daftar_level.find(val)
		var terkunci: bool = not LevelManager.apakah_terbuka(indeks)
		$TextureRect.texture = load(data["bg"])
		$Label.text = str(data["name"]) + (" (Terkunci)" if terkunci else "")
		$TextureRect.modulate = Color(0.35, 0.35, 0.35, 1) if terkunci else Color.WHITE

func _on_gui_input(event):
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var indeks: int = LevelManager.daftar_level.find(map_id)
		if not LevelManager.apakah_terbuka(indeks):
			Sfx.play("ui_click", -10.0)
			return
		Sfx.play("ui_click", -3.0)
		LevelManager.pilih_level(indeks)
		get_tree().change_scene_to_file("res://Scenes/main/main.tscn")
