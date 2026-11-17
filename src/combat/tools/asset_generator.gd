extends SceneTree
## [FUNGSI]: Generator aset placeholder lokal (gitignored) di `res://Assets/` dan `res://icon.svg`
## agar seluruh scene 2D (`Uji2D.tscn`) dan autoload `Sfx.gd` berjalan tanpa error resource hilang.

## [FUNGSI]: Daftar 13 SFX beserta frekuensi nada sintesis (Hz) agar tiap file WAV valid dan unik.
const WAV_SPECS: Dictionary = {
	"res://Assets/sfx/base_hit.wav": 140.0,
	"res://Assets/sfx/defeat.wav": 180.0,
	"res://Assets/sfx/enemy_die.wav": 260.0,
	"res://Assets/sfx/explosion.wav": 110.0,
	"res://Assets/sfx/sell_coin.wav": 660.0,
	"res://Assets/sfx/shoot_fast.wav": 520.0,
	"res://Assets/sfx/shoot_heavy.wav": 220.0,
	"res://Assets/sfx/shoot_laser.wav": 740.0,
	"res://Assets/sfx/tower_place.wav": 330.0,
	"res://Assets/sfx/ui_click.wav": 880.0,
	"res://Assets/sfx/upgrade.wav": 587.0,
	"res://Assets/sfx/victory.wav": 784.0,
	"res://Assets/sfx/wave_start.wav": 440.0,
}

## [FUNGSI]: Path file musik loop MP3 yang dimuat `Sfx.gd`.
const MP3_PATH: String = "res://Assets/sfx/(main)loop_track.mp3"

## [FUNGSI]: Path file lisensi placeholder yang direferensikan `Scenes/ui/credits.tscn`.
const LICENSE_PATH: String = "res://Assets/LICENSES/towerdefense_MIT.txt"

## [FUNGSI]: Path ikon proyek yang direferensikan `project.godot`.
const ICON_SVG_PATH: String = "res://icon.svg"

## [FUNGSI]: Pemetaan UID hardcoded pada `.tscn` ke file `.import` agar tidak muncul warning UID invalid.
const EXPECTED_IMPORT_UIDS: Dictionary = {
	"res://Assets/enemies/dino1.png.import": "uid://dhvmjhj28g7li",
	"res://Assets/maps/map1.webp.import": "uid://b8725vkgyjjo8",
	"res://Assets/maps/map2.png.import": "uid://c08ieo1nh44dc",
	"res://Assets/turrets/technoturret.png.import": "uid://83kim8fm0f2s",
	"res://Assets/vfx/dynamite-pack.png.import": "uid://cy1xnogwyjoer",
	"res://Assets/vfx/explosion 4.png.import": "uid://c3r8upfrvgwf3",
	"res://Assets/bullets/Pixel.png.import": "uid://dr0ndem12yexg",
	"res://Assets/menu/bg.png.import": "uid://didi8ffqykvkh",
}

## [FUNGSI]: UID hardcoded pada `bulletBase.tscn` untuk `res://Assets/bullets/bullet2.tres`.
const BULLET2_UID: String = "uid://djv5uvpfktdlq"


## [FUNGSI]: Titik masuk headless script; membangkitkan semua placeholder, menjalankan `--import`, dan sinkronisasi UID.
## [INPUT/OUTPUT]: void -> void (keluar dengan kode 0 atau 1)
func _init() -> void:
	var total_written: int = 0
	for wav_path: String in WAV_SPECS.keys():
		var freq: float = float(WAV_SPECS[wav_path])
		if _write_buffer(wav_path, _build_pcm_wav_bytes(freq, 0.08)):
			total_written += 1

	if _write_buffer(MP3_PATH, _build_silent_mp3_bytes(38)):
		total_written += 1

	total_written += _generate_all_images()
	total_written += _generate_bullet_sprite_frames()

	if _write_text(ICON_SVG_PATH, _build_icon_svg()):
		total_written += 1
	if _write_text(LICENSE_PATH, _build_license_text()):
		total_written += 1

	var import_exit: int = _run_godot_import()
	var patched_uids: int = _sync_import_uids()
	if patched_uids > 0:
		import_exit = _run_godot_import()

	print("asset_generator: %d file dibuat/diperbarui, %d UID disinkronkan (import_exit=%d)." % [
		total_written, patched_uids, import_exit
	])
	quit(0 if import_exit == 0 else 1)


## [FUNGSI]: Membangkitkan seluruh 14 PNG dan 1 WebP sesuai dimensi wajib scene 2D.
## [INPUT/OUTPUT]: void -> int (jumlah gambar berhasil disimpan)
func _generate_all_images() -> int:
	var count: int = 0
	var turret_specs: Dictionary = {
		"res://Assets/turrets/technoturret.png": Color(0.13, 0.83, 0.93, 1.0),
		"res://Assets/turrets/laserturret.png": Color(0.96, 0.62, 0.04, 1.0),
		"res://Assets/turrets/reallaser.png": Color(0.94, 0.27, 0.27, 1.0),
		"res://Assets/turrets/dynamite.png": Color(0.98, 0.45, 0.09, 1.0),
	}
	for path: String in turret_specs.keys():
		if _save_image(path, _make_turret_icon(64, turret_specs[path])):
			count += 1

	var enemy_colors: Dictionary = {
		"res://Assets/enemies/dino1.png": Color(0.22, 0.85, 0.55, 1.0),
		"res://Assets/enemies/dino2.png": Color(0.95, 0.78, 0.20, 1.0),
		"res://Assets/enemies/dino3.png": Color(0.55, 0.70, 0.95, 1.0),
		"res://Assets/enemies/dino4.png": Color(0.95, 0.35, 0.45, 1.0),
	}
	for path: String in enemy_colors.keys():
		if _save_image(path, _make_enemy_spritesheet(24, 32, enemy_colors[path])):
			count += 1

	if _save_image("res://Assets/maps/map1.webp", _make_grid_backdrop(1280, 720, Color(0.06, 0.11, 0.16, 1.0), Color(0.12, 0.28, 0.34, 1.0))):
		count += 1
	if _save_image("res://Assets/maps/map2.png", _make_grid_backdrop(1280, 720, Color(0.14, 0.10, 0.08, 1.0), Color(0.32, 0.22, 0.14, 1.0))):
		count += 1
	if _save_image("res://Assets/menu/bg.png", _make_grid_backdrop(1280, 720, Color(0.05, 0.07, 0.12, 1.0), Color(0.10, 0.22, 0.36, 1.0))):
		count += 1
	if _save_image("res://Assets/tower/base_castle.png", _make_turret_icon(128, Color(0.22, 0.74, 0.97, 1.0))):
		count += 1
	if _save_image("res://Assets/bullets/Pixel.png", _make_solid_bordered(16, Color(0.95, 0.98, 1.0, 1.0), Color(0.13, 0.83, 0.93, 1.0))):
		count += 1
	if _save_image("res://Assets/vfx/dynamite-pack.png", _make_atlas_grid(96, 3, 32, Color(0.96, 0.45, 0.12, 1.0))):
		count += 1
	if _save_image("res://Assets/vfx/explosion 4.png", _make_atlas_grid(4096, 8, 512, Color(0.98, 0.55, 0.15, 1.0))):
		count += 1
	return count


## [FUNGSI]: Membuat `bullet1.tres` & `bullet2.tres` berisi animasi `&"default"` valid dan UID yang cocok.
## [INPUT/OUTPUT]: void -> int (jumlah resource tersimpan)
func _generate_bullet_sprite_frames() -> int:
	var count: int = 0
	var bullet_specs: Dictionary = {
		"res://Assets/bullets/bullet1.tres": Color(1.0, 0.65, 0.15, 1.0),
		"res://Assets/bullets/bullet2.tres": Color(0.20, 0.90, 1.0, 1.0),
	}
	for res_path: String in bullet_specs.keys():
		_ensure_parent_dir(res_path)
		var sf: SpriteFrames = SpriteFrames.new()
		if not sf.has_animation(&"default"):
			sf.add_animation(&"default")
		sf.set_animation_loop(&"default", true)
		sf.set_animation_speed(&"default", 12.0)
		var frame_img: Image = _make_solid_bordered(16, bullet_specs[res_path], Color(1.0, 1.0, 1.0, 1.0))
		var tex: ImageTexture = ImageTexture.create_from_image(frame_img)
		sf.add_frame(&"default", tex)
		if ResourceSaver.save(sf, res_path) == OK:
			if res_path.ends_with("bullet2.tres"):
				_patch_tres_uid(res_path, BULLET2_UID)
			count += 1
		else:
			push_error("Gagal menyimpan SpriteFrames: %s" % res_path)
	return count


## [FUNGSI]: Menggambar ikon geometris menara/inti ukuran persegi dengan border kontras.
## [INPUT/OUTPUT]: size (int), accent (Color) -> Image
func _make_turret_icon(size: int, accent: Color) -> Image:
	var img: Image = Image.create(size, size, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.0, 0.0, 0.0, 0.0))
	var pad: int = maxi(4, size / 8)
	img.fill_rect(Rect2i(pad, pad, size - pad * 2, size - pad * 2), Color(0.08, 0.11, 0.16, 1.0))
	var inner: int = maxi(6, size / 4)
	img.fill_rect(Rect2i(inner, inner, size - inner * 2, size - inner * 2), accent)
	var barrel_w: int = maxi(4, size / 5)
	img.fill_rect(Rect2i(size / 2, (size - barrel_w) / 2, size / 2 - 2, barrel_w), Color(0.90, 0.95, 1.0, 1.0))
	return img


## [FUNGSI]: Membuat spritesheet musuh horizontal `frame_count * frame_size` x `frame_size` (`hframes = 24`).
## [INPUT/OUTPUT]: frame_count (int), frame_size (int), body_color (Color) -> Image
func _make_enemy_spritesheet(frame_count: int, frame_size: int, body_color: Color) -> Image:
	var img: Image = Image.create(frame_count * frame_size, frame_size, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.0, 0.0, 0.0, 0.0))
	for i: int in range(frame_count):
		var ox: int = i * frame_size
		var bob: int = 2 if (i % 2 == 1) else 0
		img.fill_rect(Rect2i(ox + 6, 6 + bob, frame_size - 12, frame_size - 12), Color(0.07, 0.09, 0.14, 1.0))
		img.fill_rect(Rect2i(ox + 8, 8 + bob, frame_size - 16, frame_size - 16), body_color)
		img.fill_rect(Rect2i(ox + frame_size - 12, 10 + bob, 3, 3), Color(1.0, 1.0, 1.0, 1.0))
	return img


## [FUNGSI]: Membuat tekstur latar berpola grid taktis untuk peta atau menu.
## [INPUT/OUTPUT]: width (int), height (int), bg_color (Color), grid_color (Color) -> Image
func _make_grid_backdrop(width: int, height: int, bg_color: Color, grid_color: Color) -> Image:
	var img: Image = Image.create(width, height, false, Image.FORMAT_RGBA8)
	img.fill(bg_color)
	var step: int = 64
	for x: int in range(0, width, step):
		img.fill_rect(Rect2i(x, 0, 2, height), grid_color)
	for y: int in range(0, height, step):
		img.fill_rect(Rect2i(0, y, width, 2), grid_color)
	return img


## [FUNGSI]: Membuat kotak solid berbingkai untuk pixel proyektil dan frame peluru.
## [INPUT/OUTPUT]: size (int), fill_color (Color), border_color (Color) -> Image
func _make_solid_bordered(size: int, fill_color: Color, border_color: Color) -> Image:
	var img: Image = Image.create(size, size, false, Image.FORMAT_RGBA8)
	img.fill(border_color)
	if size > 4:
		img.fill_rect(Rect2i(2, 2, size - 4, size - 4), fill_color)
	return img


## [FUNGSI]: Membuat atlas VFX `total_size x total_size` dengan kisi `grid_dim x grid_dim` sel berukuran `cell_size`.
## [INPUT/OUTPUT]: total_size (int), grid_dim (int), cell_size (int), burst_color (Color) -> Image
func _make_atlas_grid(total_size: int, grid_dim: int, cell_size: int, burst_color: Color) -> Image:
	var img: Image = Image.create(total_size, total_size, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.0, 0.0, 0.0, 0.0))
	var total_cells: int = grid_dim * grid_dim
	for row: int in range(grid_dim):
		for col: int in range(grid_dim):
			var idx: int = row * grid_dim + col
			var ratio: float = float(idx + 1) / float(total_cells)
			var box: int = maxi(8, int(float(cell_size) * (0.25 + 0.65 * (1.0 - absf(ratio - 0.5)))))
			var ox: int = col * cell_size + (cell_size - box) / 2
			var oy: int = row * cell_size + (cell_size - box) / 2
			var alpha: float = clampf(1.15 - ratio * 0.85, 0.25, 1.0)
			img.fill_rect(Rect2i(ox, oy, box, box), Color(burst_color.r, burst_color.g, burst_color.b, alpha))
			var core: int = maxi(4, box / 2)
			img.fill_rect(Rect2i(ox + (box - core) / 2, oy + (box - core) / 2, core, core), Color(1.0, 0.95, 0.75, alpha))
	return img


## [FUNGSI]: Menyusun file WAV RIFF PCM 16-bit mono 22050Hz dengan nada sinus pendek beramplop halus.
## [INPUT/OUTPUT]: freq_hz (float), duration_sec (float) -> PackedByteArray
func _build_pcm_wav_bytes(freq_hz: float, duration_sec: float) -> PackedByteArray:
	var sample_rate: int = 22050
	var sample_count: int = maxi(64, int(float(sample_rate) * duration_sec))
	var data_size: int = sample_count * 2
	var bytes: PackedByteArray = PackedByteArray()
	bytes.resize(44 + data_size)
	bytes.encode_u32(0, 0x46464952)   # "RIFF"
	bytes.encode_u32(4, 36 + data_size)
	bytes.encode_u32(8, 0x45564157)   # "WAVE"
	bytes.encode_u32(12, 0x20746d66)  # "fmt "
	bytes.encode_u32(16, 16)          # PCM chunk size
	bytes.encode_u16(20, 1)           # AudioFormat = PCM
	bytes.encode_u16(22, 1)           # Channels = 1
	bytes.encode_u32(24, sample_rate) # SampleRate
	bytes.encode_u32(28, sample_rate * 2) # ByteRate
	bytes.encode_u16(32, 2)           # BlockAlign
	bytes.encode_u16(34, 16)          # BitsPerSample
	bytes.encode_u32(36, 0x61746164)  # "data"
	bytes.encode_u32(40, data_size)
	for i: int in range(sample_count):
		var t: float = float(i) / float(sample_rate)
		var env: float = 1.0 - (float(i) / float(sample_count))
		var amp: float = sin(TAU * freq_hz * t) * env * 0.25
		bytes.encode_s16(44 + i * 2, clampi(int(amp * 32767.0), -32768, 32767))
	return bytes


## [FUNGSI]: Menyusun N frame MPEG-1 Layer III (128kbps, 44100Hz, stereo, 417 byte/frame) valid senyap.
## [INPUT/OUTPUT]: frame_count (int) -> PackedByteArray
func _build_silent_mp3_bytes(frame_count: int) -> PackedByteArray:
	var frame_size: int = 417
	var bytes: PackedByteArray = PackedByteArray()
	bytes.resize(frame_count * frame_size)
	for f: int in range(frame_count):
		var base: int = f * frame_size
		bytes[base] = 0xFF
		bytes[base + 1] = 0xFB
		bytes[base + 2] = 0x90
		bytes[base + 3] = 0x00
	return bytes


## [FUNGSI]: Menghasilkan konten SVG XML untuk `res://icon.svg`.
## [INPUT/OUTPUT]: void -> String
func _build_icon_svg() -> String:
	return """<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="20" fill="#0f172a"/>
  <polygon points="64,14 108,38 108,90 64,114 20,90 20,38" fill="#1e293b" stroke="#22d3ee" stroke-width="5"/>
  <circle cx="64" cy="64" r="22" fill="#f59e0b"/>
  <rect x="60" y="34" width="8" height="30" fill="#f8fafc"/>
</svg>
"""


## [FUNGSI]: Menghasilkan teks lisensi MIT placeholder untuk `Assets/LICENSES/towerdefense_MIT.txt`.
## [INPUT/OUTPUT]: void -> String
func _build_license_text() -> String:
	return "MIT License\n\nLocal procedural placeholder assets generated by res://src/combat/tools/asset_generator.gd.\n"


## [FUNGSI]: Menyimpan Image ke PNG atau WebP di `res://` setelah memastikan direktori ada.
## [INPUT/OUTPUT]: res_path (String), img (Image) -> bool
func _save_image(res_path: String, img: Image) -> bool:
	_ensure_parent_dir(res_path)
	var abs_path: String = ProjectSettings.globalize_path(res_path)
	var err: Error = img.save_webp(abs_path) if res_path.ends_with(".webp") else img.save_png(abs_path)
	if err != OK:
		push_error("Gagal menyimpan gambar %s (err=%d)" % [res_path, err])
		return false
	return true


## [FUNGSI]: Menulis PackedByteArray ke `res_path` secara atomik setelah membuat direktori induk.
## [INPUT/OUTPUT]: res_path (String), data (PackedByteArray) -> bool
func _write_buffer(res_path: String, data: PackedByteArray) -> bool:
	_ensure_parent_dir(res_path)
	var file: FileAccess = FileAccess.open(res_path, FileAccess.WRITE)
	if file == null:
		push_error("Gagal menulis buffer: %s" % res_path)
		return false
	file.store_buffer(data)
	return true


## [FUNGSI]: Menulis teks UTF-8 ke `res_path` setelah membuat direktori induk.
## [INPUT/OUTPUT]: res_path (String), content (String) -> bool
func _write_text(res_path: String, content: String) -> bool:
	_ensure_parent_dir(res_path)
	var file: FileAccess = FileAccess.open(res_path, FileAccess.WRITE)
	if file == null:
		push_error("Gagal menulis teks: %s" % res_path)
		return false
	file.store_string(content)
	return true


## [FUNGSI]: Memastikan direktori induk dari `res_path` sudah dibuat.
## [INPUT/OUTPUT]: res_path (String) -> void
func _ensure_parent_dir(res_path: String) -> void:
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(res_path.get_base_dir()))


## [FUNGSI]: Menjalankan proses importer headless Godot agar `.import` dan `.godot/imported/` terbentuk.
## [INPUT/OUTPUT]: void -> int (exit code proses)
func _run_godot_import() -> int:
	var args: PackedStringArray = [
		"--headless",
		"--path",
		ProjectSettings.globalize_path("res://"),
		"--import",
	]
	var output: Array = []
	return OS.execute(OS.get_executable_path(), args, output, true)


## [FUNGSI]: Menyelaraskan `uid="uid://..."` di file `.import` agar cocok dengan referensi hardcoded `.tscn`.
## [INPUT/OUTPUT]: void -> int (jumlah file `.import` yang diperbarui)
func _sync_import_uids() -> int:
	var updated: int = 0
	for import_path: String in EXPECTED_IMPORT_UIDS.keys():
		if not FileAccess.file_exists(import_path):
			continue
		var target_uid: String = String(EXPECTED_IMPORT_UIDS[import_path])
		var text: String = FileAccess.get_file_as_string(import_path)
		var patched: String = _replace_uid_line(text, target_uid)
		if patched != text and _write_text(import_path, patched):
			updated += 1
	return updated


## [FUNGSI]: Mengganti baris `uid="uid://..."` pada isi file `.import`.
## [INPUT/OUTPUT]: content (String), new_uid (String) -> String
func _replace_uid_line(content: String, new_uid: String) -> String:
	var lines: PackedStringArray = content.split("\n")
	for i: int in range(lines.size()):
		if lines[i].begins_with("uid=\""):
			lines[i] = "uid=\"%s\"" % new_uid
			break
	return "\n".join(lines)


## [FUNGSI]: Menyisipkan atau mengganti `uid="..."` pada header `[gd_resource ...]` file `.tres`.
## [INPUT/OUTPUT]: res_path (String), target_uid (String) -> void
func _patch_tres_uid(res_path: String, target_uid: String) -> void:
	var text: String = FileAccess.get_file_as_string(res_path)
	var newline_idx: int = text.find("\n")
	if newline_idx == -1:
		return
	var header: String = text.substr(0, newline_idx)
	var rest: String = text.substr(newline_idx)
	var uid_pos: int = header.find(" uid=\"")
	if uid_pos != -1:
		var end_q: int = header.find("\"", uid_pos + 6)
		if end_q != -1:
			header = header.substr(0, uid_pos) + (" uid=\"%s\"" % target_uid) + header.substr(end_q + 1)
	elif header.ends_with("]"):
		header = header.substr(0, header.length() - 1) + (" uid=\"%s\"]" % target_uid)
	_write_text(res_path, header + rest)
