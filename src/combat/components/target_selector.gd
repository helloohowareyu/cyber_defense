class_name TargetSelector
extends RefCounted
## Logika murni pemilihan target menara: FRONT_MOST, LOWEST_HP, CLOSEST.
##
## [REFERENSI_KURIKULUM]: GDD Bagian 4.4 (mode targeting); Guha Bab 2 (jarak di World Coordinates).
## [ARAH_INTERAKSI_KODE]: Dipanggil `Tower3D.update_combat()`; membaca `CombatTargetComponent`
##   dan `CombatMath`. Mode diubah UI Zulfan lewat `Tower3D.set_targeting_mode()`.

## [FUNGSI]: Mode targeting menara (GDD 4.4).
enum Mode { FRONT_MOST, LOWEST_HP, CLOSEST }


## [FUNGSI]: Memilih kandidat hidup dalam jangkauan dengan skor tertinggi sesuai mode.
## [INPUT/OUTPUT]: tower_pos, range_meters, candidates, mode -> CombatTargetComponent (atau null)
## [ARAH_INTERAKSI]: Dipanggil `Tower3D.update_combat()` setiap frame.
static func select_target(
	tower_pos: Vector3,
	range_meters: float,
	candidates: Array[CombatTargetComponent],
	mode: Mode
) -> CombatTargetComponent:
	var best: CombatTargetComponent = null
	var best_score: float = -INF
	for candidate: CombatTargetComponent in candidates:
		if candidate == null or not candidate.is_alive():
			continue
		if not CombatMath.is_in_range_3d(tower_pos, candidate.global_position, range_meters):
			continue
		var score: float = _score(candidate, tower_pos, mode)
		if score > best_score:
			best = candidate
			best_score = score
	return best


## [FUNGSI]: Skor kandidat; semakin besar semakin diprioritaskan.
## [INPUT/OUTPUT]: candidate, tower_pos, mode -> float
static func _score(candidate: CombatTargetComponent, tower_pos: Vector3, mode: Mode) -> float:
	match mode:
		Mode.FRONT_MOST:
			return candidate.path_progress
		Mode.LOWEST_HP:
			return -candidate.current_hp
		_:
			return -CombatMath.distance_3d(tower_pos, candidate.global_position)
