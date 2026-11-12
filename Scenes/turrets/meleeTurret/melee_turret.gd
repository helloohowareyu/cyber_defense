extends Turret

func attack():
	try_get_target()
	if is_instance_valid(current_target):
		$AnimatedSprite2D.play("default")
		Sfx.play("explosion", -12.0, randf_range(0.95, 1.05))
		for a in $DetectionArea.get_overlapping_areas():
			var collider = a.get_parent()
			if collider.is_in_group("enemy") and not collider.is_destroyed:
				collider.get_damage(damage)
	else:
		try_get_target()
