extends PathFollow2D

var enemy_type := "":
	set(val):
		enemy_type = val
		var data: Dictionary = Data.enemies[val]
		$Sprite2D.texture = load(data["sprite"])
		$Sprite2D.modulate = data["modulate"]
		$Sprite2D.scale = Vector2(2, 2) * float(data["scale"])
		for stat in data["stats"].keys():
			set(stat, data["stats"][stat])
		kebal_lambat = bool(data["kebal_lambat"])
		is_boss = bool(data["is_boss"])
		max_hp = hp

enum State {walking, damaged}
var state = State.walking
var goldYield := 10.0
var hp := 10.0
var max_hp := 10.0
var baseDamage := 5.0
var speed := 1.0
var armor := 0.0
var kebal_lambat := false
var is_boss := false
var is_destroyed := false
var _slow_factor := 1.0
var _slow_timer := 0.0

@onready var spawner := get_parent() as EnemyPath

func _ready():
	add_to_group("enemy")
	max_hp = hp
	if is_boss:
		Globals.boss_muncul.emit("Raja Dino", max_hp)

func _process(delta):
	if state != State.walking:
		return
	if _slow_timer > 0.0:
		_slow_timer -= delta
		if _slow_timer <= 0.0:
			_slow_factor = 1.0
	progress_ratio += speed * 0.03 * _slow_factor * delta
	if progress_ratio >= 1.0:
		finished_path()
		return
	var angle = int(rotation_degrees) % 360
	if angle > 180:
		angle -= 360
	$Sprite2D.flip_v = abs(angle) > 90

func finished_path():
	if is_destroyed:
		return
	is_destroyed = true
	spawner.enemy_destroyed()
	Globals.currentMap.get_base_damage(baseDamage)
	Sfx.play("base_hit", -3.0, randf_range(0.95, 1.05))
	if is_boss:
		Globals.boss_mati.emit()
	queue_free()

func get_damage(damage):
	if is_destroyed:
		return
	var masuk: float = maxf(damage - armor, 1.0)
	hp -= masuk
	damage_animation()
	if is_boss:
		Globals.boss_hp_berubah.emit(maxf(hp, 0.0), max_hp)
	if hp <= 0:
		is_destroyed = true
		spawner.enemy_destroyed()
		Globals.currentMap.gold += goldYield
		Sfx.play("enemy_die", -8.0, randf_range(0.9, 1.1))
		if is_boss:
			Globals.boss_mati.emit()
		queue_free()

func terapkan_lambat(faktor: float, durasi: float) -> void:
	if kebal_lambat or is_destroyed:
		return
	_slow_factor = minf(_slow_factor, clampf(faktor, 0.1, 1.0))
	_slow_timer = maxf(_slow_timer, durasi)

func damage_animation():
	var tween := create_tween()
	tween.tween_property(self, "v_offset", 0, 0.05)
	tween.tween_property(self, "modulate", Color.ORANGE_RED, 0.1)
	tween.tween_property(self, "modulate", Color.WHITE, 0.3)
	tween.set_parallel()
	tween.tween_property(self, "v_offset", -5, 0.2)
	tween.set_parallel(false)
	tween.tween_property(self, "v_offset", 0, 0.2)
