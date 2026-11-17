class_name MapGrid3D
extends Node3D
## Peta grid taktis 3D (16x10) lengkap dengan jalur waypoint P_0..P_n, tile visual, dan collider layer 2.
##
## [FUNGSI_MODUL]: Mengelola layout arena cyber 3D (buildable, path, obstacle, spawn, core),
##   konversi koordinat grid <-> world, validasi penempatan menara, preview hover + Range Ring,
##   serta StaticBody3D lantai khusus collision layer 2 agar tidak bentrok dengan Tower3D layer 1.
## [REFERENSI_KURIKULUM]: Guha Bab 2 & 3 (sistem koordinat, picking raycast layer terpisah),
##   GDD Bagian 4.1, 4.2, dan 4.3.

## [FUNGSI]: Tipe status setiap sel grid pada arena 16x10.
enum CellType { EMPTY_BUILDABLE, PATH, OBSTACLE, SPAWN, CORE, OCCUPIED }

## [FUNGSI]: Layer fisika khusus raycast lantai/grid (terpisah dari Tower3D MousePickCollider layer 1).
const RAYCAST_LAYER_MASK: int = 2

## [FUNGSI]: Daftar titik belok (grid col, row) dari Spawn P_0 hingga Energy Core P_n.
const PATH_CORNERS: Array[Vector2i] = [
	Vector2i(0, 2),
	Vector2i(3, 2),
	Vector2i(3, 7),
	Vector2i(7, 7),
	Vector2i(7, 1),
	Vector2i(11, 1),
	Vector2i(11, 8),
	Vector2i(14, 8),
	Vector2i(14, 5),
]

## [FUNGSI]: Daftar sel obstacle strategis yang tidak dapat ditempati menara.
const OBSTACLE_CELLS: Array[Vector2i] = [
	Vector2i(0, 0),
	Vector2i(1, 8),
	Vector2i(5, 3),
	Vector2i(5, 9),
	Vector2i(9, 3),
	Vector2i(13, 1),
	Vector2i(13, 4),
	Vector2i(15, 9),
]

var _cells: Array[Array] = []
var _waypoints: Array[Vector3] = []
var _tile_meshes: Dictionary = {}

var _visual_built: bool = false
var _ground_body: StaticBody3D = null
var _hover_root: Node3D = null
var _hover_tile: MeshInstance3D = null
var _hover_tile_mat: StandardMaterial3D = null
var _hover_range_ring: MeshInstance3D = null
var _last_preview_range: float = -1.0
var _last_preview_valid: bool = true

var _mat_buildable: ShaderMaterial = null
var _mat_occupied: ShaderMaterial = null
var _mat_path: ShaderMaterial = null
var _mat_obstacle: ShaderMaterial = null
var _mat_obstacle_cap: ShaderMaterial = null
var _mat_spawn: ShaderMaterial = null
var _mat_core_pad: ShaderMaterial = null


## [FUNGSI]: Menginisialisasi data grid dan waypoint segera saat objek dibuat.
## [INPUT/OUTPUT]: - -> void
func _init() -> void:
	_rebuild_grid_data()
	_build_ground_collider()


## [FUNGSI]: Membangun visual arena 3D dan collider raycast layer 2 saat memasuki scene tree.
## [INPUT/OUTPUT]: - -> void
func _ready() -> void:
	_build_ground_collider()
	_build_arena_visuals()
	_build_hover_preview_nodes()


## [FUNGSI]: Mengembalikan grid ke keadaan awal (mengosongkan seluruh sel OCCUPIED) dan membersihkan hover.
## [INPUT/OUTPUT]: - -> void
func reset_grid() -> void:
	_rebuild_grid_data()
	clear_hover_preview()
	_refresh_all_tile_materials()


## [FUNGSI]: Mengembalikan salinan daftar koordinat World 3D waypoint dari P_0 (Spawn) ke P_n (Core).
## [INPUT/OUTPUT]: - -> Array[Vector3]
func get_waypoints() -> Array[Vector3]:
	return _waypoints.duplicate()


## [FUNGSI]: Mengembalikan tipe sel pada koordinat grid (mengembalikan OBSTACLE jika di luar batas).
## [INPUT/OUTPUT]: grid_pos (Vector2i) -> CellType
func get_cell_type(grid_pos: Vector2i) -> CellType:
	if not is_valid_grid_pos(grid_pos):
		return CellType.OBSTACLE
	return _cells[grid_pos.y][grid_pos.x] as CellType


## [FUNGSI]: Mengembalikan true jika koordinat grid berada dalam rentang [0..15, 0..9].
## [INPUT/OUTPUT]: grid_pos (Vector2i) -> bool
func is_valid_grid_pos(grid_pos: Vector2i) -> bool:
	return (
		grid_pos.x >= 0
		and grid_pos.x < GameConstants3D.GRID_COLS
		and grid_pos.y >= 0
		and grid_pos.y < GameConstants3D.GRID_ROWS
	)


## [FUNGSI]: Mengembalikan true jika koordinat valid dan bertipe EMPTY_BUILDABLE.
## [INPUT/OUTPUT]: grid_pos (Vector2i) -> bool
func can_place_at(grid_pos: Vector2i) -> bool:
	if not is_valid_grid_pos(grid_pos):
		return false
	return get_cell_type(grid_pos) == CellType.EMPTY_BUILDABLE


## [FUNGSI]: Menandai sel buildable sebagai OCCUPIED atau mengembalikannya ke EMPTY_BUILDABLE.
## [INPUT/OUTPUT]: grid_pos (Vector2i), occupied (bool) -> void
func set_cell_occupied(grid_pos: Vector2i, occupied: bool) -> void:
	if not is_valid_grid_pos(grid_pos):
		return
	var current: CellType = get_cell_type(grid_pos)
	if occupied:
		if current == CellType.EMPTY_BUILDABLE:
			_cells[grid_pos.y][grid_pos.x] = CellType.OCCUPIED
			_update_tile_material(grid_pos)
	else:
		if current == CellType.OCCUPIED:
			_cells[grid_pos.y][grid_pos.x] = CellType.EMPTY_BUILDABLE
			_update_tile_material(grid_pos)


## [FUNGSI]: Mengonversi koordinat grid (col, row) menjadi pusat sel dalam World Coordinates 3D.
## [INPUT/OUTPUT]: grid_pos (Vector2i) -> Vector3
func grid_to_world(grid_pos: Vector2i) -> Vector3:
	var half_cols: float = float(GameConstants3D.GRID_COLS) * 0.5
	var half_rows: float = float(GameConstants3D.GRID_ROWS) * 0.5
	var wx: float = (float(grid_pos.x) - half_cols + 0.5) * GameConstants3D.CELL_SIZE_METERS
	var wz: float = (float(grid_pos.y) - half_rows + 0.5) * GameConstants3D.CELL_SIZE_METERS
	return Vector3(wx, 0.0, wz)


## [FUNGSI]: Mengonversi posisi World Coordinates 3D menjadi koordinat indeks sel grid (Vector2i).
## [INPUT/OUTPUT]: world_pos (Vector3) -> Vector2i
func world_to_grid(world_pos: Vector3) -> Vector2i:
	var half_cols: float = float(GameConstants3D.GRID_COLS) * 0.5
	var half_rows: float = float(GameConstants3D.GRID_ROWS) * 0.5
	var col: int = int(floor(world_pos.x / GameConstants3D.CELL_SIZE_METERS + half_cols))
	var row: int = int(floor(world_pos.z / GameConstants3D.CELL_SIZE_METERS + half_rows))
	return Vector2i(col, row)


## [FUNGSI]: Mencari koordinat grid pertama dengan tipe sel tertentu, atau Vector2i(-1, -1) jika tidak ada.
## [INPUT/OUTPUT]: cell_type (CellType) -> Vector2i
func get_first_cell_of_type(cell_type: CellType) -> Vector2i:
	for row: int in range(GameConstants3D.GRID_ROWS):
		for col: int in range(GameConstants3D.GRID_COLS):
			if _cells[row][col] == cell_type:
				return Vector2i(col, row)
	return Vector2i(-1, -1)


## [FUNGSI]: Mengembalikan posisi World 3D dari sel Energy Core (P_n).
## [INPUT/OUTPUT]: - -> Vector3
func get_core_world_position() -> Vector3:
	var core_cell: Vector2i = get_first_cell_of_type(CellType.CORE)
	if core_cell.x < 0:
		return Vector3.ZERO
	return grid_to_world(core_cell)


## [FUNGSI]: Menampilkan tile highlight hover dan cincin jangkauan prosedural saat mode pembangunan.
## [INPUT/OUTPUT]: grid_pos (Vector2i), valid (bool), range_meters (float) -> void
func set_hover_preview(grid_pos: Vector2i, valid: bool, range_meters: float) -> void:
	if not is_valid_grid_pos(grid_pos):
		clear_hover_preview()
		return
	_build_hover_preview_nodes()
	_hover_root.visible = true
	_hover_root.position = grid_to_world(grid_pos)
	var tile_color: Color = Color(0.15, 0.95, 0.65, 0.52) if valid else Color(1.0, 0.22, 0.3, 0.52)
	_hover_tile_mat.albedo_color = tile_color
	if range_meters > 0.0:
		if not is_equal_approx(range_meters, _last_preview_range) or valid != _last_preview_valid:
			_rebuild_preview_ring(range_meters, valid)
		_hover_range_ring.visible = true
	else:
		_hover_range_ring.visible = false


## [FUNGSI]: Menyembunyikan tile preview hover dan cincin jangkauannya.
## [INPUT/OUTPUT]: - -> void
func clear_hover_preview() -> void:
	if _hover_root != null:
		_hover_root.visible = false
	if _hover_range_ring != null:
		_hover_range_ring.visible = false


## [FUNGSI]: Menyusun ulang matriks sel 16x10 dan daftar waypoint P_0..P_n dari definisi jalur.
## [INPUT/OUTPUT]: - -> void
func _rebuild_grid_data() -> void:
	_cells.clear()
	for row: int in range(GameConstants3D.GRID_ROWS):
		var row_arr: Array[CellType] = []
		row_arr.resize(GameConstants3D.GRID_COLS)
		row_arr.fill(CellType.EMPTY_BUILDABLE)
		_cells.append(row_arr)

	_waypoints.clear()
	for corner: Vector2i in PATH_CORNERS:
		_waypoints.append(grid_to_world(corner))

	for i: int in range(PATH_CORNERS.size() - 1):
		var a: Vector2i = PATH_CORNERS[i]
		var b: Vector2i = PATH_CORNERS[i + 1]
		var step_x: int = clampi(b.x - a.x, -1, 1)
		var step_y: int = clampi(b.y - a.y, -1, 1)
		var cursor: Vector2i = a
		while true:
			_cells[cursor.y][cursor.x] = CellType.PATH
			if cursor == b:
				break
			cursor += Vector2i(step_x, step_y)

	if not PATH_CORNERS.is_empty():
		var spawn_cell: Vector2i = PATH_CORNERS[0]
		var core_cell: Vector2i = PATH_CORNERS[PATH_CORNERS.size() - 1]
		_cells[spawn_cell.y][spawn_cell.x] = CellType.SPAWN
		_cells[core_cell.y][core_cell.x] = CellType.CORE

	for obs: Vector2i in OBSTACLE_CELLS:
		if is_valid_grid_pos(obs) and _cells[obs.y][obs.x] == CellType.EMPTY_BUILDABLE:
			_cells[obs.y][obs.x] = CellType.OBSTACLE


## [FUNGSI]: Membangun StaticBody3D lantai khusus pada collision_layer 2 untuk raycast mouse.
## [INPUT/OUTPUT]: - -> void
func _build_ground_collider() -> void:
	if _ground_body != null:
		return
	_ground_body = StaticBody3D.new()
	_ground_body.name = "GridRaycastFloor"
	_ground_body.collision_layer = RAYCAST_LAYER_MASK
	_ground_body.collision_mask = 0
	var shape_node := CollisionShape3D.new()
	var box := BoxShape3D.new()
	box.size = Vector3(
		float(GameConstants3D.GRID_COLS) * GameConstants3D.CELL_SIZE_METERS,
		0.2,
		float(GameConstants3D.GRID_ROWS) * GameConstants3D.CELL_SIZE_METERS
	)
	shape_node.shape = box
	shape_node.position = Vector3(0.0, -0.1, 0.0)
	_ground_body.add_child(shape_node)
	add_child(_ground_body)


## [FUNGSI]: Membangun landasan arena dan seluruh tile visual 3D (buildable, path, obstacle, spawn, core).
## [INPUT/OUTPUT]: - -> void
func _build_arena_visuals() -> void:
	if _visual_built:
		return
	_visual_built = true
	_ensure_materials()

	var deck := MeshInstance3D.new()
	deck.name = "CyberArenaDeck"
	var deck_mesh := BoxMesh.new()
	deck_mesh.size = Vector3(
		float(GameConstants3D.GRID_COLS) * GameConstants3D.CELL_SIZE_METERS + 1.2,
		0.3,
		float(GameConstants3D.GRID_ROWS) * GameConstants3D.CELL_SIZE_METERS + 1.2
	)
	deck.mesh = deck_mesh
	deck.position = Vector3(0.0, -0.2, 0.0)
	deck.material_override = ProceduralMeshBuilder.make_phong_material(Color(0.06, 0.08, 0.12))
	add_child(deck)

	var tile_box := BoxMesh.new()
	tile_box.size = Vector3(
		GameConstants3D.CELL_SIZE_METERS - 0.1,
		0.08,
		GameConstants3D.CELL_SIZE_METERS - 0.1
	)
	var path_box := BoxMesh.new()
	path_box.size = Vector3(
		GameConstants3D.CELL_SIZE_METERS - 0.06,
		0.05,
		GameConstants3D.CELL_SIZE_METERS - 0.06
	)
	var pillar_box := BoxMesh.new()
	pillar_box.size = Vector3(1.45, 1.15, 1.45)
	var cap_box := BoxMesh.new()
	cap_box.size = Vector3(1.52, 0.14, 1.52)

	var tiles_root := Node3D.new()
	tiles_root.name = "GridTiles"
	add_child(tiles_root)

	for row: int in range(GameConstants3D.GRID_ROWS):
		for col: int in range(GameConstants3D.GRID_COLS):
			var gp := Vector2i(col, row)
			var cell_type: CellType = get_cell_type(gp)
			var wpos: Vector3 = grid_to_world(gp)
			var tile := MeshInstance3D.new()
			tile.name = "Tile_%d_%d" % [col, row]
			tile.mesh = path_box if cell_type == CellType.PATH else tile_box
			tile.position = Vector3(wpos.x, -0.04 if cell_type != CellType.PATH else -0.025, wpos.z)
			tiles_root.add_child(tile)
			_tile_meshes[gp] = tile
			_update_tile_material(gp)

			if cell_type == CellType.OBSTACLE:
				var pillar := MeshInstance3D.new()
				pillar.name = "Obstacle_%d_%d" % [col, row]
				pillar.mesh = pillar_box
				pillar.position = Vector3(wpos.x, 0.575, wpos.z)
				pillar.material_override = _mat_obstacle
				pillar.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_ON
				tiles_root.add_child(pillar)

				var cap := MeshInstance3D.new()
				cap.mesh = cap_box
				cap.position = Vector3(wpos.x, 1.18, wpos.z)
				cap.material_override = _mat_obstacle_cap
				tiles_root.add_child(cap)
			elif cell_type == CellType.SPAWN:
				_add_spawn_gate_visual(tiles_root, wpos)


## [FUNGSI]: Menambahkan portal neon gerbang masuk musuh di titik Spawn P_0.
## [INPUT/OUTPUT]: parent (Node3D), world_pos (Vector3) -> void
func _add_spawn_gate_visual(parent: Node3D, world_pos: Vector3) -> void:
	var portal := MeshInstance3D.new()
	portal.name = "SpawnPortalRing"
	var torus := TorusMesh.new()
	torus.inner_radius = 0.65
	torus.outer_radius = 0.85
	torus.rings = 24
	torus.ring_segments = 10
	portal.mesh = torus
	portal.position = Vector3(world_pos.x, 0.9, world_pos.z)
	portal.rotation_degrees = Vector3(90.0, 90.0, 0.0)
	var mat: ShaderMaterial = ProceduralMeshBuilder.make_phong_material(Color(0.95, 0.25, 0.55))
	mat.set_shader_parameter("ambient_strength", 0.35)
	portal.material_override = mat
	parent.add_child(portal)


## [FUNGSI]: Menyiapkan material shader Blinn-Phong bersama untuk seluruh jenis tile peta.
## [INPUT/OUTPUT]: - -> void
func _ensure_materials() -> void:
	if _mat_buildable != null:
		return
	_mat_buildable = ProceduralMeshBuilder.make_phong_material(Color(0.14, 0.18, 0.24))
	_mat_buildable.set_shader_parameter("specular_strength", 0.55)
	_mat_occupied = ProceduralMeshBuilder.make_phong_material(Color(0.18, 0.26, 0.34))
	_mat_path = ProceduralMeshBuilder.make_phong_material(Color(0.08, 0.45, 0.62))
	_mat_path.set_shader_parameter("ambient_strength", 0.28)
	_mat_obstacle = ProceduralMeshBuilder.make_phong_material(Color(0.22, 0.22, 0.28))
	_mat_obstacle_cap = ProceduralMeshBuilder.make_phong_material(Color(0.9, 0.42, 0.15))
	_mat_obstacle_cap.set_shader_parameter("ambient_strength", 0.25)
	_mat_spawn = ProceduralMeshBuilder.make_phong_material(Color(0.65, 0.15, 0.38))
	_mat_spawn.set_shader_parameter("ambient_strength", 0.3)
	_mat_core_pad = ProceduralMeshBuilder.make_phong_material(Color(0.12, 0.65, 0.85))
	_mat_core_pad.set_shader_parameter("ambient_strength", 0.32)


## [FUNGSI]: Memperbarui material seluruh tile visual (dipanggil saat reset_grid).
## [INPUT/OUTPUT]: - -> void
func _refresh_all_tile_materials() -> void:
	if _tile_meshes.is_empty():
		return
	for gp_var: Variant in _tile_meshes.keys():
		_update_tile_material(gp_var as Vector2i)


## [FUNGSI]: Menyelaraskan material tile tunggal dengan tipe sel saat ini.
## [INPUT/OUTPUT]: grid_pos (Vector2i) -> void
func _update_tile_material(grid_pos: Vector2i) -> void:
	if not _tile_meshes.has(grid_pos):
		return
	_ensure_materials()
	var tile: MeshInstance3D = _tile_meshes[grid_pos] as MeshInstance3D
	match get_cell_type(grid_pos):
		CellType.EMPTY_BUILDABLE:
			tile.material_override = _mat_buildable
		CellType.OCCUPIED:
			tile.material_override = _mat_occupied
		CellType.PATH:
			tile.material_override = _mat_path
		CellType.OBSTACLE:
			tile.material_override = _mat_obstacle
		CellType.SPAWN:
			tile.material_override = _mat_spawn
		CellType.CORE:
			tile.material_override = _mat_core_pad


## [FUNGSI]: Menyiapkan node visual hover tile dan Range Ring preview penempatan menara.
## [INPUT/OUTPUT]: - -> void
func _build_hover_preview_nodes() -> void:
	if _hover_root != null:
		return
	_hover_root = Node3D.new()
	_hover_root.name = "HoverPreview"
	_hover_root.visible = false
	add_child(_hover_root)

	_hover_tile = MeshInstance3D.new()
	_hover_tile.name = "HoverTile"
	var quad := BoxMesh.new()
	quad.size = Vector3(GameConstants3D.CELL_SIZE_METERS - 0.14, 0.04, GameConstants3D.CELL_SIZE_METERS - 0.14)
	_hover_tile.mesh = quad
	_hover_tile.position = Vector3(0.0, 0.03, 0.0)
	_hover_tile_mat = StandardMaterial3D.new()
	_hover_tile_mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_hover_tile_mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	_hover_tile_mat.albedo_color = Color(0.15, 0.95, 0.65, 0.52)
	_hover_tile.material_override = _hover_tile_mat
	_hover_tile.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_hover_root.add_child(_hover_tile)

	_hover_range_ring = MeshInstance3D.new()
	_hover_range_ring.name = "HoverRangeRing"
	_hover_range_ring.material_override = ProceduralMeshBuilder.make_ring_material()
	_hover_range_ring.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	_hover_range_ring.visible = false
	_hover_root.add_child(_hover_range_ring)


## [FUNGSI]: Membangun ulang ArrayMesh cincin jangkauan preview penempatan sesuai radius dan validitas.
## [INPUT/OUTPUT]: range_meters (float), valid (bool) -> void
func _rebuild_preview_ring(range_meters: float, valid: bool) -> void:
	_last_preview_range = range_meters
	_last_preview_valid = valid
	var outer_r: float = maxf(0.5, range_meters)
	var inner_r: float = maxf(0.1, outer_r - 0.25)
	var base_col: Color = Color(0.2, 0.9, 1.0) if valid else Color(1.0, 0.22, 0.3)
	var inner_col := Color(base_col.r, base_col.g, base_col.b, 0.06)
	var outer_col := Color(base_col.r, base_col.g, base_col.b, 0.72)
	_hover_range_ring.mesh = ProceduralMeshBuilder.build_range_ring_mesh(
		inner_r, outer_r, 48, inner_col, outer_col
	)
