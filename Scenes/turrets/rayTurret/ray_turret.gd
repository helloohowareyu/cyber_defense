extends Turret

var can_fire := true
var ray_enabled := false
var ray_extension := 0.0

var ray_length := 400.0
var ray_duration := 2.0:
	set(value):
		ray_duration = maxf(value, 0.1)
		if is_node_ready():
			$RayDuration.wait_time = ray_duration

func _ready():
	super._ready()
	$RayDuration.wait_time = maxf(ray_duration, 0.1)

func _process(delta):
	super._process(delta)
	if ray_enabled and ray_extension < 1.0:
		ray_extension += 0.1
		activate_ray(ray_extension)
	if not ray_enabled and ray_extension > 0:
		ray_extension -= 0.01
		deactivate_ray(ray_extension)

func attack():
	if $RayDuration.is_stopped():
		try_get_target()
	if not $RayDuration.is_stopped():
		for a in $HitArea.get_overlapping_areas():
			var collider = a.get_parent()
			if collider.is_in_group("enemy") and not collider.is_destroyed:
				if efek_lambat < 1.0 and collider.has_method("terapkan_lambat"):
					collider.terapkan_lambat(efek_lambat, durasi_lambat)
				collider.get_damage(damage)
	if is_instance_valid(current_target):
		if can_fire:
			can_fire = false
			ray_enabled = true
			$RayDuration.start()
			Sfx.play("shoot_laser", -8.0, randf_range(0.9, 1.0))
	else:
		try_get_target()

func activate_ray(ratio):
	if is_instance_valid(current_target):
		var angle := get_angle_to(current_target.global_position)
		var offset = Vector2(cos(angle), sin(angle)) * ray_length * ratio
		$HitArea/Line2D.set_point_position(1, offset)
		$HitArea/CollisionShape2D.shape.b = offset

func deactivate_ray(ratio):
	var offset = $HitArea/Line2D.get_point_position(1) * ratio
	$HitArea/Line2D.set_point_position(1, offset)
	$HitArea/CollisionShape2D.shape.b = offset

func _on_ray_duration_timeout():
	ray_enabled = false
	$AttackCooldown.start()

func _on_attack_cooldown_timeout():
	can_fire = true
