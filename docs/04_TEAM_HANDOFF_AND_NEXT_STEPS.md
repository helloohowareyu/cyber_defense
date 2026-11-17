# Handoff Tim & Langkah Lanjutan Integrasi (`CYBER DEFENSE`)

> **Ditujukan untuk:** Anggota Tim (`Zulfan`, `Abiyu`, `Nur`)  
> **Disusun oleh:** Yusuf (`Tower & Combat System`)  
> **Branch:** `feat/yusuf-tower-combat` (Godot Engine `4.7.2 Stable` · Vulkan `Forward+`)

---

## 1. Apa yang Sudah Selesai Dikerjakan (Siap Pakai)

Seluruh modul **Tower & Combat 3D** sudah selesai dibangun secara terisolasi di dalam `res://src/combat/` dan telah lulus **52/52 unit & integration test** (`res://tests/combat/test_combat_system.gd`):

1. **Matematika Combat & Grafika 3D ([`CombatMath`](../src/combat/math/combat_math.gd)):**
   - Jarak Euclidean 3D, konversi skala GDD ke meter (`UNIT_SCALE = 0.1`), scaling damage (`+25%/lv`) & range (`+10%/lv`) Lv.1–3, flat armor reduction (`max(1.0, dmg - armor)`), scaling HP enemy per wave (`1.25^(N-1)`), biaya upgrade (`ceil(base * 1.5^L)`), refund sell (`floor(invested * 0.7)`), dan rotasi matriks `Basis` turret.
2. **Data Preset `.tres` (GDD Tabel 5 & 6):**
   - 4 preset Tower (`laser_tower.tres`, `cannon_tower.tres`, `freeze_tower.tres`, `armor_pen_tower.tres`) dan 4 preset Enemy (`goblin.tres`, `orc.tres`, `harpy.tres`, `demon_king.tres`) di `res://src/combat/resources/presets/`.
3. **Sistem Menara & Proyektil (`Tower3D` & `Projectile3D`):**
   - [`Tower3D`](../src/combat/towers/tower_3d.gd): rotasi kepala menghadap target, cooldown tembak, 3 mode targeting (`FRONT_MOST`, `LOWEST_HP`, `CLOSEST`), klik mouse 3D (*Mouse Picking*) yang memancarkan `tower_selected`, serta sistem upgrade Lv.1–3.
   - [`Projectile3D`](../src/combat/projectiles/projectile_3d.gd): gerak berbasis `delta`, ledakan AoE `3.5m` untuk Cannon + shockwave, serta aman jika target mati di tengah jalan.
4. **Adapter Target Musuh ([`CombatTargetComponent`](../src/combat/components/combat_target_component.gd)):**
   - Node komponen yang menyimpan HP, Armor, dan status Slow (`Freeze` `40%` selama `2.5s`, tidak menumpuk) lengkap dengan visual kristal es.
5. **Geometri Prosedural & 3 Custom Shader (Kurikulum Grafika Komputer):**
   - `ArrayMesh` VAO/VBO untuk cincin jangkauan menara (`Range Ring`) & piringan shockwave AoE, `ImmediateMesh` untuk sinar `Laser Tower`, serta 3 shader `.gdshader` (*Alpha Blending*, *UV Scroll + Additive Blending*, dan *Blinn-Phong + Fresnel*).
6. **Sandbox Pengujian Mandiri ([`combat_sandbox.tscn`](../src/combat/sandbox/combat_sandbox.tscn)):**
   - Scene 3D mandiri berisi 4 Tower aktif + spawner `MockEnemy3D` yang sudah bisa langsung dijalankan di Godot 4.7.2 (**F6**).

---

## 2. Apa yang Masih Perlu Dilanjutkan (Integrasi Tim)

Saat menggabungkan modul ini dengan modul anggota tim lain, tinggal **4 titik sambungan** berikut yang perlu dihubungkan:

### A. Integrasi dengan Modul Abiyu (`Core Logic, Peta 3D, & Enemy Movement`)
- [ ] **Tempelkan `CombatTargetComponent`** sebagai *child node* pada setiap scene Enemy 3D (`Goblin`, `Orc`, `Harpy`, `Demon King`), lalu isi properti `combat_data` dengan preset `.tres` yang sesuai dan panggil `initialize_for_wave(wave_num)` saat spawn.
- [ ] **Update `path_progress`:** Di script gerak musuh milik Abiyu, perbarui `combat_target.path_progress += jarak_tempuh` tiap frame agar mode targeting `FRONT_MOST` akurat.
- [ ] **Dengarkan 2 sinyal dari `CombatTargetComponent`:**
  - `speed_multiplier_changed(multiplier: float)` $\rightarrow$ kalikan kecepatan gerak musuh dengan `multiplier` (`0.6` saat terkena `Freeze Tower`, kembali `1.0` setelah `2.5` detik).
  - `target_defeated(reward_gold: int, world_position: Vector3)` $\rightarrow$ kurangi jumlah musuh aktif di `WaveManager` dan hapus node musuh.
- [ ] **Kalibrasi skala peta (opsional):** Jika ukuran peta 3D Abiyu berbeda dari asumsi `150 GDD = 15.0 meter`, cukup ubah 1 konstanta `CombatMath.UNIT_SCALE` di `combat_math.gd`.

### B. Integrasi dengan Modul Nur (`Economy & Audio`)
- [ ] **Reward Gold:** Hubungkan `CombatTargetComponent.target_defeated` ke fungsi penambah Gold di `EconomyManager`.
- [ ] **Pembelian, Upgrade, & Sell Tower:**
  - Saat pemain menekan tombol **Upgrade** di UI, cek `tower.can_upgrade()` dan `gold >= tower.get_next_upgrade_cost()`. Jika cukup, potong Gold lalu panggil `tower.apply_upgrade()`.
  - Saat pemain menekan **Sell**, tambahkan `tower.get_sell_refund_gold()` ke saldo Gold lalu `tower.queue_free()`.
- [ ] **Audio SFX:** Hubungkan sinyal `Tower3D.tower_fired`, `Tower3D.tower_upgraded`, `Projectile3D.projectile_impacted`, dan `CombatTargetComponent.target_defeated` ke pemutar audio (`Sfx`).

### C. Integrasi dengan Modul Zulfan (`UI/UX & Tower Interaction Menu`)
- [ ] **Buka Menu Interaksi Tower:** Dengarkan sinyal `Tower3D.tower_selected(tower_instance)` untuk menampilkan Radial/Panel Menu, lalu panggil `tower_instance.get_ui_summary()` untuk mengisi teks Nama, Level, Damage, Range, Biaya Upgrade, dan Refund Sell.
- [ ] **Ubah Mode Targeting:** Panggil `tower_instance.set_targeting_mode(mode)` dari tombol pilihan (`FRONT_MOST`, `LOWEST_HP`, `CLOSEST`).
- [ ] **Tutup Menu:** Panggil `tower_instance.set_range_indicator_visible(false)` saat pemain menutup menu atau mengklik area kosong.

### D. Penyelarasan Scene Utama (`project.godot`)
- [ ] Saat proyek tim sudah beralih penuh ke scene utama 3D, ubah `run/main_scene` di `project.godot` dan bersihkan scene percobaan 2D (`Scenes/` & `tests/Uji2D.*`) apabila sudah tidak digunakan.
