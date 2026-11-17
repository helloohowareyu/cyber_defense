// freeze_crystal_phong.gdshader
// [FUNGSI]: Pencahayaan eksplisit Blinn-Phong (ambient + Lambert diffuse + specular) + Fresnel rim.
// [REFERENSI_KURIKULUM]: Guha Bab 11 (Color & Light: model Phong), RPS Bahan Kajian 6 (Lighting)
//   dan 7 (Shadow Mapping: ATTENUATION sudah memuat faktor bayangan dari shadow map lampu).
// [ARAH_INTERAKSI]: Dipakai via `ProceduralMeshBuilder.make_phong_material()` oleh kepala
//   `Tower3D`, bola `Projectile3D`, dan kristal es `CombatTargetComponent`.
shader_type spatial;
render_mode cull_back;

// [FUNGSI]: Warna material (k_d); diisi per menara/efek.
uniform vec4 base_color : source_color = vec4(0.6, 0.85, 1.0, 1.0);
// [FUNGSI]: Komponen ambient Phong (k_a), ditambahkan sebagai emisi konstan.
uniform float ambient_strength : hint_range(0.0, 1.0) = 0.12;
// [FUNGSI]: Eksponen kilau specular (s) pada max(N.H, 0)^s.
uniform float shininess : hint_range(1.0, 256.0) = 48.0;
// [FUNGSI]: Kekuatan specular (k_s).
uniform float specular_strength : hint_range(0.0, 4.0) = 1.2;
// [FUNGSI]: Warna dan ketajaman rim Fresnel (tepi bercahaya khas kristal/energi).
uniform vec4 rim_color : source_color = vec4(0.75, 0.95, 1.0, 1.0);
uniform float rim_power : hint_range(0.5, 8.0) = 3.0;

void fragment() {
	ALBEDO = base_color.rgb;
	float fresnel = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), rim_power);
	EMISSION = base_color.rgb * ambient_strength + rim_color.rgb * fresnel * 0.6;
}

void light() {
	// Semua vektor dalam view space: N normal, L arah ke lampu, V arah ke kamera.
	vec3 n = normalize(NORMAL);
	vec3 l = normalize(LIGHT);
	vec3 h = normalize(l + normalize(VIEW));
	// LIGHT_COLOR sudah dikali PI oleh Godot, jadi dibagi PI agar sesuai model klasik.
	vec3 radiance = LIGHT_COLOR * ATTENUATION / PI;
	DIFFUSE_LIGHT += max(dot(n, l), 0.0) * radiance;
	SPECULAR_LIGHT += pow(max(dot(n, h), 0.0), shininess) * specular_strength * radiance;
}
