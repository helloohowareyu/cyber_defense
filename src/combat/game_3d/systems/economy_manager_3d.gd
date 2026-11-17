class_name EconomyManager3D
extends Node
## Pengelola ekonomi Gold, skor perolehan, dan statistik eliminasi musuh untuk mode 3D.
##
## [FUNGSI_MODUL]: Menjaga invarian Gold >= 0, memproses transaksi beli/upgrade/jual menara,
##   mencatat skor serta jumlah kill musuh, dan menghitung bonus penyelesaian wave dari
##   `GameConstants3D.get_wave_clear_bonus()`.
## [REFERENSI_KURIKULUM]: GDD Bagian 7 (Economy System) & Bagian 8 (Score Tracking).
## [ARAH_INTERAKSI]: Dipanggil GameController3D; memancarkan sinyal ke GameplayHud3D.

## [FUNGSI]: Dipancarkan setiap kali saldo Gold berubah.
signal gold_changed(new_gold: int)
## [FUNGSI]: Dipancarkan setiap kali total skor berubah.
signal score_changed(new_score: int)
## [FUNGSI]: Dipancarkan setiap kali jumlah musuh yang dikalahkan bertambah atau di-reset.
signal kills_changed(total_kills: int)

var _gold: int = GameConstants3D.STARTING_GOLD
var _score: int = 0
var _enemies_defeated: int = 0


## [FUNGSI]: Mengatur ulang saldo Gold, skor, dan jumlah kill ke kondisi awal match.
## [INPUT/OUTPUT]: starting_gold (int) -> void
func reset(starting_gold: int = GameConstants3D.STARTING_GOLD) -> void:
	_gold = maxi(0, starting_gold)
	_score = 0
	_enemies_defeated = 0
	gold_changed.emit(_gold)
	score_changed.emit(_score)
	kills_changed.emit(_enemies_defeated)


## [FUNGSI]: Mengembalikan saldo Gold pemain saat ini (selalu >= 0).
## [INPUT/OUTPUT]: - -> int
func get_gold() -> int:
	return _gold


## [FUNGSI]: Mengembalikan total skor pemain pada sesi aktif.
## [INPUT/OUTPUT]: - -> int
func get_score() -> int:
	return _score


## [FUNGSI]: Mengembalikan total musuh yang telah dikalahkan pada sesi aktif.
## [INPUT/OUTPUT]: - -> int
func get_enemies_defeated() -> int:
	return _enemies_defeated


## [FUNGSI]: Mengecek apakah saldo Gold mencukupi untuk biaya non-negatif tertentu.
## [INPUT/OUTPUT]: cost (int) -> bool
func can_afford(cost: int) -> bool:
	if cost < 0:
		return false
	return _gold >= cost


## [FUNGSI]: Memotong saldo Gold bila biaya > 0 dan saldo mencukupi; menolak nilai <= 0.
## [INPUT/OUTPUT]: cost (int) -> bool
func try_spend_gold(cost: int) -> bool:
	if cost <= 0 or not can_afford(cost):
		return false
	_gold = maxi(0, _gold - cost)
	gold_changed.emit(_gold)
	return true


## [FUNGSI]: Menambahkan Gold ke saldo pemain (mengabaikan nilai <= 0 agar invarian terjaga).
## [INPUT/OUTPUT]: amount (int) -> void
func add_gold(amount: int) -> void:
	if amount <= 0:
		return
	_gold += amount
	gold_changed.emit(_gold)


## [FUNGSI]: Mencatat eliminasi musuh, menambahkan hadiah Gold, dan memperbarui skor.
## [INPUT/OUTPUT]: reward_gold (int), is_boss (bool) -> void
func record_enemy_kill(reward_gold: int, is_boss: bool) -> void:
	var safe_reward: int = maxi(0, reward_gold)
	_enemies_defeated += 1
	var score_gain: int = safe_reward * (2 if is_boss else 1)
	_score += maxi(10, score_gain)
	add_gold(safe_reward)
	score_changed.emit(_score)
	kills_changed.emit(_enemies_defeated)


## [FUNGSI]: Memberikan bonus Gold penyelesaian wave (50 + floor(0.8 * N * 10)) dan skor.
## [INPUT/OUTPUT]: wave_number (int) -> int
func award_wave_clear(wave_number: int) -> int:
	var bonus: int = GameConstants3D.get_wave_clear_bonus(wave_number)
	add_gold(bonus)
	_score += bonus * 3
	score_changed.emit(_score)
	return bonus
