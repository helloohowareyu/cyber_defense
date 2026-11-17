// range_ring_blend.gdshader
// [FUNGSI]: Indikator jangkauan menara & shockwave AoE dengan alpha blending transparan.
// [REFERENSI_KURIKULUM]: Guha Bab 7 (interpolasi warna vertex oleh rasterizer), RPS Bahan Kajian 8
//   (Blending): blend_mix == glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA).
// [ARAH_INTERAKSI]: Dipakai via `ProceduralMeshBuilder.make_ring_material()` oleh `Tower3D`
//   (range ring) dan `Projectile3D` (shockwave, parameter `fade` dianimasikan Tween).
shader_type spatial;
render_mode blend_mix, unshaded, cull_disabled, depth_draw_never, shadows_disabled;

// [FUNGSI]: Kecepatan denyut transparansi (siklus per detik).
uniform float pulse_speed = 0.8;
// [FUNGSI]: Seberapa besar denyut mengurangi alpha (0 = tanpa denyut).
uniform float pulse_strength : hint_range(0.0, 1.0) = 0.25;
// [FUNGSI]: Pengali alpha global; 1 = penuh, 0 = hilang (fade-out shockwave).
uniform float fade : hint_range(0.0, 1.0) = 1.0;

void fragment() {
	// COLOR = hasil interpolasi barycentric warna vertex ArrayMesh (inner -> outer).
	float pulse = 1.0 - pulse_strength * (0.5 + 0.5 * sin(TIME * pulse_speed * TAU));
	ALBEDO = COLOR.rgb;
	ALPHA = COLOR.a * pulse * fade;
}
