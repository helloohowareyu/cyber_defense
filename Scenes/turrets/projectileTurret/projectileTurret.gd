extends Turret

var bulletSpeed := 200.0
var bulletPierce := 1

func attack():
	try_get_target()
	if is_instance_valid(current_target):
		var projectileScene := preload("res://Scenes/turrets/projectileTurret/bullet/bulletBase.tscn")
		var projectile := projectileScene.instantiate()
		var bullet_type: String = Data.turrets[turret_type]["bullet"]
		projectile.bullet_type = bullet_type
		projectile.damage = damage
		projectile.speed = bulletSpeed
		projectile.pierce = bulletPierce
		projectile.efek_lambat = efek_lambat
		projectile.durasi_lambat = durasi_lambat
		Globals.projectilesNode.add_child(projectile)
		projectile.global_position = global_position
		projectile.target = current_target.global_position
		if bullet_type == "fire":
			Sfx.play("shoot_fast", -10.0, randf_range(0.95, 1.05))
		else:
			Sfx.play("shoot_laser", -12.0, randf_range(0.95, 1.05))
	else:
		try_get_target()
