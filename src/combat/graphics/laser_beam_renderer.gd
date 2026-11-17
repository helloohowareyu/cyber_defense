class_name LaserBeamRenderer
extends MeshInstance3D
## Menggambar sinar Laser Tower secara real-time dengan ImmediateMesh (gaya glBegin/glEnd).
##
## [FUNGSI_MODUL]: Dua pita bersilang (horizontal + vertikal) berbentuk TRIANGLE_STRIP agar
##   sinar terlihat dari sudut kamera mana pun; tekstur pulsa digeser oleh shader.
## [REFERENSI_KURIKULUM]: Guha Bab 2-3 (primitif GL_TRIANGLE_STRIP, immediate mode),
##   Bab 10 (modeling pita 3D), Bab 12 (UV mapping & tekstur prosedural).
## [ARAH_INTERAKSI_KODE]: Dibuat sebagai child `Muzzle` oleh `Tower3D._build_turret()`;
##   `Tower3D._update_beam()` memanggil `draw_beam_from_to()` / `clear_beam()`.

## [FUNGSI]: Shader sinar (UV scroll + additive blending).
const BEAM_SHADER: Shader = preload("res://src/combat/shaders/laser_beam_scroll.gdshader")
## [FUNGSI]: Kepadatan tekstur: UV.x bertambah 0.5 per meter panjang sinar.
const UV_PER_METER: float = 0.5

var _immediate: ImmediateMesh = ImmediateMesh.new()
var _material: ShaderMaterial = ShaderMaterial.new()


## [FUNGSI]: Menyiapkan ImmediateMesh, material sinar, dan tekstur pulsa prosedural.
## [INPUT/OUTPUT]: - -> void
func _init() -> void:
	mesh = _immediate
	cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_material.shader = BEAM_SHADER
	_material.set_shader_parameter("pulse_texture", _make_pulse_texture())


## [FUNGSI]: Mengatur warna sinar (dari `TowerStatsData.accent_color`).
## [INPUT/OUTPUT]: color (Color) -> void
func set_beam_color(color: Color) -> void:
	_material.set_shader_parameter("beam_color", color)


## [FUNGSI]: Menggambar ulang dua pita sinar dari titik lokal start ke end.
## [INPUT/OUTPUT]: local_start (Vector3), local_end (Vector3), beam_width (float) -> void
## [ARAH_INTERAKSI]: Dipanggil `Tower3D._update_beam()` tiap frame selama sinar aktif.
func draw_beam_from_to(local_start: Vector3, local_end: Vector3, beam_width: float) -> void:
	_immediate.clear_surfaces()
	var axis: Vector3 = local_end - local_start
	var length: float = axis.length()
	if length < 0.001:
		return
	var dir: Vector3 = axis / length
	var helper: Vector3 = Vector3.UP if absf(dir.y) < 0.99 else Vector3.RIGHT
	var side_a: Vector3 = dir.cross(helper).normalized() * beam_width * 0.5
	var side_b: Vector3 = dir.cross(side_a).normalized() * beam_width * 0.5
	for side: Vector3 in [side_a, side_b]:
		_add_strip(local_start, local_end, side, length * UV_PER_METER)


## [FUNGSI]: Menghapus sinar (saat tidak menembak).
## [INPUT/OUTPUT]: - -> void
func clear_beam() -> void:
	_immediate.clear_surfaces()


## [FUNGSI]: Satu pita quad sebagai TRIANGLE_STRIP 4 vertex (v0,v1,v2,v3 -> 2 segitiga).
## [INPUT/OUTPUT]: start, end, side (setengah lebar), uv_length -> void
func _add_strip(start: Vector3, end: Vector3, side: Vector3, uv_length: float) -> void:
	_immediate.surface_begin(Mesh.PRIMITIVE_TRIANGLE_STRIP, _material)
	_immediate.surface_set_uv(Vector2(0.0, 0.0))
	_immediate.surface_add_vertex(start - side)
	_immediate.surface_set_uv(Vector2(0.0, 1.0))
	_immediate.surface_add_vertex(start + side)
	_immediate.surface_set_uv(Vector2(uv_length, 0.0))
	_immediate.surface_add_vertex(end - side)
	_immediate.surface_set_uv(Vector2(uv_length, 1.0))
	_immediate.surface_add_vertex(end + side)
	_immediate.surface_end()


## [FUNGSI]: Tekstur pulsa 1D prosedural (gelap-terang-gelap) tanpa file aset eksternal.
## [INPUT/OUTPUT]: - -> GradientTexture2D
func _make_pulse_texture() -> GradientTexture2D:
	var gradient := Gradient.new()
	gradient.set_color(0, Color(0.05, 0.05, 0.05))
	gradient.set_color(1, Color(0.05, 0.05, 0.05))
	gradient.add_point(0.5, Color.WHITE)
	var texture := GradientTexture2D.new()
	texture.gradient = gradient
	texture.width = 64
	texture.height = 1
	return texture
