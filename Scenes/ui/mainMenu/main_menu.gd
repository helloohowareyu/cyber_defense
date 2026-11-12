extends Control

var mapSelectContainer : PanelContainer
var _overlay : Control

func _on_quit_button_pressed():
	Sfx.play("ui_click", -3.0)
	get_tree().quit()

func _on_start_button_pressed():
	Sfx.play("ui_click", -3.0)
	_tutup_overlay()
	if not is_instance_valid(mapSelectContainer):
		var mscScene := preload("res://Scenes/ui/mainMenu/select_map_container.tscn")
		var msc := mscScene.instantiate()
		mapSelectContainer = msc
		add_child(msc)

func _on_settings_button_pressed():
	Sfx.play("ui_click", -3.0)
	_buka_overlay("res://Scenes/ui/settings.tscn")

func _on_credits_button_pressed():
	Sfx.play("ui_click", -3.0)
	_buka_overlay("res://Scenes/ui/credits.tscn")

func _buka_overlay(path: String):
	_tutup_overlay()
	var scene := load(path)
	var overlay = scene.instantiate()
	_overlay = overlay
	add_child(overlay)
	if overlay.has_signal("kembali_ditekan"):
		overlay.kembali_ditekan.connect(_tutup_overlay)
	if overlay.has_method("tampilkan"):
		overlay.tampilkan()

func _tutup_overlay():
	if is_instance_valid(_overlay):
		_overlay.queue_free()
	_overlay = null
