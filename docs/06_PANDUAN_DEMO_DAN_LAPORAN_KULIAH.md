# Panduan Demo & Laporan Kuliah · Komputer Grafis (`CIF65116`)

> **Tujuan Dokumen:** Panduan poin-per-poin saat demonstrasi proyek **CYBER DEFENSE 3D** (Modul **Tower & Combat System — Yusuf**) di hadapan dosen pengampu **Komputer Grafis (`CIF65116`)**, lengkap dengan lokasi kode eksak di `res://src/combat/` dan cara menunjukkannya langsung di *gameplay* 3D.

---

## ⚡ Persiapan Sebelum Demo

1. **Verifikasi Otomatis (Headless):**
   ```bash
   godot --headless -s res://src/combat/tools/asset_generator.gd
   godot --headless -s res://tests/combat/test_combat_system.gd
   ```
   Pastikan seluruh **259 pengujian** (`52` unit test combat + `207` E2E test 3D) mencetak **`0 FAIL`** sebelum membuka editor.
2. **Menjalankan Game 3D Komplit & Arena Sandbox:**
   - **Game 3D Komplit Mandiri:** Buka `res://src/combat/game_3d/cyber_defense_3d.tscn` di Godot Editor lalu tekan **`F6`** (*Run Current Scene*).
   - **Arena Uji Sandbox 3D:** Buka `res://src/combat/sandbox/combat_sandbox.tscn` lalu tekan **`F6`**.
3. **File Kode Kunci yang Siap Dibuka di Editor saat Tanya-Jawab:**
   - Matematika & Koordinat: `src/combat/math/combat_math.gd`
   - VAO/VBO & Triangulasi: `src/combat/graphics/procedural_mesh_builder.gd`
   - Immediate Mode Laser: `src/combat/graphics/laser_beam_renderer.gd`
   - Hierarki & Mouse Picking: `src/combat/towers/tower_3d.gd` & `src/combat/game_3d/cyber_defense_3d.gd`
   - Animasi Proyektil & Musuh 3D: `src/combat/projectiles/projectile_3d.gd` & `src/combat/game_3d/entities/enemy_3d.gd`
   - 3 Custom Shader: `src/combat/shaders/range_ring_blend.gdshader`, `laser_beam_scroll.gdshader`, `freeze_crystal_phong.gdshader`

---

## 🎓 Panduan Demo 9 Topik Sumanta Guha + Shadow Mapping & Blending

### Topik 1 — World Coordinates, Scale, & Viewing Box (*Guha Bab 2*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Arahkan kamera ke arena 3D: seluruh menara, musuh, dan proyektil berada pada sistem koordinat ruang 3D $(X, Y, Z)$ dalam satuan meter.
  - Pilih/upgrade menara lalu tunjukkan bahwa jarak tembak dihitung konsisten di ruang 3D (`UNIT_SCALE = 0.1`: range GDD `150` menjadi `15.0 m`).
- **Tunjukkan di Kode:**
  - `src/combat/math/combat_math.gd` baris `14` (`UNIT_SCALE = 0.1`), baris `25-29` (`distance_3d()` dengan rumus Euclidean $\sqrt{\Delta x^2 + \Delta y^2 + \Delta z^2}$), dan baris `53-56` (`get_scaled_range_meters()`).

---

### Topik 2 — Primitives & Curved Object Approximation (*Guha Bab 2 & 10*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Klik salah satu menara untuk memunculkan **Range Ring** di permukaan tanah, dan amati **Shockwave Disc** saat `Cannon Tower` meledak.
  - Jelaskan bahwa kurva lingkaran 3D didekati dengan poligon melingkar $N = 48$ segmen (`RING_SEGMENTS`).
- **Tunjukkan di Kode:**
  - `src/combat/towers/tower_3d.gd` baris `31` (`const RING_SEGMENTS: int = 48`).
  - `src/combat/graphics/procedural_mesh_builder.gd` baris `27-68` (`build_range_ring_mesh()` dan `build_aoe_shockwave_disc()`).

---

### Topik 3 — Vertex Array, VBO (`ArrayMesh`), & Mouse Picking (*Guha Bab 3*)
- **Cara Tunjukkan di Gameplay 3D:**
  - **Mouse Picking:** Klik langsung menara di viewport 3D — raycast dari koordinat kursor layar 2D ke collider 3D menara memicu sinyal `tower_selected` dan menampilkan cincin jangkauan.
  - **VAO/VBO:** Cincin tersebut tidak diimpor dari Blender, melainkan dibangun langsung di memori GPU sebagai vertex buffer + index buffer.
- **Tunjukkan di Kode:**
  - `src/combat/graphics/procedural_mesh_builder.gd` baris `90-124` (`_new_surface_arrays()` mengisi `ARRAY_VERTEX`, `ARRAY_NORMAL`, `ARRAY_TEX_UV`, `ARRAY_COLOR`, dan `_commit()` mengunggah ke `ArrayMesh` via `add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrays)`).
  - `src/combat/towers/tower_3d.gd` baris `20` (`signal tower_selected`) & baris `53` (`_click_body: StaticBody3D`).

---

### Topik 4 — Transformation (`Basis`) & Animation (`delta`) (*Guha Bab 4, 5, & 6*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Saat musuh berjalan melewati jangkauan menara, perhatikan **kepala menara (`TurretHead`) berotasi mulus** mengikuti arah musuh, serta **peluru proyektil** meluncur menuju target tiap frame.
- **Tunjukkan di Kode:**
  - `src/combat/towers/tower_3d.gd` baris `49` (`_turret_head: Node3D`) & baris `66-70` (`_process(delta)`).
  - `src/combat/projectiles/projectile_3d.gd` baris `48-49` (`_process(delta)` memanggil `tick_movement(delta)` untuk translasi berbasis $\Delta t$).

---

### Topik 5 — Convexity & Barycentric Interpolation (*Guha Bab 7*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Perhatikan **gradasi warna radial** pada Range Ring dan Shockwave AoE dari sisi dalam (lebih transparan) menuju tepi luar (warna neon tegas). Gradasi tersebut bukan tekstur gambar, melainkan **interpolasi barycentric** oleh rasterizer GPU di antara titik-titik sudut segitiga.
- **Tunjukkan di Kode:**
  - `src/combat/graphics/procedural_mesh_builder.gd` baris `39-40` (atribut `inner_color` pada vertex dalam dan `outer_color` pada vertex luar).
  - `src/combat/shaders/range_ring_blend.gdshader` baris `18-21` (`ALBEDO = COLOR.rgb` membaca hasil interpolasi atribut vertex `COLOR`).

---

### Topik 6 — Triangulation & Winding Orientation (*Guha Bab 8 & 9*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Tunjukkan bahwa permukaan cincin jangkauan dan piringan ledakan AoE ter-render solid dari atas tanpa lubang segitiga maupun *back-face culling* yang salah.
- **Tunjukkan di Kode:**
  - `src/combat/graphics/procedural_mesh_builder.gd` baris `42-44` (`indices.append_array([b, b + 1, b + 2, b + 2, b + 1, b + 3])` memecah tiap segmen quad menjadi 2 segitiga) dan baris `66-67` (`[0, i + 1, i + 2]` untuk triangle fan shockwave).
  - Baris `9` & `109`: penjelasan eksplisit bahwa OpenGL memakai *CCW* sebagai *front face* sedangkan Godot memakai *CW* dilihat dari `+Y` dengan normal `Vector3.UP`.

---

### Topik 7 — Hierarchical Modeling & `ImmediateMesh` (*Guha Bab 10*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Saat kepala menara (`TurretHead`) berputar, posisi moncong (`Muzzle`) dan pangkal sinar laser ikut terbawa otomatis (relasi transformasi *parent-child*).
  - Saat `Laser Tower` menembak, 2 pita sinar bersilang digambar secara dinamis dari moncong ke posisi musuh menggunakan `ImmediateMesh` (padanan `glBegin(GL_TRIANGLE_STRIP)` / `glEnd()`).
- **Tunjukkan di Kode:**
  - `src/combat/towers/tower_3d.gd` baris `49-51` (`_turret_head` $\rightarrow$ `_muzzle` $\rightarrow$ `_beam_renderer`).
  - `src/combat/graphics/laser_beam_renderer.gd` baris `39-50` (`draw_beam_from_to()`) dan baris `61-71` (`_add_strip()` memanggil `_immediate.surface_begin(Mesh.PRIMITIVE_TRIANGLE_STRIP, _material)` ... `surface_end()`).

---

### Topik 8 — Color & Light: Blinn-Phong Shader + Fresnel Rim (*Guha Bab 11*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Perhatikan pantulan cahaya (*diffuse* + kilau *specular*) pada kepala menara dan proyektil, serta efek pendar tepi (*Fresnel rim*) kristal es saat `Freeze Tower` memperlambat musuh.
- **Tunjukkan di Kode:**
  - `src/combat/shaders/freeze_crystal_phong.gdshader` baris `22-37`:
    - `fragment()` (baris `22-26`): menghitung komponen **Ambient** dan **Fresnel Rim** (`pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), rim_power)`).
    - `light()` (baris `28-37`): menghitung **Lambertian Diffuse** (`max(dot(n, l), 0.0)`) dan **Blinn-Phong Specular** (`pow(max(dot(n, h), 0.0), shininess) * specular_strength`).

---

### Topik 9 — Texture Mapping & UV Scrolling (*Guha Bab 12*)
- **Cara Tunjukkan di Gameplay 3D:**
  - Amati sinar `Laser Tower` saat menembak: terlihat **pulsa energi yang mengalir** dari moncong ke target sepanjang sinar.
- **Tunjukkan di Kode:**
  - `src/combat/graphics/laser_beam_renderer.gd` baris `76-85` (`_make_pulse_texture()` membuat `GradientTexture2D` 64×1 secara prosedural).
  - `src/combat/shaders/laser_beam_scroll.gdshader` baris `14` (`repeat_enable` $\equiv$ `GL_REPEAT`, `filter_linear_mipmap`) dan baris `22-23` (`vec2 scrolled_uv = vec2(UV.x - TIME * scroll_speed, UV.y)`).

---

### Bonus RPS (Bahan Kajian 7 & 8) — Blending & Shadow Mapping
1. **Alpha Blending (`glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA)`):**
   - Di kode: `src/combat/shaders/range_ring_blend.gdshader` baris `8` (`render_mode blend_mix`) — lantai peta di bawah Range Ring tetap tampak transparan.
2. **Additive Blending (`glBlendFunc(GL_SRC_ALPHA, GL_ONE)`):**
   - Di kode: `src/combat/shaders/laser_beam_scroll.gdshader` baris `9` (`render_mode blend_add`) — sinar laser berpendar terang saat bertumpuk dengan latar belakang.
3. **Shadow Mapping:**
   - Di kode: `src/combat/shaders/freeze_crystal_phong.gdshader` baris `34` (`LIGHT_COLOR * ATTENUATION / PI`) otomatis menerima faktor bayangan dari *Shadow Map* lampu `DirectionalLight3D`, sedangkan `LaserBeamRenderer` (`laser_beam_renderer.gd` baris `25`) dan `range_ring_blend.gdshader` (baris `8`) mematikan *shadow casting* (`shadows_disabled`) agar efek energi/UI tanah tidak menghasilkan bayangan palsu.

---

## 💬 Ringkasan Cepat Tanya-Jawab Dosen

- **"Kenapa pakai Godot/Vulkan, bukan C++ OpenGL langsung?"**  
  Arsitektur *programmable pipeline* GPU-nya identik: kami tetap menyusun sendiri VAO/VBO dan index buffer triangulasi lewat `ArrayMesh`, menggambar *immediate mode* lewat `ImmediateMesh`, serta menulis sendiri *Fragment* dan *Light Shader* (Blinn-Phong, UV scrolling, Alpha/Additive blending) di `.gdshader` yang setara GLSL.
- **"Di mana bagian yang murni buatan sendiri, bukan bawaan engine?"**  
  Seluruh rumus di `CombatMath`, konstruksi vertex/index buffer `ArrayMesh` di `ProceduralMeshBuilder`, pita `TRIANGLE_STRIP` di `LaserBeamRenderer`, dan 3 file `.gdshader` ditulis dari nol sesuai teori Sumanta Guha.
