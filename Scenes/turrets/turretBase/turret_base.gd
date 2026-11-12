extends Node2D
class_name Turret

signal turretUpdated

const PERTAMA := 0
const TERKUAT := 1
const TERDEKAT := 2

var turret_type := "":
	set(value):
		turret_type = value
		var data: Dictionary = Data.turrets[value]
		$Sprite2D.texture = load(data["sprite"])
		$Sprite2D.scale = Vector2(data["scale"], data["scale"])
		rotates = data["rotates"]
		efek_lambat = float(data.get("efek_lambat", 1.0))
		durasi_lambat = float(data.get("durasi_lambat", 0.0))
		prioritas = int(data.get("prioritas_default", PERTAMA))
		for stat in data["stats"].keys():
			set(stat, data["stats"][stat])

var deployed := false
var can_place := false
var draw_range := false
var rotates := true
var current_target = null
var prioritas := PERTAMA

var attack_speed := 1.0:
	set(value):
		attack_speed = maxf(value, 0.05)
		$AttackCooldown.wait_time = 1.0 / attack_speed
var attack_range := 1.0:
	set(value):
		attack_range = value
		$DetectionArea/CollisionShape2D.shape.radius = value
var damage := 1.0
var turret_level := 1
var efek_lambat := 1.0
var durasi_lambat := 0.0

func _ready():
	$DetectionArea/CollisionShape2D.shape = $DetectionArea/CollisionShape2D.shape.duplicate()
	$DetectionArea/CollisionShape2D.shape.radius = attack_range

func _process(_delta):
	if not deployed:
		if $CollisionArea.has_overlapping_areas():
			colliding()
		else:
			not_colliding()
	elif rotates:
		if is_instance_valid(current_target):
			look_at(current_target.global_position)
		else:
			try_get_target()
	elif not is_instance_valid(current_target):
		try_get_target()

func _draw():
	if draw_range:
		draw_circle(Vector2.ZERO, attack_range, Color("3ccd50a9"), false, 1.0, true)

func set_placeholder():
	modulate = Color("6eff297a")

func build():
	deployed = true
	modulate = Color.WHITE
	Sfx.play("tower_place", -3.0, randf_range(0.95, 1.05))

func colliding():
	can_place = false
	modulate = Color("ff5c2990")

func not_colliding():
	can_place = true
	modulate = Color("6eff297a")

func _on_detection_area_area_entered(area):
	if deployed and not is_instance_valid(current_target):
		var area_parent = area.get_parent()
		if area_parent.is_in_group("enemy") and not area_parent.is_destroyed:
			current_target = area_parent

func _on_detection_area_area_exited(area):
	if deployed and current_target == area.get_parent():
		current_target = null
		try_get_target()

func try_get_target():
	if not deployed:
		return
	var best = null
	var best_value := -INF
	if prioritas == TERDEKAT:
		best_value = INF
	for area in $DetectionArea.get_overlapping_areas():
		var enemy = area.get_parent()
		if not enemy.is_in_group("enemy") or enemy.is_destroyed:
			continue
		var jarak := global_position.distance_to(enemy.global_position)
		if jarak > attack_range:
			continue
		var nilai := 0.0
		match prioritas:
			PERTAMA:
				nilai = enemy.progress_ratio
			TERKUAT:
				nilai = enemy.max_hp
			TERDEKAT:
				nilai = jarak
		var lebih_baik := nilai > best_value
		if prioritas == TERDEKAT:
			lebih_baik = nilai < best_value
		if lebih_baik:
			best_value = nilai
			best = enemy
	if best != null:
		current_target = best

func try_get_closest_target():
	try_get_target()

func set_prioritas(nilai: int) -> void:
	prioritas = clampi(nilai, PERTAMA, TERDEKAT)
	current_target = null
	try_get_target()

func open_details_pane():
	var turretDetailsScene := preload("res://Scenes/ui/turretUI/turret_details.tscn")
	var details := turretDetailsScene.instantiate()
	details.turret = self
	draw_range = true
	queue_redraw()
	Globals.hud.add_child(details)
	Globals.hud.open_details_pane = details
	Sfx.play("ui_click", -6.0)

func close_details_pane():
	draw_range = false
	queue_redraw()
	if is_instance_valid(Globals.hud.open_details_pane):
		Globals.hud.open_details_pane.queue_free()
	Globals.hud.open_details_pane = null

func _on_collision_area_input_event(_viewport, event, _shape_idx):
	if deployed and event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		if is_instance_valid(Globals.hud.open_details_pane):
			if Globals.hud.open_details_pane.turret == self:
				close_details_pane()
				return
			Globals.hud.open_details_pane.turret.close_details_pane()
		open_details_pane()

func upgrade_turret() -> bool:
	if turret_level >= int(Data.turrets[turret_type]["max_level"]):
		return false
	turret_level += 1
	for upgrade in Data.turrets[turret_type]["upgrades"].keys():
		var data: Dictionary = Data.turrets[turret_type]["upgrades"][upgrade]
		if data["multiplies"]:
			set(upgrade, get(upgrade) * data["amount"])
		else:
			set(upgrade, get(upgrade) + data["amount"])
	turretUpdated.emit()
	return true

func attack():
	try_get_target()
