extends PanelContainer

var turret : Node2D
const sell_modifier := 0.7

func _ready():
	Globals.goldChanged.connect(check_can_upgrade)
	turret.turretUpdated.connect(set_props)
	%PriorityOption.clear()
	%PriorityOption.add_item("Pertama", Turret.PERTAMA)
	%PriorityOption.add_item("Terkuat", Turret.TERKUAT)
	%PriorityOption.add_item("Terdekat", Turret.TERDEKAT)
	%PriorityOption.item_selected.connect(_on_priority_selected)
	set_props()
	animate_appear()
	check_can_upgrade()

func animate_appear():
	var tween := create_tween()
	tween.tween_property(self, "position", Vector2(500, 0), 0.01).as_relative()
	tween.tween_property(self, "position", Vector2(-500, 0), 0.3).as_relative()

func set_props():
	%TurretTexture.texture = load(Data.turrets[turret.turret_type]["sprite"])
	%TurretName.text = Data.turrets[turret.turret_type]["name"]
	%TurretLevel.text = "Level " + str(turret.turret_level)
	%UpgradeButton.text = "Tingkatkan: " + str(get_upgrade_price())
	%SellButton.text = "Jual: " + str(int(get_sell_price()))
	%PriorityOption.selected = turret.prioritas
	for c in %Stats.get_children():
		c.queue_free()
	var statLabelScene := preload("res://Scenes/ui/turretUI/stat_label.tscn")
	for stat in Data.turrets[turret.turret_type]["stats"].keys():
		var statLabel := statLabelScene.instantiate()
		statLabel.text = Data.stats[stat]["name"] + " " + str(round(turret.get(stat)))
		%Stats.add_child(statLabel)

func _on_priority_selected(index: int):
	turret.set_prioritas(%PriorityOption.get_item_id(index))
	Sfx.play("ui_click", -6.0)

func _on_upgrade_button_pressed():
	if check_can_upgrade():
		Globals.currentMap.gold -= get_upgrade_price()
		turret.upgrade_turret()
		Sfx.play("upgrade", -3.0)
		check_can_upgrade()

func get_upgrade_price():
	return turret.turret_level * Data.turrets[turret.turret_type]["upgrade_cost"]

func get_sell_price():
	var total_cost = Data.turrets[turret.turret_type]["cost"]
	for i in range(turret.turret_level):
		total_cost += i * Data.turrets[turret.turret_type]["upgrade_cost"]
	return round(total_cost * sell_modifier)

func check_can_upgrade(_new_gold=0):
	if turret.turret_level >= int(Data.turrets[turret.turret_type]["max_level"]):
		%UpgradeButton.text = "Maksimal"
		%UpgradeButton.disabled = true
	else:
		%UpgradeButton.disabled = Globals.currentMap.gold < get_upgrade_price()
	return not %UpgradeButton.disabled

func _on_sell_button_pressed():
	Globals.currentMap.gold += get_sell_price()
	Sfx.play("sell_coin", -3.0)
	Globals.hud.open_details_pane = null
	queue_free()
	turret.queue_free()

func _on_close_button_pressed():
	Sfx.play("ui_click", -6.0)
	turret.close_details_pane()
