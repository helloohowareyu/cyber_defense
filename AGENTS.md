# Agentic AI Directives · Cyber Defense Project (Godot 4.7.2)

Set aturan dan instruksi operasional wajib bagi AI Agent (**Antigravity CLI / IDE** dan **AI Lokal Ollama**) saat membaca, merancang, atau menulis kode di dalam repositori ini.

---

## 🛑 1. Filosofi Inti: Ponytail ("The Laziest Senior Dev in the Room")
*Diadaptasi dari `DietrichGebert/ponytail` & Karpathy Guidelines (`Simplicity First`).*

> **"The best code is the code you never wrote."**

1. **Strict YAGNI (You Aren't Gonna Need It):** Dilarang keras menulis kode untuk fitur masa depan yang belum diminta.
2. **Anti-Overengineering:** Jangan buat hirarki class, factory pattern, abstract wrapper, atau node controller tambahan jika 1 fungsi statis murni (`static func`) di bawah 30 baris sudah menyelesaikan masalah.
3. **Gunakan Native Engine:** Manfaatkan fungsi bawaan Godot 4 (`Mathf`, `Basis`, `Transform3D`, `ArrayMesh`, `Resource`, `Tween`, `Area3D`) daripada membuat implementasi matematika/vektor manual yang panjang.
4. **Hapus Kode Mati & Bloat:** Jangan biarkan fungsi tidak terpakai, variabel sisa eksperimen, atau blok kode duplikat berada di file produksi.

---

## 🎨 2. Anti-AI-Slop: Standar Desain UI/UX & Interaksi (Godot 4)
*Diadaptasi dari `miqdadbadjuber/anti-slop`, `MrEliptik/godot_ui_components`, dan Best Practices Godot UI.*

Hindari gejala khas "AI Slop" pada UI/UX:
1. **Dilarang Hardcoded Pixel Coordinates:** Jangan mengatur posisi elemen UI dengan offset pixel manual (`position.x = 240`) yang akan pecah saat resolusi layar berubah.
2. **Gunakan Container Hierarchy:** Selalu susun antarmuka menggunakan node Container Godot:
   - `MarginContainer` untuk margin/padding tepi.
   - `VBoxContainer` / `HBoxContainer` / `GridContainer` untuk perataan otomatis.
   - `Control.anchors_preset` (contoh: `PRESET_BOTTOM_RIGHT`, `PRESET_CENTER`).
3. **Hierarki Visual & Kontras Jelas:**
   - Elemen penting (indikator HP, tombol konfirmasi beli menara) harus memiliki kontras tinggi dan mudah dibaca.
   - Hindari palet warna acak/terlalu jenuh; gunakan theme warna konsisten (Cyberpunk / Tactical: dark slate background, accent cyan/amber/crimson).
4. **Clean Interactive Feedback:** Setiap interaksi mouse (klik menara, hover tombol, upgrade) wajib memiliki feedback visual instan (perubahan warna hover, highlight outline, atau indikator jangkauan `Range Ring`).

---

## 📝 3. Aturan Wajib Penulisan Kode & Komentar Singkat di Atas Kode

Setiap fungsi, sinyal, dan variabel penting **WAJIB** memiliki komentar ringkas langsung di atasnya (`##` doc-comment resmi Godot 4) agar fungsi dan alur kodenya langsung dipahami:

### Format Komentar Fungsi:
```gdscript
## [FUNGSI]: Menghitung damage bersih setelah dikurangi armor musuh (minimal 1.0).
## [INPUT/OUTPUT]: raw_damage (float), target_armor (float), ignore_armor (bool) -> float
static func calculate_final_damage(raw_damage: float, target_armor: float, ignore_armor: bool) -> float:
	var effective_armor: float = 0.0 if ignore_armor else maxf(0.0, target_armor)
	return maxf(1.0, raw_damage - effective_armor)
```

### Format Komentar Sinyal & Variabel:
```gdscript
## [FUNGSI]: Dipancarkan saat menara selesai di-upgrade (didengar oleh sistem Economy & UI).
signal tower_upgraded(new_level: int, stats: TowerStatsData)

## [FUNGSI]: Kecepatan gerak proyektil dalam meter per detik (skala 3D Godot).
@export var projectile_speed: float = 12.0
```

---

## 🧱 4. Arsitektur Bersih GDScript 2.0 (Godot 4.7.2)
*Berdasarkan `godotengine/godot-docs` & `GDQuest/GDScript-guidelines`.*

1. **100% Strict Static Typing:** Wajib mencantumkan tipe data pada semua variabel, parameter, dan return value (`func hit(dmg: float) -> void:`).
2. **Prinsip "Call Down, Signal Up":**
   - Node induk boleh memanggil method milik node anak (`$Child.do_action()`).
   - Node anak **DILARANG KERAS** memanggil `get_parent().do_action()` atau `get_node("../../UI/...")`. Gunakan **`signal`** ke atas!
3. **Pemisahan Data & Logika:** Gunakan file `Resource` (`.tres` / `.gd`) untuk menyimpan parameter angka/spesifikasi (damage, harga, jarak), bukan menaruhnya di dalam script visual node.
4. **Surgical Scope Modul Yusuf:** Fokus hanya pada sistem menara, proyektil, shader, dan combat math (`res://src/combat/`). Modul tim lain (Abiyu/Nur/Zulfan) dihubungkan lewat sinyal dan Adapter Component.
