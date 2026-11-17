class_name CombatTargetComponent
extends Node3D
## Komponen penerima serangan (HP, armor, slow) yang ditempel sebagai child node pada musuh.
##
## [FUNGSI_MODUL]: Adapter antara musuh milik modul Abiyu dan sistem combat Yusuf. Musuh cukup
##   menambahkan node ini, mengisi `combat_data`, meng-update `path_progress` tiap frame, dan
##   mendengarkan sinyal di bawah. Komponen tidak pernah memanggil `get_parent()` (Signal Up).
## [REFERENSI_KURIKULUM]: GDD 4.4 & 6 (damage, armor, slow); Guha Bab 11 (visual kristal Phong).
## [ARAH_INTERAKSI_KODE]:
##   - Dibaca/dipanggil: `TargetSelector`, `Tower3D` (laser hit), `Projectile3D` (proyektil/AoE).
##   - Sinyal keluar: `target_defeated` -> Economy Nur & Wave Abiyu; `speed_multiplier_changed`
##     -> skrip gerak musuh Abiyu (`MockEnemy3D` di sandbox); `health_changed` -> UI HP bar.

## [FUNGSI]: Dipancarkan setiap HP berubah (untuk HP bar UI).
signal health_changed(current_hp: float, max_hp: float)
## [FUNGSI]: Dipancarkan sekali saat HP mencapai 0 (reward Gold + posisi untuk VFX/SFX).
signal target_defeated(reward_gold: int, world_position: Vector3)
## [FUNGSI]: Dipancarkan saat pengali kecepatan berubah (0.6 saat Freeze, 1.0 saat pulih).
signal speed_multiplier_changed(multiplier: float)

## [FUNGSI]: Nama grup Godot tempat menara mencari kandidat target.
const GROUP_NAME: StringName = &"combat_targets"
## [FUNGSI]: Jumlah kristal es yang mengelilingi musuh saat terkena slow.
const FROST_CRYSTAL_COUNT: int = 5

## [FUNGSI]: Data combat musuh (HP dasar, armor, speed, reward) dari `resources/presets/`.
@export var combat_data: EnemyCombatData
## [FUNGSI]: Nomor wave untuk scaling HP (`CombatMath.calculate_enemy_wave_hp()`).
@export var wave_number: int = 1
## [FUNGSI]: Radius lingkaran kristal es (meter), disesuaikan dengan ukuran badan musuh.
@export var frost_radius: float = 0.5

## [FUNGSI]: Jarak tempuh di jalur; di-update pemilik musuh tiap frame (mode FRONT_MOST).
var path_progress: float = 0.0
## [FUNGSI]: HP maksimum setelah scaling wave.
var max_hp: float = 0.0
## [FUNGSI]: HP saat ini (0 = mati).
var current_hp: float = 0.0

var _slow_multiplier: float = 1.0
var _slow_remaining: float = 0.0
var _frost_visual: Node3D = null


## [FUNGSI]: Mendaftarkan diri ke grup target agar terlihat oleh semua menara.
## [INPUT/OUTPUT]: - -> void
func _enter_tree() -> void:
	if is_alive() or max_hp <= 0.0:
		add_to_group(GROUP_NAME)


## [FUNGSI]: Inisialisasi HP otomatis jika pemilik belum memanggil `initialize_for_wave()`.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	if max_hp <= 0.0 and combat_data != null:
		initialize_for_wave(wave_number)


## [FUNGSI]: Menjalankan timer efek (slow) setiap frame.
## [INPUT/OUTPUT]: delta (float) -> void
func _process(delta: float) -> void:
	tick_effects(delta)


## [FUNGSI]: Mengisi HP penuh sesuai scaling wave ke-N.
## [INPUT/OUTPUT]: wave (int) -> void
## [ARAH_INTERAKSI]: Dipanggil Wave Spawner Abiyu / `MockEnemy3D.setup()`; memanggil `CombatMath`.
func initialize_for_wave(wave: int) -> void:
	wave_number = wave
	max_hp = float(CombatMath.calculate_enemy_wave_hp(combat_data.base_hp, wave))
	current_hp = max_hp
	health_changed.emit(current_hp, max_hp)


## [FUNGSI]: True selama HP > 0.
## [INPUT/OUTPUT]: - -> bool
func is_alive() -> bool:
	return current_hp > 0.0


## [FUNGSI]: Menerima satu serangan: kurangi HP (setelah armor), terapkan slow, cek kematian.
## [INPUT/OUTPUT]: raw_damage, ignore_armor, slow_ratio, slow_duration -> float (damage masuk)
## [REFERENSI_KURIKULUM]: GDD 4.4 (damage), 5 (Freeze slow & Armor Pen).
## [ARAH_INTERAKSI]: Dipanggil `Tower3D._fire()` & `Projectile3D._impact()`; emit sinyal di atas.
func apply_combat_hit(
	raw_damage: float,
	ignore_armor: bool,
	slow_ratio: float,
	slow_duration: float
) -> float:
	if not is_alive():
		return 0.0
	var damage: float = CombatMath.calculate_final_damage(raw_damage, combat_data.armor, ignore_armor)
	current_hp = maxf(0.0, current_hp - damage)
	health_changed.emit(current_hp, max_hp)
	if is_alive():
		if slow_ratio > 0.0:
			_apply_slow(slow_ratio, slow_duration)
	else:
		remove_from_group(GROUP_NAME)
		target_defeated.emit(combat_data.gold_reward, global_position)
	return damage


## [FUNGSI]: Mengurangi sisa durasi slow; pulihkan kecepatan saat habis.
## [INPUT/OUTPUT]: delta (float) -> void
## [ARAH_INTERAKSI]: Dipanggil `_process()`; dapat dipanggil langsung oleh test.
func tick_effects(delta: float) -> void:
	if _slow_remaining <= 0.0:
		return
	_slow_remaining -= delta
	if _slow_remaining <= 0.0:
		_set_speed_multiplier(1.0)


## [FUNGSI]: Pengali kecepatan saat ini (1.0 normal, 0.6 saat Freeze).
## [INPUT/OUTPUT]: - -> float
func get_speed_multiplier() -> float:
	return _slow_multiplier


## [FUNGSI]: Kecepatan efektif dalam m/s = speed_gdd * UNIT_SCALE * pengali slow.
## [INPUT/OUTPUT]: - -> float
## [ARAH_INTERAKSI]: Dibaca skrip gerak musuh (Abiyu / `MockEnemy3D._process()`).
func get_effective_speed_mps() -> float:
	return combat_data.speed_gdd * CombatMath.UNIT_SCALE * _slow_multiplier


## [FUNGSI]: Slow tidak menumpuk: pakai pengali terkecil dan refresh durasi terpanjang.
## [INPUT/OUTPUT]: ratio (float 0..0.9), duration (float) -> void
func _apply_slow(ratio: float, duration: float) -> void:
	_slow_remaining = maxf(_slow_remaining, duration)
	_set_speed_multiplier(minf(_slow_multiplier, 1.0 - clampf(ratio, 0.0, 0.9)))


## [FUNGSI]: Set pengali kecepatan, emit sinyal, dan tampil/sembunyikan kristal es.
## [INPUT/OUTPUT]: multiplier (float) -> void
func _set_speed_multiplier(multiplier: float) -> void:
	if is_equal_approx(multiplier, _slow_multiplier):
		return
	_slow_multiplier = multiplier
	speed_multiplier_changed.emit(multiplier)
	if _frost_visual == null:
		_frost_visual = _build_frost_visual()
		add_child(_frost_visual)
	_frost_visual.visible = multiplier < 1.0


## [FUNGSI]: Membangun cincin kristal es (PrismMesh + shader Blinn-Phong) di kaki musuh.
## [INPUT/OUTPUT]: - -> Node3D
## [REFERENSI_KURIKULUM]: Guha Bab 10 (modeling hierarkis), Bab 11 (Color & Light).
func _build_frost_visual() -> Node3D:
	var root := Node3D.new()
	root.name = "FrostCrystals"
	var material: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.6, 0.85, 1.0))
	for i: int in range(FROST_CRYSTAL_COUNT):
		var angle: float = TAU * float(i) / float(FROST_CRYSTAL_COUNT)
		var crystal := MeshInstance3D.new()
		var prism := PrismMesh.new()
		prism.size = Vector3(0.18, 0.45, 0.18)
		crystal.mesh = prism
		crystal.material_override = material
		crystal.position = Vector3(cos(angle), 0.0, sin(angle)) * frost_radius + Vector3(0.0, 0.22, 0.0)
		root.add_child(crystal)
	return root
