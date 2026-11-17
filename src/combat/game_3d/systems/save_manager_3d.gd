class_name SaveManager3D
extends RefCounted
## Pengelola persistensi lokal profil pemain dan pengaturan audio berbasis ConfigFile.
##
## [FUNGSI_MODUL]: Menyimpan dan memuat `high_score`, `highest_wave`,
##   `total_enemies_defeated`, `wins`, serta `master_volume` dan `muted`
##   pada berkas `user://cyber_defense_3d_save.cfg` (atau path khusus untuk pengujian).
## [REFERENSI_KURIKULUM]: GDD Bagian 12 (Data Persistence) & Bagian 16 #15.
## [ARAH_INTERAKSI]: Dipanggil secara statis oleh GameController3D, MainMenu3D, dan Overlays3D.

## [FUNGSI]: Nama seksi ConfigFile untuk statistik pencapaian permainan.
const SECTION_STATS: String = "stats"
## [FUNGSI]: Nama seksi ConfigFile untuk preferensi volume dan mute audio.
const SECTION_AUDIO: String = "audio"


## [FUNGSI]: Memuat seluruh data simpanan dari disk; mengembalikan nilai default jika belum ada.
## [INPUT/OUTPUT]: path (String) -> Dictionary
static func load_data(path: String = GameConstants3D.SAVE_FILE_PATH) -> Dictionary:
	var result: Dictionary = {
		"high_score": 0,
		"highest_wave": 0,
		"total_enemies_defeated": 0,
		"wins": 0,
		"master_volume": 1.0,
		"muted": false,
	}

	var config := ConfigFile.new()
	if config.load(path) != OK:
		return result

	result["high_score"] = maxi(0, int(config.get_value(SECTION_STATS, "high_score", 0)))
	result["highest_wave"] = maxi(0, int(config.get_value(SECTION_STATS, "highest_wave", 0)))
	var stored_kills: int = int(config.get_value(
		SECTION_STATS,
		"total_enemies_defeated",
		config.get_value(SECTION_STATS, "total_kills", 0)
	))
	result["total_enemies_defeated"] = maxi(0, stored_kills)
	result["wins"] = maxi(0, int(config.get_value(SECTION_STATS, "wins", 0)))
	result["master_volume"] = clampf(
		float(config.get_value(SECTION_AUDIO, "master_volume", 1.0)),
		0.0,
		1.0
	)
	result["muted"] = bool(config.get_value(SECTION_AUDIO, "muted", false))
	return result


## [FUNGSI]: Menyimpan hasil match dengan menjaga rekor maksimum dan akumulasi kill/kemenangan.
## [INPUT/OUTPUT]: score (int), wave_reached (int), kills (int), won (bool), path (String) -> void
static func save_run_result(
	score: int,
	wave_reached: int,
	kills: int,
	won: bool,
	path: String = GameConstants3D.SAVE_FILE_PATH
) -> void:
	var existing: Dictionary = load_data(path)
	var config := ConfigFile.new()
	var _load_err: Error = config.load(path)

	var new_high_score: int = maxi(int(existing.get("high_score", 0)), maxi(0, score))
	var new_highest_wave: int = maxi(int(existing.get("highest_wave", 0)), maxi(0, wave_reached))
	var new_total_defeated: int = int(existing.get("total_enemies_defeated", 0)) + maxi(0, kills)
	var new_wins: int = int(existing.get("wins", 0)) + (1 if won else 0)

	config.set_value(SECTION_STATS, "high_score", new_high_score)
	config.set_value(SECTION_STATS, "highest_wave", new_highest_wave)
	config.set_value(SECTION_STATS, "total_enemies_defeated", new_total_defeated)
	config.set_value(SECTION_STATS, "wins", new_wins)

	if not config.has_section(SECTION_AUDIO):
		config.set_value(SECTION_AUDIO, "master_volume", float(existing.get("master_volume", 1.0)))
		config.set_value(SECTION_AUDIO, "muted", bool(existing.get("muted", false)))

	var save_err: Error = config.save(path)
	if save_err != OK:
		push_warning("SaveManager3D: gagal menyimpan run result ke %s (err=%d)" % [path, save_err])


## [FUNGSI]: Menyimpan preferensi volume linear [0.0..1.0] dan status mute ke ConfigFile.
## [INPUT/OUTPUT]: volume_linear (float), muted (bool), path (String) -> void
static func save_audio_settings(
	volume_linear: float,
	muted: bool,
	path: String = GameConstants3D.SAVE_FILE_PATH
) -> void:
	var existing: Dictionary = load_data(path)
	var config := ConfigFile.new()
	var _load_err: Error = config.load(path)

	if not config.has_section(SECTION_STATS):
		config.set_value(SECTION_STATS, "high_score", int(existing.get("high_score", 0)))
		config.set_value(SECTION_STATS, "highest_wave", int(existing.get("highest_wave", 0)))
		config.set_value(
			SECTION_STATS,
			"total_enemies_defeated",
			int(existing.get("total_enemies_defeated", 0))
		)
		config.set_value(SECTION_STATS, "wins", int(existing.get("wins", 0)))

	config.set_value(SECTION_AUDIO, "master_volume", clampf(volume_linear, 0.0, 1.0))
	config.set_value(SECTION_AUDIO, "muted", muted)

	var save_err: Error = config.save(path)
	if save_err != OK:
		push_warning("SaveManager3D: gagal menyimpan audio settings ke %s (err=%d)" % [path, save_err])
