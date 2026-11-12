extends Node2D

var map_type := "":
	set(val):
		map_type = val
		baseHP = Data.levels[val]["baseHp"]
		baseMaxHp = Data.levels[val]["baseHp"]
		gold = Data.levels[val]["startingGold"]
		$PathSpawner.map_type = val

var gameOver := false
var baseMaxHp := 20.0
var baseHP := baseMaxHp
var gold := 100:
	set(value):
		gold = value
		Globals.goldChanged.emit(value)

func _ready():
	Globals.turretsNode = $Turrets
	Globals.projectilesNode = $Projectiles
	Globals.currentMap = self
	Globals.goldChanged.emit(gold)
	Globals.baseHpChanged.emit(baseHP, baseMaxHp)
	_pasang_base()
	Globals.mulai_permainan()

func _pasang_base() -> void:
	var curve: Curve2D = $PathSpawner.curve
	var akhir: Vector2 = $PathSpawner.position + curve.get_point_position(curve.point_count - 1)
	var base := Sprite2D.new()
	base.texture = load("res://Assets/tower/base_castle.png")
	var tinggi := 130.0
	base.scale = Vector2.ONE * (tinggi / base.texture.get_height())
	base.position = akhir
	base.flip_h = bool(Data.levels[map_type].get("base_flip", false))
	base.z_index = 1
	add_child(base)

func get_base_damage(damage):
	if gameOver:
		return
	baseHP -= damage
	Globals.baseHpChanged.emit(baseHP, baseMaxHp)
	if baseHP <= 0:
		gameOver = true
		Globals.selesaikan_level(false)
