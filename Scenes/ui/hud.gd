extends Control

signal pause_ditekan

var next_wait_time := 0
var waited := 0
var open_details_pane : PanelContainer

func _ready():
	Globals.hud = self
	Globals.baseHpChanged.connect(update_hp)
	Globals.goldChanged.connect(update_gold)
	Globals.waveStarted.connect(show_wave_count)
	Globals.waveCleared.connect(show_wave_timer)
	Globals.enemyDestroyed.connect(update_enemy_count)
	Globals.boss_muncul.connect(_on_boss_muncul)
	Globals.boss_hp_berubah.connect(_on_boss_hp_berubah)
	Globals.boss_mati.connect(_on_boss_mati)
	%PauseButton.pressed.connect(func(): pause_ditekan.emit())
	refresh()

func refresh():
	if is_instance_valid(Globals.currentMap):
		update_hp(Globals.currentMap.baseHP, Globals.currentMap.baseMaxHp)
		update_gold(Globals.currentMap.gold)
	var data: Dictionary = Data.levels.get(Globals.selected_map, {})
	%LevelLabel.text = "Level %d: %s" % [Globals.selected_level + 1, data.get("name", "")]
	%WaveLabel.text = "Gelombang: 0"
	%RemainLabel.visible = false
	%BossPanel.visible = false

func update_hp(newHp, maxHp):
	%HPLabel.text = "HP: " + str(int(round(newHp))) + "/" + str(int(round(maxHp)))

func update_gold(newGold):
	%GoldLabel.text = "Emas: " + str(round(newGold))

func show_wave_count(current_wave, enemies):
	$WaveWaitTimer.stop()
	waited = 0
	Sfx.play("wave_start", -4.0)
	%WaveLabel.text = "Gelombang: " + str(current_wave)
	%RemainLabel.text = "Musuh: " + str(enemies)
	%RemainLabel.visible = true

func show_wave_timer(wait_time):
	%RemainLabel.visible = false
	next_wait_time = maxi(int(round(wait_time)) - 1, 0)
	waited = 0
	%WaveLabel.text = "Gelombang berikutnya: " + str(next_wait_time)
	$WaveWaitTimer.start()

func _on_wave_wait_timer_timeout():
	var sisa: int = next_wait_time - waited
	if sisa > 0:
		%WaveLabel.text = "Gelombang berikutnya: " + str(sisa)
	waited += 1
	if waited >= next_wait_time:
		$WaveWaitTimer.stop()

func update_enemy_count(remain):
	%RemainLabel.text = "Musuh: " + str(remain)

func _on_boss_muncul(nama, hp):
	%BossPanel.visible = true
	%BossName.text = nama
	%BossBar.max_value = hp
	%BossBar.value = hp

func _on_boss_hp_berubah(hp, max_hp):
	%BossPanel.visible = true
	%BossBar.max_value = max_hp
	%BossBar.value = hp

func _on_boss_mati():
	%BossPanel.visible = false

func reset():
	if is_instance_valid(open_details_pane):
		open_details_pane.turret.close_details_pane()
