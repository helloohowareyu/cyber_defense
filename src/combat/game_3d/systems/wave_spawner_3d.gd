class_name WaveSpawner3D
extends Node
## Pengendali gelombang serangan musuh (Wave 1-5) dengan gating manual dan antrean spawn.
##
## [FUNGSI_MODUL]: Membaca komposisi Tabel 7 GDD dari `GameConstants3D`, menjadwalkan spawn
##   bertahap per interval, melacak jumlah musuh aktif, dan memancarkan `wave_cleared` /
##   `all_waves_cleared` tepat saat seluruh musuh wave terakhir selesai ditangani.
## [REFERENSI_KURIKULUM]: GDD Bagian 6 & 7 (Wave Progression & Enemy Spawn Composition).
## [ARAH_INTERAKSI]: Diorkestrasikan oleh GameController3D; memancarkan sinyal ke controller & HUD.

## [FUNGSI]: Dipancarkan saat gelombang serangan ke-N dimulai.
signal wave_started(wave_number: int)
## [FUNGSI]: Dipancarkan saat spawner meminta GameController3D memunculkan satu musuh.
signal enemy_spawn_requested(enemy_id: String, wave_number: int)
## [FUNGSI]: Dipancarkan saat Boss Demon King muncul pada wave terkait.
signal boss_spawned(wave_number: int)
## [FUNGSI]: Dipancarkan saat seluruh musuh dalam wave ke-N telah mati atau mencapai Core.
signal wave_cleared(wave_number: int)
## [FUNGSI]: Dipancarkan setelah Wave terakhir (`TOTAL_WAVES`) selesai dibersihkan.
signal all_waves_cleared()

## [FUNGSI]: Jeda waktu antar spawn musuh berturut-turut dalam satu wave (detik).
const DEFAULT_SPAWN_INTERVAL: float = 0.8

var _current_wave: int = 0
var _wave_in_progress: bool = false
var _spawn_queue: Array[String] = []
var _spawn_timer: float = 0.0
var _spawn_interval: float = DEFAULT_SPAWN_INTERVAL
var _active_enemies_count: int = 0


## [FUNGSI]: Memajukan pewaktu antrean spawn setiap frame saat node berada di dalam SceneTree.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	if is_inside_tree():
		tick(delta)


## [FUNGSI]: Mengatur ulang seluruh state spawner ke Wave 0 dan mengosongkan antrean spawn.
## [INPUT/OUTPUT]: - -> void
func reset() -> void:
	_current_wave = 0
	_wave_in_progress = false
	_spawn_queue.clear()
	_spawn_timer = 0.0
	_spawn_interval = DEFAULT_SPAWN_INTERVAL
	_active_enemies_count = 0


## [FUNGSI]: Mengembalikan true jika wave berikutnya boleh dimulai secara manual oleh pemain.
## [INPUT/OUTPUT]: - -> bool
func can_start_wave() -> bool:
	return (
		not _wave_in_progress
		and _spawn_queue.is_empty()
		and _active_enemies_count == 0
		and _current_wave < GameConstants3D.TOTAL_WAVES
	)


## [FUNGSI]: Memulai gelombang serangan berikutnya dan mengisi antrean musuh sesuai Tabel 7 GDD.
## [INPUT/OUTPUT]: - -> bool
func start_next_wave() -> bool:
	if not can_start_wave():
		return false

	_current_wave += 1
	_wave_in_progress = true
	_spawn_timer = 0.0
	_spawn_queue.clear()

	var comps: Array[Dictionary] = GameConstants3D.get_wave_composition(_current_wave)
	for comp: Dictionary in comps:
		var enemy_id: String = str(comp.get("enemy_id", ""))
		var count: int = int(comp.get("count", 0))
		if enemy_id.is_empty() or count <= 0:
			continue
		for _i: int in range(count):
			_spawn_queue.append(enemy_id)

	wave_started.emit(_current_wave)
	return true


## [FUNGSI]: Mengembalikan nomor wave saat ini (0 sebelum dimulai, 1..5 saat bermain).
## [INPUT/OUTPUT]: - -> int
func get_current_wave() -> int:
	return _current_wave


## [FUNGSI]: Mengembalikan true selama wave masih melakukan spawn atau masih ada musuh aktif.
## [INPUT/OUTPUT]: - -> bool
func is_wave_in_progress() -> bool:
	return _wave_in_progress


## [FUNGSI]: Mengembalikan jumlah musuh yang masih aktif di arena untuk wave berjalan.
## [INPUT/OUTPUT]: - -> int
func get_active_enemies_count() -> int:
	return _active_enemies_count


## [FUNGSI]: Memberitahukan spawner bahwa satu musuh telah gugur atau lolos ke Energy Core.
## [INPUT/OUTPUT]: - -> void
func notify_enemy_removed() -> void:
	_active_enemies_count = maxi(0, _active_enemies_count - 1)
	if _wave_in_progress and _spawn_queue.is_empty() and _active_enemies_count == 0:
		_wave_in_progress = false
		wave_cleared.emit(_current_wave)
		if _current_wave >= GameConstants3D.TOTAL_WAVES:
			all_waves_cleared.emit()


## [FUNGSI]: Memajukan pewaktu spawn dan memancarkan permintaan spawn musuh berikutnya.
## [INPUT/OUTPUT]: delta (float) -> void
func tick(delta: float) -> void:
	if not _wave_in_progress or _spawn_queue.is_empty():
		return

	_spawn_timer -= maxf(0.0, delta)
	if _spawn_timer <= 0.0:
		_spawn_timer = _spawn_interval
		var enemy_id: String = _spawn_queue.pop_front()
		_active_enemies_count += 1
		enemy_spawn_requested.emit(enemy_id, _current_wave)
		if enemy_id == "demon_king":
			boss_spawned.emit(_current_wave)
