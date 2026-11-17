// laser_beam_scroll.gdshader
// [FUNGSI]: Sinar Laser Tower: tekstur pulsa yang digeser sepanjang UV + additive blending (glow).
// [REFERENSI_KURIKULUM]: Guha Bab 12 (Texture: koordinat (u,v), wrapping GL_REPEAT, filtering),
//   RPS Bahan Kajian 2 (Shading Language), 4 (Texture Mapping), 8 (Blending):
//   blend_add == glBlendFunc(GL_SRC_ALPHA, GL_ONE).
// [ARAH_INTERAKSI]: Dipakai `LaserBeamRenderer` (ImmediateMesh). `pulse_texture` diisi
//   GradientTexture2D prosedural dari `LaserBeamRenderer._make_pulse_texture()`.
shader_type spatial;
render_mode blend_add, unshaded, cull_disabled, depth_draw_never, shadows_disabled;

// [FUNGSI]: Warna dasar sinar (diisi dari `TowerStatsData.accent_color`).
uniform vec4 beam_color : source_color = vec4(0.2, 0.9, 1.0, 1.0);
// [FUNGSI]: Tekstur pulsa 1D; repeat_enable = wrapping GL_REPEAT, filter linear + mipmap.
uniform sampler2D pulse_texture : source_color, repeat_enable, filter_linear_mipmap;
// [FUNGSI]: Kecepatan geser tekstur sepanjang sinar (UV per detik).
uniform float scroll_speed = 6.0;
// [FUNGSI]: Pengali terang sinar.
uniform float intensity = 2.5;

void fragment() {
	// UV.x = jarak sepanjang sinar (meter * 0.5), UV.y = 0..1 melintang lebar pita.
	vec2 scrolled_uv = vec2(UV.x - TIME * scroll_speed, UV.y);
	float pulse = texture(pulse_texture, scrolled_uv).r;
	float core = 1.0 - abs(UV.y - 0.5) * 2.0;
	ALBEDO = beam_color.rgb * (0.4 + pulse) * intensity;
	ALPHA = core * core;
}
