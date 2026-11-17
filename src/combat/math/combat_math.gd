class_name CombatMath
extends RefCounted
## Kumpulan fungsi matematika murni (pure static) untuk grafika 3D dan kalkulasi combat.
##
## [FUNGSI_MODUL]: Jarak Euclidean 3D, konversi skala World Coordinates, Basis rotasi turret,
##   reduksi armor, scaling level menara / HP wave, biaya upgrade, dan refund sell.
## [REFERENSI_KURIKULUM]: Guha Bab 2 (World Coordinates), Bab 4-5 (Transformation & Basis);
##   RPS CIF65116 CPMK-1 (model matematis simulasi real-time).
## [ARAH_INTERAKSI_KODE]: Dipanggil oleh `Tower3D`, `TargetSelector`, `Projectile3D`,
##   `CombatTargetComponent`, dan `tests/combat/test_combat_system.gd`. Tanpa akses SceneTree.

## [FUNGSI]: Faktor kalibrasi satuan GDD (px/unit) -> meter World Coordinates 3D Godot.
## [ARAH_INTERAKSI]: Dipakai `get_scaled_range_meters()`, `CombatTargetComponent`, `Projectile3D`.
const UNIT_SCALE: float = 0.1

## [FUNGSI]: Level maksimum menara (GDD Bagian 4.5).
## [ARAH_INTERAKSI]: Dipakai fungsi scaling di file ini dan `Tower3D.can_upgrade()`.
const MAX_TOWER_LEVEL: int = 3


## [FUNGSI]: Jarak Euclidean 3D d = sqrt(dx^2 + dy^2 + dz^2).
## [INPUT/OUTPUT]: a (Vector3), b (Vector3) -> float (meter)
## [REFERENSI_KURIKULUM]: Guha Bab 2 (World Coordinates); GDD Bagian 4.2 & 10.6.
## [ARAH_INTERAKSI]: Dipanggil `is_in_range_3d()`, `TargetSelector._score()`.
static func distance_3d(a: Vector3, b: Vector3) -> float:
	var dx: float = b.x - a.x
	var dy: float = b.y - a.y
	var dz: float = b.z - a.z
	return sqrt(dx * dx + dy * dy + dz * dz)


## [FUNGSI]: True jika enemy_pos berada di dalam radius jangkauan (inklusif batas).
## [INPUT/OUTPUT]: tower_pos (Vector3), enemy_pos (Vector3), range_meters (float) -> bool
## [REFERENSI_KURIKULUM]: GDD Bagian 10.6 (Perhitungan Jarak dan Jangkauan).
## [ARAH_INTERAKSI]: Dipanggil `TargetSelector.select_target()` & `Projectile3D._hit_area()`.
static func is_in_range_3d(tower_pos: Vector3, enemy_pos: Vector3, range_meters: float) -> bool:
	return distance_3d(tower_pos, enemy_pos) <= maxf(0.0, range_meters)


## [FUNGSI]: Damage menara per level: base * (1 + 0.25 * (L - 1)), L di-clamp ke 1..3.
## [INPUT/OUTPUT]: base_damage (float), level (int) -> float
## [REFERENSI_KURIKULUM]: GDD Bagian 5 (Spesifikasi Peningkatan).
## [ARAH_INTERAKSI]: Dipanggil `Tower3D.get_current_damage()`.
static func get_scaled_damage(base_damage: float, level: int) -> float:
	var clamped_level: int = clampi(level, 1, MAX_TOWER_LEVEL)
	return base_damage * (1.0 + 0.25 * float(clamped_level - 1))


## [FUNGSI]: Range meter per level: base_gdd * UNIT_SCALE * (1 + 0.10 * (L - 1)).
## [INPUT/OUTPUT]: base_range_gdd (float), level (int) -> float (meter)
## [REFERENSI_KURIKULUM]: GDD Bagian 5; Guha Bab 2 (penskalaan World Coordinates).
## [ARAH_INTERAKSI]: Dipanggil `Tower3D.get_current_range_meters()`.
static func get_scaled_range_meters(base_range_gdd: float, level: int) -> float:
	var clamped_level: int = clampi(level, 1, MAX_TOWER_LEVEL)
	var base_meters: float = maxf(0.0, base_range_gdd) * UNIT_SCALE
	return base_meters * (1.0 + 0.10 * float(clamped_level - 1))


## [FUNGSI]: Flat armor reduction max(1.0, raw - armor); armor = 0 jika ignore_armor.
## [INPUT/OUTPUT]: raw_damage (float), target_armor (float), ignore_armor (bool) -> float
## [REFERENSI_KURIKULUM]: GDD Bagian 4.4, 5, 6 (Armor Pen mengabaikan 100% armor).
## [ARAH_INTERAKSI]: Dipanggil `CombatTargetComponent.apply_combat_hit()`.
static func calculate_final_damage(
	raw_damage: float,
	target_armor: float,
	ignore_armor: bool
) -> float:
	var effective_armor: float = 0.0 if ignore_armor else maxf(0.0, target_armor)
	return maxf(1.0, raw_damage - effective_armor)


## [FUNGSI]: HP musuh pada wave N: ceil(base_hp * 1.25^(N - 1)), N minimal 1.
## [INPUT/OUTPUT]: base_hp (int), wave_number (int) -> int
## [REFERENSI_KURIKULUM]: GDD Bagian 6 (Scaling HP per Wave).
## [ARAH_INTERAKSI]: Dipanggil `CombatTargetComponent.initialize_for_wave()`.
static func calculate_enemy_wave_hp(base_hp: int, wave_number: int) -> int:
	var safe_wave: int = maxi(1, wave_number)
	var multiplier: float = pow(1.25, float(safe_wave - 1))
	return int(ceil(float(maxi(1, base_hp)) * multiplier))


## [FUNGSI]: Biaya naik level: ceil(base_cost * 1.5^level); 0 jika sudah level maksimum.
## [INPUT/OUTPUT]: base_cost (int), current_level (int) -> int (Gold)
## [REFERENSI_KURIKULUM]: GDD Bagian 4.5 (Upgrade & Sell).
## [ARAH_INTERAKSI]: Dipanggil `Tower3D.get_next_upgrade_cost()` (dibaca Economy Nur & UI Zulfan).
static func calculate_upgrade_cost(base_cost: int, current_level: int) -> int:
	if current_level >= MAX_TOWER_LEVEL:
		return 0
	var safe_level: int = maxi(1, current_level)
	return int(ceil(float(maxi(0, base_cost)) * pow(1.5, float(safe_level))))


## [FUNGSI]: Refund penjualan menara: floor(total_invested * 0.7), tidak pernah negatif.
## [INPUT/OUTPUT]: total_invested (int) -> int (Gold)
## [REFERENSI_KURIKULUM]: GDD Bagian 4.5 & 8 (Ketentuan Ekonomi).
## [ARAH_INTERAKSI]: Dipanggil `Tower3D.get_sell_refund_gold()` (dibaca Economy Nur).
static func calculate_sell_refund(total_invested: int) -> int:
	return int(floor(float(maxi(0, total_invested)) * 0.7))


## [FUNGSI]: Basis ortonormal 3x3 agar sumbu depan (-Z) turret menghadap target di bidang XZ.
## [INPUT/OUTPUT]: turret_pos (Vector3), target_pos (Vector3) -> Basis
## [REFERENSI_KURIKULUM]: Guha Bab 4-5 (matriks rotasi, orthonormal basis, look-at).
## [ARAH_INTERAKSI]: Dipanggil `Tower3D._aim_at()` setiap frame saat ada target.
static func compute_turret_look_basis(turret_pos: Vector3, target_pos: Vector3) -> Basis:
	var flat_dir := Vector3(target_pos.x - turret_pos.x, 0.0, target_pos.z - turret_pos.z)
	if flat_dir.length_squared() < 0.000001:
		return Basis.IDENTITY
	return Basis.looking_at(flat_dir.normalized(), Vector3.UP)
