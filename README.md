# Cyber Defense — Tower Defense 2D

Game tower defense 2D berbasis Godot 4. Pemain membangun menara di sepanjang jalur untuk menghentikan gelombang musuh sebelum musuh mencapai base.

## Fitur

- Dua level berurutan: Hutan Terlupakan dan Gurun Berliku.
- Gelombang musuh dengan tipe normal, cepat, tank, berlapis, antilambat, dan boss.
- Empat menara: Gatling, Penyembur Api, Sinar Laser, dan Peledak.
- Upgrade menara, prioritas target, dan penjualan menara.
- Efek perlambat pada Sinar Laser.
- Base dengan indikator HP, HUD gelombang, boss bar, pause, pengaturan audio, kredit, dan layar hasil.
- Progres level tersimpan secara lokal.

## Kontrol

- Klik item di toko, lalu klik area kosong untuk membangun menara.
- Klik menara untuk membuka detail, upgrade, mengubah prioritas, atau menjual.
- `Esc` untuk pause.
- Klik kanan atau `Esc` saat menempatkan menara untuk membatalkan.

## Struktur Proyek

- `Scenes/main/` — autoload, data permainan, pengaturan, audio, dan scene utama.
- `Scenes/maps/` — peta, jalur, spawner, dan logika base.
- `Scenes/enemies/` — pergerakan dan statistik musuh.
- `Scenes/turrets/` — basis menara, proyektil, sinar laser, dan menara peledak.
- `Scenes/ui/` — HUD, toko menara, pause, pengaturan, kredit, dan hasil.
- `tests/` — scene tes regresi Godot.

## Menjalankan

1. Buka folder proyek ini di Godot 4.7 atau versi kompatibel.
2. Jalankan scene utama `res://Scenes/ui/mainMenu/mainMenu.tscn`.

## Catatan Aset

Folder `Assets/` **tidak disertakan** dalam repositori ini. Semua gambar, tekstur, sprite, audio, musik, font, dan aset visual lainnya dikecualikan karena merupakan aset pihak ketiga atau aset berlisensi. Untuk menjalankan proyek secara lengkap, tambahkan aset yang Anda miliki sendiri dengan struktur path yang sama seperti yang dirujuk oleh scene dan `Data.gd`.

## Kepemilikan

Kode sumber dalam repositori ini milik pemilik akun `helloohowareyu`. Aset visual dan audio tidak dialihkan kepemilikannya dan tidak boleh didistribusikan ulang tanpa izin dari pemilik lisensinya.
