extends Node

const turrets := {
	"gatling": {
		"stats": {
			"damage": 10,
			"attack_speed": 2.0,
			"attack_range": 200.0,
			"bulletSpeed": 200.0,
			"bulletPierce": 1,
		},
		"upgrades": {
			"damage": {"amount": 2.5, "multiplies": false},
			"attack_speed": {"amount": 1.5, "multiplies": true},
		},
		"name": "Gatling",
		"cost": 50,
		"upgrade_cost": 50,
		"max_level": 2,
		"scene": "res://Scenes/turrets/projectileTurret/projectileTurret.tscn",
		"sprite": "res://Assets/turrets/technoturret.png",
		"scale": 4.0,
		"rotates": true,
		"bullet": "fire",
		"efek_lambat": 1.0,
		"durasi_lambat": 0.0,
		"prioritas_default": 0,
	},
	"flame": {
		"stats": {
			"damage": 0.5,
			"attack_speed": 20.0,
			"attack_range": 250.0,
			"bulletSpeed": 400.0,
			"bulletPierce": 4,
		},
		"upgrades": {
			"damage": {"amount": 2.5, "multiplies": false},
			"attack_speed": {"amount": 1.5, "multiplies": true},
		},
		"name": "Penyembur Api",
		"cost": 70,
		"upgrade_cost": 50,
		"max_level": 3,
		"scene": "res://Scenes/turrets/projectileTurret/projectileTurret.tscn",
		"sprite": "res://Assets/turrets/laserturret.png",
		"scale": 1.0,
		"rotates": false,
		"bullet": "laser",
		"efek_lambat": 1.0,
		"durasi_lambat": 0.0,
		"prioritas_default": 0,
	},
	"ray": {
		"stats": {
			"damage": 0.5,
			"attack_speed": 0.5,
			"attack_range": 300.0,
			"ray_duration": 1.0,
			"ray_length": 300.0,
		},
		"upgrades": {
			"damage": {"amount": 1.0, "multiplies": false},
			"attack_speed": {"amount": 1.5, "multiplies": true},
			"ray_length": {"amount": 1.5, "multiplies": true},
			"ray_duration": {"amount": 1.5, "multiplies": true},
		},
		"name": "Sinar Laser",
		"cost": 30,
		"upgrade_cost": 50,
		"max_level": 3,
		"scene": "res://Scenes/turrets/rayTurret/rayTurret.tscn",
		"sprite": "res://Assets/turrets/reallaser.png",
		"scale": 1.0,
		"rotates": true,
		"efek_lambat": 0.5,
		"durasi_lambat": 1.5,
		"prioritas_default": 0,
	},
	"melee": {
		"stats": {
			"damage": 5.0,
			"attack_speed": 1.0,
			"attack_range": 100.0,
		},
		"upgrades": {
			"damage": {"amount": 2.5, "multiplies": false},
			"attack_speed": {"amount": 1.5, "multiplies": true},
		},
		"name": "Peledak",
		"cost": 70,
		"upgrade_cost": 50,
		"max_level": 3,
		"scene": "res://Scenes/turrets/meleeTurret/meleeTurret.tscn",
		"sprite": "res://Assets/turrets/dynamite.png",
		"scale": 1.0,
		"rotates": false,
		"efek_lambat": 1.0,
		"durasi_lambat": 0.0,
		"prioritas_default": 2,
	},
}

const stats := {
	"damage": {"name": "Kerusakan"},
	"attack_speed": {"name": "Kecepatan"},
	"attack_range": {"name": "Jangkauan"},
	"bulletSpeed": {"name": "Kecepatan Peluru"},
	"bulletPierce": {"name": "Tembus Peluru"},
	"ray_length": {"name": "Panjang Sinar"},
	"ray_duration": {"name": "Durasi Sinar"},
}

const bullets := {
	"fire": {
		"frames": "res://Assets/bullets/bullet1.tres",
	},
	"laser": {
		"frames": "res://Assets/bullets/bullet2.tres",
	}
}

const enemies := {
	"normal": {
		"stats": {
			"hp": 40.0,
			"speed": 1.0,
			"baseDamage": 1.0,
			"goldYield": 12.0,
			"armor": 0.0,
		},
		"difficulty": 1.0,
		"sprite": "res://Assets/enemies/dino1.png",
		"scale": 1.0,
		"modulate": Color(1, 1, 1, 1),
		"kebal_lambat": false,
		"is_boss": false,
	},
	"cepat": {
		"stats": {
			"hp": 25.0,
			"speed": 2.0,
			"baseDamage": 1.0,
			"goldYield": 15.0,
			"armor": 0.0,
		},
		"difficulty": 2.0,
		"sprite": "res://Assets/enemies/dino2.png",
		"scale": 0.85,
		"modulate": Color(1.0, 0.9, 0.3, 1),
		"kebal_lambat": false,
		"is_boss": false,
	},
	"tank": {
		"stats": {
			"hp": 100.0,
			"speed": 0.8,
			"baseDamage": 2.0,
			"goldYield": 30.0,
			"armor": 2.0,
		},
		"difficulty": 3.0,
		"sprite": "res://Assets/enemies/dino2.png",
		"scale": 1.4,
		"modulate": Color(0.8, 0.5, 1.0, 1),
		"kebal_lambat": false,
		"is_boss": false,
	},
	"berlapis": {
		"stats": {
			"hp": 70.0,
			"speed": 1.0,
			"baseDamage": 2.0,
			"goldYield": 22.0,
			"armor": 5.0,
		},
		"difficulty": 4.0,
		"sprite": "res://Assets/enemies/dino3.png",
		"scale": 1.2,
		"modulate": Color(0.75, 0.8, 0.9, 1),
		"kebal_lambat": false,
		"is_boss": false,
	},
	"antilambat": {
		"stats": {
			"hp": 45.0,
			"speed": 1.2,
			"baseDamage": 1.0,
			"goldYield": 20.0,
			"armor": 2.0,
		},
		"difficulty": 3.0,
		"sprite": "res://Assets/enemies/dino4.png",
		"scale": 1.0,
		"modulate": Color(0.5, 1.0, 0.7, 1),
		"kebal_lambat": true,
		"is_boss": false,
	},
	"boss": {
		"stats": {
			"hp": 500.0,
			"speed": 0.6,
			"baseDamage": 5.0,
			"goldYield": 150.0,
			"armor": 8.0,
		},
		"difficulty": 5.0,
		"sprite": "res://Assets/enemies/dino4.png",
		"scale": 2.2,
		"modulate": Color(1.0, 0.55, 0.4, 1),
		"kebal_lambat": true,
		"is_boss": true,
	},
}

const waves := [
	{"normal": 6, "cepat": 0, "tank": 0, "berlapis": 0, "antilambat": 0, "boss": 0, "interval": 1.0, "delay": 3.0},
	{"normal": 8, "cepat": 4, "tank": 0, "berlapis": 0, "antilambat": 0, "boss": 0, "interval": 1.0, "delay": 3.0},
	{"normal": 8, "cepat": 5, "tank": 0, "berlapis": 2, "antilambat": 0, "boss": 0, "interval": 0.9, "delay": 3.0},
	{"normal": 8, "cepat": 5, "tank": 2, "berlapis": 0, "antilambat": 2, "boss": 0, "interval": 0.9, "delay": 3.0},
	{"normal": 6, "cepat": 4, "tank": 1, "berlapis": 1, "antilambat": 1, "boss": 1, "interval": 0.8, "delay": 3.0},
]

const levels := {
	"level1": {
		"name": "Hutan Terlupakan",
		"description": "Jalur berkelok di antara batu dan pepohonan.",
		"bg": "res://Assets/maps/map1.webp",
		"scene": "res://Scenes/maps/map1.tscn",
		"baseHp": 30,
		"startingGold": 150,
		"base_flip": true,
		"waves": [0, 1, 2],
	},
	"level2": {
		"name": "Gurun Berliku",
		"description": "Gurun panas dengan jalur zig-zag yang panjang.",
		"bg": "res://Assets/maps/map2.png",
		"scene": "res://Scenes/maps/map2.tscn",
		"baseHp": 20,
		"startingGold": 220,
		"waves": [2, 3, 4],
	},
}
