class_name ProceduralMeshBuilder
extends RefCounted
## Pembangun geometri prosedural (ArrayMesh = padanan VAO/VBO OpenGL) dan material shader combat.
##
## [FUNGSI_MODUL]: Range ring menara (annulus) dan piringan shockwave AoE (triangle fan),
##   lengkap dengan buffer vertex, normal, UV, warna vertex, dan index buffer triangulasi.
## [REFERENSI_KURIKULUM]: Guha Bab 2 (primitif & kurva didekati poligon N-sisi), Bab 3 (Vertex
##   Array / VBO), Bab 7 (interpolasi warna), Bab 8-9 (triangulasi & orientasi/winding).
##   Catatan winding: OpenGL default front face = CCW; Godot memakai CW sebagai front face.
## [ARAH_INTERAKSI_KODE]: Dipanggil `Tower3D` (range ring), `Projectile3D` (shockwave),
##   `CombatTargetComponent` (material kristal). Memuat shader di `res://src/combat/shaders/`.

## [FUNGSI]: Shader alpha blending + interpolasi warna vertex (ring & shockwave).
const RING_SHADER: Shader = preload("res://src/combat/shaders/range_ring_blend.gdshader")
## [FUNGSI]: Shader pencahayaan Blinn-Phong + Fresnel rim (turret, proyektil, kristal es).
const PHONG_SHADER: Shader = preload("res://src/combat/shaders/freeze_crystal_phong.gdshader")
## [FUNGSI]: Ketinggian ring di atas tanah untuk menghindari z-fighting dengan lantai.
const GROUND_OFFSET: float = 0.03
## [FUNGSI]: Segmen minimum agar lingkaran tidak tampak seperti poligon kasar.
const MIN_SEGMENTS: int = 8


## [FUNGSI]: Annulus di bidang XZ: 2 vertex per sudut (dalam/luar), 2 segitiga per segmen.
## [INPUT/OUTPUT]: inner_radius, outer_radius, segments, inner_color, outer_color -> ArrayMesh
##   Vertex = (segments + 1) * 2, index = segments * 6, winding CW dilihat dari +Y.
## [ARAH_INTERAKSI]: Dipanggil `Tower3D._rebuild_range_ring()` saat dibuat / upgrade.
static func build_range_ring_mesh(
	inner_radius: float,
	outer_radius: float,
	segments: int,
	inner_color: Color,
	outer_color: Color
) -> ArrayMesh:
	var count: int = maxi(MIN_SEGMENTS, segments)
	var arrays: Array = _new_surface_arrays()
	for i: int in range(count + 1):
		var ratio: float = float(i) / float(count)
		var dir := Vector3(cos(ratio * TAU), 0.0, sin(ratio * TAU))
		_append_vertex(arrays, dir * inner_radius, Vector2(ratio, 0.0), inner_color)
		_append_vertex(arrays, dir * outer_radius, Vector2(ratio, 1.0), outer_color)
	var indices := PackedInt32Array()
	for i: int in range(count):
		var b: int = i * 2
		indices.append_array([b, b + 1, b + 2, b + 2, b + 1, b + 3])
	return _commit(arrays, indices)


## [FUNGSI]: Piringan (triangle fan) di bidang XZ: 1 vertex pusat + cincin tepi.
## [INPUT/OUTPUT]: radius, segments, center_color, edge_color -> ArrayMesh
##   Vertex = segments + 2, index = segments * 3, winding CW dilihat dari +Y.
## [ARAH_INTERAKSI]: Dipanggil `Projectile3D._play_shockwave()` saat ledakan AoE Cannon.
static func build_aoe_shockwave_disc(
	radius: float,
	segments: int,
	center_color: Color,
	edge_color: Color
) -> ArrayMesh:
	var count: int = maxi(MIN_SEGMENTS, segments)
	var arrays: Array = _new_surface_arrays()
	_append_vertex(arrays, Vector3.ZERO, Vector2(0.5, 0.5), center_color)
	for i: int in range(count + 1):
		var ratio: float = float(i) / float(count)
		var dir := Vector3(cos(ratio * TAU), 0.0, sin(ratio * TAU))
		_append_vertex(arrays, dir * radius, Vector2(0.5 + dir.x * 0.5, 0.5 + dir.z * 0.5), edge_color)
	var indices := PackedInt32Array()
	for i: int in range(count):
		indices.append_array([0, i + 1, i + 2])
	return _commit(arrays, indices)


## [FUNGSI]: Material ring/shockwave (alpha blending, warna dari vertex color).
## [INPUT/OUTPUT]: - -> ShaderMaterial
static func make_ring_material() -> ShaderMaterial:
	var material := ShaderMaterial.new()
	material.shader = RING_SHADER
	return material


## [FUNGSI]: Material Blinn-Phong dengan warna dasar tertentu.
## [INPUT/OUTPUT]: base_color (Color) -> ShaderMaterial
static func make_phong_material(base_color: Color) -> ShaderMaterial:
	var material := ShaderMaterial.new()
	material.shader = PHONG_SHADER
	material.set_shader_parameter("base_color", base_color)
	return material


## [FUNGSI]: Array surface kosong dengan slot vertex, normal, UV, dan warna.
## [INPUT/OUTPUT]: - -> Array (ukuran Mesh.ARRAY_MAX)
static func _new_surface_arrays() -> Array:
	var arrays: Array = []
	arrays.resize(Mesh.ARRAY_MAX)
	arrays[Mesh.ARRAY_VERTEX] = PackedVector3Array()
	arrays[Mesh.ARRAY_NORMAL] = PackedVector3Array()
	arrays[Mesh.ARRAY_TEX_UV] = PackedVector2Array()
	arrays[Mesh.ARRAY_COLOR] = PackedColorArray()
	return arrays


## [FUNGSI]: Menambah satu vertex (posisi + offset tanah, normal +Y, UV, warna) ke buffer.
## [INPUT/OUTPUT]: arrays, position, uv, color -> void
static func _append_vertex(arrays: Array, position: Vector3, uv: Vector2, color: Color) -> void:
	# Packed arrays adalah value type: ambil, ubah, lalu simpan kembali.
	var vertices: PackedVector3Array = arrays[Mesh.ARRAY_VERTEX]
	var normals: PackedVector3Array = arrays[Mesh.ARRAY_NORMAL]
	var uvs: PackedVector2Array = arrays[Mesh.ARRAY_TEX_UV]
	var colors: PackedColorArray = arrays[Mesh.ARRAY_COLOR]
	vertices.append(position + Vector3(0.0, GROUND_OFFSET, 0.0))
	normals.append(Vector3.UP)
	uvs.append(uv)
	colors.append(color)
	arrays[Mesh.ARRAY_VERTEX] = vertices
	arrays[Mesh.ARRAY_NORMAL] = normals
	arrays[Mesh.ARRAY_TEX_UV] = uvs
	arrays[Mesh.ARRAY_COLOR] = colors


## [FUNGSI]: Upload buffer + index ke GPU sebagai satu surface PRIMITIVE_TRIANGLES.
## [INPUT/OUTPUT]: arrays, indices -> ArrayMesh
static func _commit(arrays: Array, indices: PackedInt32Array) -> ArrayMesh:
	arrays[Mesh.ARRAY_INDEX] = indices
	var mesh := ArrayMesh.new()
	mesh.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)
	return mesh
