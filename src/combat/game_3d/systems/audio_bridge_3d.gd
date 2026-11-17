class_name AudioBridge3D
extends Node
## Jembatan pemutaran SFX ke autoload `/root/Sfx` dan pengatur volume/mute bus `Master`.
##
## [FUNGSI_MODUL]: Memanggil `/root/Sfx` secara aman bila tersedia, menghentikan musik
##   menu 2D saat game 3D diinisialisasi, serta mengendalikan volume linear dan mute pada
##   `AudioServer` secara aman di lingkungan headless maupun non-headless.
## [REFERENSI_KURIKULUM]: GDD Bagian 11 (Audio System).
## [ARAH_INTERAKSI]: Dipanggil oleh GameController3D dan panel Settings UI.

## [FUNGSI]: Nama bus audio utama pada konfigurasi AudioServer Godot.
const BUS_MASTER_NAME: StringName = &"Master"
## [FUNGSI]: Nilai dB minimum saat volume linear bernilai 0.0 (menghindari -INF).
const MIN_VOLUME_DB: float = -80.0

var _master_bus_idx: int = 0
var _master_volume: float = 1.0
var _muted: bool = false


## [FUNGSI]: Menginisialisasi indeks bus Master, mode proses selalu aktif, dan menghentikan musik 2D.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	var idx: int = AudioServer.get_bus_index(BUS_MASTER_NAME)
	_master_bus_idx = idx if idx >= 0 else 0
	_master_volume = clampf(db_to_linear(AudioServer.get_bus_volume_db(_master_bus_idx)), 0.0, 1.0)
	_muted = AudioServer.is_bus_mute(_master_bus_idx)
	stop_2d_menu_music_if_active()


## [FUNGSI]: Menghentikan musik latar bawaan 2D dari autoload `/root/Sfx` bila sedang aktif.
## [INPUT/OUTPUT]: - -> void
func stop_2d_menu_music_if_active() -> void:
	var sfx_node: Node = _get_sfx_autoload()
	if sfx_node != null and sfx_node.has_method("hentikan_musik"):
		sfx_node.call("hentikan_musik")


## [FUNGSI]: Memutar efek suara melalui autoload `/root/Sfx` dengan aman pada mode headless.
## [INPUT/OUTPUT]: sfx_name (String) -> void
func play_sfx(sfx_name: String) -> void:
	if sfx_name.is_empty() or _is_headless():
		return
	var sfx_node: Node = _get_sfx_autoload()
	if sfx_node == null:
		return
	if sfx_node.has_method("play_sfx"):
		sfx_node.call("play_sfx", sfx_name)
	elif sfx_node.has_method("play"):
		sfx_node.call("play", sfx_name)


## [FUNGSI]: Mengatur volume bus Master pada rentang linear [0.0, 1.0] menggunakan `linear_to_db`.
## [INPUT/OUTPUT]: volume_linear (float) -> void
func set_master_volume(volume_linear: float) -> void:
	_master_volume = clampf(volume_linear, 0.0, 1.0)
	var db: float = linear_to_db(_master_volume) if _master_volume > 0.0 else MIN_VOLUME_DB
	AudioServer.set_bus_volume_db(_master_bus_idx, db)


## [FUNGSI]: Mengembalikan nilai volume bus Master saat ini dalam skala linear [0.0, 1.0].
## [INPUT/OUTPUT]: - -> float
func get_master_volume() -> float:
	if not _is_headless():
		var bus_linear: float = db_to_linear(AudioServer.get_bus_volume_db(_master_bus_idx))
		if _master_volume <= 0.0 and bus_linear <= 0.001:
			return 0.0
		return clampf(bus_linear, 0.0, 1.0)
	return _master_volume


## [FUNGSI]: Mengaktifkan atau menonaktifkan status mute pada bus Master.
## [INPUT/OUTPUT]: muted (bool) -> void
func set_muted(muted: bool) -> void:
	_muted = muted
	AudioServer.set_bus_mute(_master_bus_idx, _muted)


## [FUNGSI]: Mengembalikan true jika bus Master sedang berada dalam kondisi mute.
## [INPUT/OUTPUT]: - -> bool
func is_muted() -> bool:
	if not _is_headless():
		return AudioServer.is_bus_mute(_master_bus_idx)
	return _muted


## [FUNGSI]: Mengambil node autoload `/root/Sfx` secara aman menggunakan `has_node`.
## [INPUT/OUTPUT]: - -> Node
func _get_sfx_autoload() -> Node:
	var tree: SceneTree = get_tree() if is_inside_tree() else (Engine.get_main_loop() as SceneTree)
	if tree == null or tree.root == null:
		return null
	if tree.root.has_node("Sfx"):
		return tree.root.get_node("Sfx")
	return null


## [FUNGSI]: Mengembalikan true bila aplikasi berjalan di display driver headless.
## [INPUT/OUTPUT]: - -> bool
func _is_headless() -> bool:
	return DisplayServer.get_name() == "headless"
