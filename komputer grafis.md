**GAME DESIGN DOCUMENT**

**CYBER DEFENSE**

*Game Tower Defense 3D Berbasis PC/Desktop Menggunakan Godot Engine* 

Rancangan Proyek Grafika Komputer Interaktif  
Platform: PC/Desktop

# **1\. Identitas Proyek**

| Komponen | Keterangan |
| :---- | :---- |
| Nama proyek | CYBER DEFENSE |
| Jenis aplikasi | Game |
| Genre | Tower Defense / Strategy |
| Platform | PC/Desktop  |
| Game Engine | Godot Engine 4.7.2 Stable |
| DImensi | 3D |
| Orientasi | Landscape (1920 x 1080 px) |
| Bahasa Pemrograman | GDScript |
| Input | Mouse dan Keyboard |
| Jumlah anggota | 4 |

# **2\. Deskripsi Game**

CYBER DEFENSE merupakan permainan bergenre Tower Defense dengan tema futuristik yang dikembangkan menggunakan Godot Engine. Permainan ini dirancang untuk platform PC/Desktop dengan lingkungan permainan berbasis tiga dimensi (3D).

Pemain bertugas melindungi Energy Core sebagai pusat energi utama dari serangan pasukan robot dan makhluk digital yang datang secara bergelombang (wave). Untuk mempertahankan Energy Core, pemain harus membangun menara pertahanan pada area yang telah disediakan di sekitar jalur pergerakan musuh.

Setiap menara memiliki karakteristik dan kemampuan serangan yang berbeda. Pemain perlu menentukan kombinasi menara serta strategi penempatan yang tepat untuk menghadapi berbagai jenis musuh. Pemain memperoleh Gold dari mengalahkan musuh dan menyelesaikan gelombang serangan. Gold tersebut dapat digunakan untuk membeli menara, meningkatkan kemampuan menara, atau mengelola pertahanan yang telah dibangun.

Permainan berakhir ketika seluruh gelombang serangan berhasil diselesaikan (Victory) atau ketika HP Energy Core mencapai nol (Game Over).

# **3\. Tujuan dan Konsep Permainan**

## **3.1 Tujuan Permainan**

Tujuan utama pemain adalah mempertahankan Energy Core dari seluruh gelombang serangan musuh. Pemain harus mengelola sumber daya, memilih jenis menara, serta menentukan strategi pertahanan agar musuh tidak mencapai Energy Core.

## **3.2 Core Gameplay Loop**

1. Pemain membuka game dan masuk ke Main Menu.  
2. Pemain memilih Play untuk memulai permainan.  
3. Pemain melihat peta, jalur musuh, area pembangunan, dan HUD.  
4. Pemain menggunakan Gold untuk membangun menara pertahanan.  
5. Pemain memulai gelombang serangan musuh.  
6. Menara secara otomatis mendeteksi dan menyerang musuh dalam jangkauannya.  
7. Pemain memperoleh Gold dari musuh yang berhasil dikalahkan.  
8. Pemain melakukan upgrade, membangun menara tambahan, atau menjual menara.  
9. Proses berulang hingga seluruh gelombang selesai atau Energy Core hancur.

## **3.3 Kondisi Kemenangan dan Kekalahan**

* Victory: pemain menyelesaikan seluruh 5 wave dan mengalahkan Boss pada wave terakhir.  
* Game Over: HP Energy Core mencapai 0\.  
* Paused: simulasi permainan berhenti sementara sampai pemain melanjutkannya.

# **4\. Mekanik Utama Permainan**

## **4.1 Sistem Peta**

Permainan menggunakan satu peta utama dengan jalur musuh yang telah ditentukan (fixed waypoint path). Peta memiliki komponen berikut:

* Enemy Spawn: lokasi awal kemunculan musuh.  
* Enemy Path: jalur yang dilalui musuh menuju Energy Core.  
* Buildable Area: area tempat pemain dapat membangun menara.  
* Energy Core: objek yang harus dilindungi pemain.  
* Obstacle: area yang tidak dapat digunakan untuk membangun menara.

Peta menggunakan sistem grid untuk mempermudah penempatan menara dan validasi area pembangunan.

## **4.2 Sistem Pergerakan Musuh**

Musuh bergerak mengikuti titik koordinat yang telah ditentukan, misalnya P0, P1, P2, hingga Energy Core. Pergerakan dihitung menggunakan koordinat X, Y, dan Z serta kecepatan masing-masing musuh.

Rumus jarak dua titik:

**d \= √((x₂ − x₁)² \+ (y₂ − y₁)² \+ (z₂ − z₁)²)**

Posisi musuh diperbarui berdasarkan delta time agar pergerakan tetap konsisten meskipun FPS berubah.

Catatan: sistem ini menggunakan Waypoint-Based Movement, bukan A\* Pathfinding, karena musuh mengikuti jalur yang sudah ditentukan dan tidak mencari rute secara dinamis.

## **4.3 Sistem Pembangunan Menara**

* Area pembangunan tidak boleh berada di jalur musuh.  
* Satu kotak grid hanya dapat ditempati satu menara.  
* Pemain harus memiliki Gold yang cukup.  
* Menara tidak dapat dibangun di atas Energy Core atau obstacle.  
* Menara dapat dipilih kembali untuk membuka menu pengelolaan.

## **4.4 Sistem Serangan Menara**

Setiap menara secara otomatis mencari musuh yang berada dalam jangkauan serangannya. Tersedia tiga mode targeting:

* Front Most: menyerang musuh yang posisinya paling dekat dengan Energy Core.  
* Lowest HP: menyerang musuh dengan HP paling rendah.  
* Closest: menyerang musuh dengan jarak terdekat dari menara.

Ketika target ditemukan, menara menembakkan proyektil menuju musuh. Proyektil bergerak secara visual dan memberikan damage ketika terjadi tabrakan dengan target.

## **4.5 Sistem Upgrade dan Sell**

Menara dapat ditingkatkan maksimal hingga level 3\. Biaya upgrade dihitung menggunakan rumus:

**Cost Upgrade \= Cost Base × 1,5^Level**

Level pada rumus adalah level menara saat ini sebelum ditingkatkan. Hasil perhitungan dibulatkan ke atas.

Menara dapat dijual dengan pengembalian sebesar 70% dari total investasi:

**Gold Kembali \= floor(Total Investasi × 0,7)**

Total investasi meliputi harga pembelian awal dan seluruh biaya upgrade yang telah dibayarkan.

# **5\. Spesifikasi Tower**

| Jenis Tower | Damage | Range | Fire Rate | Harga Awal |
| :---- | :---- | :---- | :---- | :---- |
| Laser Tower | 15 | 150 px | 0,5 detik | 100 Gold |
| Cannon Tower | 40 | 120 px | 1,5 detik | 150 Gold |
| Freeze Tower | 5 | 130 px | 1 detik | 125 Gold |
| Armor Pen Tower | 25 | 140 px | 1 detik | 175 Gold |

* Laser Tower: menyerang satu target dengan frekuensi tinggi dan damage stabil.  
* Cannon Tower: memberikan damage area (AoE) kepada beberapa musuh di sekitar titik ledakan.  
* Freeze Tower: memberikan damage kecil sekaligus memperlambat pergerakan musuh.  
* Armor Pen Tower: memberikan serangan yang mengabaikan sebagian atau seluruh nilai armor musuh.

Spesifikasi peningkatan: setiap upgrade meningkatkan damage sebesar 25% dan range sebesar 10%. Efek khusus menara tetap dipertahankan. Level maksimal adalah 3\. Nilai-nilai ini merupakan angka awal untuk diuji dan diseimbangkan selama pengembangan.

# **6\. Spesifikasi Enemy**

| Enemy | Base HP | Kecepatan | Armor | Reward |
| :---- | :---- | :---- | :---- | :---- |
| Goblin | 100 | 80 unit | 0 | 15 Gold |
| Orc | 250 | 45 unit | 10 | 25 Gold |
| Harpy | 80 | 130 unit | 0 | 20 Gold |
| Demon King | 1.500 | 35 unit | 20 | 150 Gold |

* Goblin: musuh dasar dengan HP dan kecepatan sedang.  
* Orc: musuh dengan HP tinggi dan armor yang mengurangi damage.  
* Harpy: musuh dengan kecepatan tinggi dan HP rendah.  
* Demon King: Boss dengan HP tinggi, armor, dan daya tahan lebih besar.

HP musuh meningkat berdasarkan wave dengan rumus:

**HP Musuh \= Base HP × 1,25^(N − 1\)**

N adalah nomor wave. Hasil HP dibulatkan ke atas. Rumus diterapkan pada HP dasar setiap jenis musuh.

# **7\. Sistem Wave**

| Wave | Komposisi Musuh | Keterangan |
| :---- | :---- | :---- |
| 1 | 5 Goblin | Pengenalan mekanik dasar |
| 2 | 6 Goblin, 2 Harpy | Pengenalan musuh cepat |
| 3 | 5 Goblin, 3 Orc | Pengenalan musuh dengan armor |
| 4 | 4 Goblin, 3 Orc, 3 Harpy | Kombinasi berbagai tipe musuh |
| 5 | 1 Demon King, 4 Orc, 4 Harpy | Pertarungan Boss |

Setiap wave memiliki jeda sebelum dimulai agar pemain dapat mempersiapkan pertahanan. Wave berikutnya hanya dapat dimulai ketika seluruh musuh pada wave sebelumnya telah dikalahkan dan pemain menekan tombol Start Wave.

Bonus Gold penyelesaian wave dihitung menggunakan rumus:

**Gold Wave \= 50 \+ floor(0,8 × N × 10\)**

N adalah nomor wave. Bonus diberikan setelah seluruh musuh dalam satu wave dikalahkan. Reward dari mengalahkan musuh tetap diberikan secara terpisah.

# **8\. Sistem Ekonomi**

Gold merupakan sumber daya utama untuk membangun dan mengembangkan pertahanan.

Sumber Gold:

* Mengalahkan musuh.  
* Menyelesaikan wave.  
* Mengalahkan Boss.

Ketentuan ekonomi:

* Gold bertambah ketika musuh dikalahkan.  
* Pemain tidak dapat membeli menara atau melakukan upgrade jika Gold tidak mencukupi.  
* Penjualan menara mengembalikan 70% dari total investasi.  
* Gold tidak boleh bernilai negatif.

# **9\. Sistem Antarmuka (UI/UX)**

## **9.1 Main Menu**

Menampilkan logo dan judul CYBER DEFENSE, tombol Play, Settings, How to Play, serta Exit atau tombol kembali.

## **9.2 Gameplay HUD**

* Gold: jumlah sumber daya yang dimiliki.  
* Wave: gelombang serangan saat ini.  
* Base HP: kondisi Energy Core.  
* Game Speed: kecepatan permainan.  
* Tombol Start Wave.  
* Tombol Pause.

## **9.3 Tower Interaction Menu**

Ketika pemain memilih menara, muncul menu radial atau menu melingkar yang berisi informasi nama dan level menara, damage, range, tombol Upgrade, tombol Sell, serta pilihan mode targeting.

## **9.4 Game Control**

| Mode | Fungsi |
| :---- | :---- |
| Pause | Menghentikan sementara permainan |
| 1x | Kecepatan normal |
| 2x | Kecepatan dua kali lebih cepat |

## **9.5 Game Over dan Victory**

Game Over menampilkan informasi kekalahan, wave terakhir yang berhasil diselesaikan, total musuh yang dikalahkan, tombol Retry, dan Main Menu.

Victory menampilkan informasi kemenangan, total wave yang diselesaikan, total musuh yang dikalahkan, tombol Play Again, dan Main Menu.

# **10\. Konsep Grafika Komputer yang Diterapkan**

## **10.1 Sistem Koordinat Tiga Dimensi**

Permainan CYBER DEFENSE menggunakan lingkungan tiga dimensi yang direpresentasikan melalui sumbu X, Y, dan Z. Sistem koordinat tersebut digunakan untuk menentukan posisi objek permainan, seperti menara pertahanan, musuh, Energy Core, proyektil, dan elemen lingkungan.

## **10.2 Transformasi Geometri 3D**

Transformasi geometri digunakan untuk mengatur perubahan posisi, orientasi, dan ukuran objek dalam lingkungan permainan. Transformasi yang diterapkan meliputi translation untuk memindahkan objek, rotation untuk mengubah orientasi objek, dan scaling untuk mengatur ukuran objek.

## **10.3 Kamera dan Proyeksi 3D**

Kamera digunakan untuk menentukan sudut pandang pemain terhadap lingkungan permainan. Pengaturan kamera memengaruhi bagaimana objek tiga dimensi ditampilkan pada layar. Sudut pandang kamera disesuaikan dengan rancangan visual permainan agar pemain dapat mengamati jalur musuh dan posisi menara secara jelas.

## **10.4 Rendering, Material, dan Pencahayaan**

Rendering digunakan untuk menampilkan objek tiga dimensi ke dalam layar. Material dan pencahayaan digunakan untuk membentuk tampilan visual objek, memberikan perbedaan karakteristik permukaan, serta meningkatkan keterbacaan elemen permainan.

## **10.5 Deteksi Tabrakan 3D**

Deteksi tabrakan digunakan untuk mengetahui interaksi antarobjek dalam lingkungan tiga dimensi. Penerapannya dapat digunakan pada interaksi proyektil dengan musuh, interaksi musuh dengan Energy Core, serta validasi penempatan menara.

## **10.6 Perhitungan Jarak dan Jangkauan**

Perhitungan jarak digunakan untuk menentukan apakah musuh berada dalam jangkauan serangan menara. Perhitungan dilakukan berdasarkan posisi objek dalam ruang tiga dimensi. Hasil perhitungan tersebut digunakan dalam proses pencarian target dan pengendalian serangan menara.

## **10.7 Animasi dan Delta Time**

Animasi digunakan untuk memberikan pergerakan pada objek permainan, seperti musuh, menara, dan proyektil. Delta time digunakan dalam perhitungan pergerakan agar perubahan posisi objek tetap konsisten terhadap waktu dan tidak bergantung secara langsung pada jumlah frame per second.

## **10.8 Particle System dan Efek Visual**

Particle system digunakan untuk menghasilkan efek visual seperti percikan energi, ledakan, efek tembakan, dan kehancuran musuh. Efek tersebut mendukung penyampaian informasi visual sekaligus meningkatkan pengalaman bermain.

## **10.9 Transparansi dan Visual Effects**

Transparansi digunakan untuk menampilkan elemen visual seperti indikator jangkauan serangan, efek energi, dan overlay antarmuka. Penggunaan efek visual disesuaikan agar tidak mengganggu keterbacaan informasi permainan.

# **11\. Audio dan Sound Effect**

Sistem audio pada CYBER DEFENSE dikembangkan menggunakan fitur pengelolaan audio yang tersedia pada Godot Engine. Audio digunakan untuk mendukung suasana permainan serta memberikan umpan balik terhadap tindakan pemain dan peristiwa yang terjadi selama permainan.

Efek suara yang direncanakan meliputi suara tembakan tower, ledakan, musuh terkena serangan, musuh dikalahkan, tombol antarmuka, dimulainya wave, kemunculan Boss, dan musik latar permainan.

Pengaturan audio direncanakan menyediakan kontrol volume dan fitur mute agar pemain dapat menyesuaikan keluaran suara sesuai kebutuhan.

# **12\. Penyimpanan Data**

Penyimpanan data dilakukan menggunakan mekanisme penyimpanan lokal yang tersedia pada Godot Engine. Penyimpanan digunakan untuk mempertahankan informasi permainan tertentu tanpa memerlukan server atau database daring.

Data yang direncanakan untuk disimpan meliputi:

* High Score.  
* Highest Wave.  
* Total Enemies Defeated.  
* Pengaturan volume.  
* Status mute.  
* Rekor kemenangan.

Mekanisme dan format penyimpanan akan disesuaikan dengan kebutuhan implementasi permainan.

# **13\. Arsitektur dan Struktur Proyek Godot**

CYBER DEFENSE dikembangkan menggunakan Godot Engine dengan pendekatan pengembangan berbasis scene dan node. Setiap bagian permainan dirancang agar dapat dikelola secara terpisah sesuai dengan fungsi dan tanggung jawabnya.

Secara umum, struktur permainan direncanakan terdiri atas beberapa bagian berikut:

1. **Main Menu:** mengelola tampilan awal dan navigasi permainan.  
2. **Gameplay:** mengelola lingkungan permainan, jalur musuh, area pembangunan, dan Energy Core.  
3. **Tower System:** mengelola pembangunan, pemilihan, peningkatan, dan pengelolaan menara pertahanan.  
4. **Enemy System:** mengelola kemunculan, pergerakan, kondisi, dan interaksi musuh.  
5. **Combat System:** mengelola serangan, target, proyektil, dan perhitungan damage.  
6. **Wave System:** mengelola urutan dan komposisi gelombang serangan.  
7. **Economy System:** mengelola Gold, pembelian, upgrade, dan penjualan menara.  
8. **User Interface:** mengelola HUD, menu interaksi, pengaturan, Pause, Victory, dan Game Over.

Pembagian scene, node, script, serta hubungan antarsistem akan disesuaikan dengan struktur project Godot yang digunakan selama pengembangan.

# **14\. Pembagian Tugas Anggota**

| Anggota | Tanggung Jawab | Fokus Pekerjaan |
| :---- | :---- | :---- |
| Zulfan  | Project Manager & UI/UX Designer  | Perencanaan, desain antarmuka, aset visual, koordinasi, dan integrasi UI  |
| Abiyu | Core Game Logic  | Alur permainan, pergerakan musuh, sistem peta, dan game state  |
| Ucup | Tower & Combat System  | Tower, musuh, targeting, serangan, proyektil, dan damage  |
| Nur | Economy & Supporting System  | Gold, pembelian, upgrade, sell, audio, efek pendukung, dan integrasi  |

## **Zulfan — Project Manager dan UI/UX Designer**

* Mengatur perencanaan dan pembagian pekerjaan tim.  
* Merancang antarmuka Main Menu, Gameplay HUD, Pause Menu, Settings, Victory, dan Game Over.  
* Menentukan design system yang mencakup warna, tipografi, ikon, dan komponen antarmuka.  
* Menyiapkan aset visual yang dibutuhkan untuk mendukung tampilan permainan.  
* Mengimplementasikan dan mengintegrasikan antarmuka ke dalam project Godot.  
* Melakukan koordinasi dan pemantauan progres pengembangan.

Output: Rancangan UI/UX, aset visual, implementasi antarmuka, dan koordinasi integrasi proyek.

## **Abiyu — Core Game Logic**

* Mengembangkan alur utama permainan.  
* Mengimplementasikan sistem pergerakan musuh berdasarkan jalur yang ditentukan.  
* Mengelola sistem peta dan posisi objek permainan.  
* Mengembangkan pengelolaan kondisi permainan (game state).  
* Mengatur alur dimulainya permainan, wave, Pause, Victory, dan Game Over sesuai pembagian modul.

Output: Sistem inti permainan, pergerakan musuh, pengelolaan peta, dan game state.

## **Yusuf — Tower dan Combat System**

* Mengembangkan jenis-jenis menara pertahanan.  
* Mengimplementasikan sistem pencarian dan pemilihan target.  
* Mengembangkan sistem serangan dan proyektil.  
* Mengimplementasikan perhitungan damage dan interaksi serangan dengan musuh.  
* Mengembangkan kemampuan khusus setiap jenis menara.  
* Mengelola interaksi antara tower dan enemy.

Output: Sistem tower, targeting, combat, proyektil, dan perhitungan damage.

## **Nur — Economy dan Supporting System**

* Mengembangkan sistem Gold dan reward.  
* Mengimplementasikan pembelian menara.  
* Mengembangkan sistem upgrade dan penjualan menara.  
* Mengelola perhitungan biaya serta pengembalian Gold.  
* Mengembangkan sistem audio dan efek pendukung.  
* Membantu integrasi sistem ekonomi dengan sistem permainan.

Output: Sistem ekonomi, audio, efek pendukung, dan integrasi modul terkait.

Setiap anggota bertanggung jawab melakukan pengujian terhadap modul yang dikembangkan. Selanjutnya, seluruh modul diintegrasikan dan diuji bersama untuk memastikan permainan dapat berjalan sesuai rancangan.

# **15\. Rencana Pengembangan**

| Tahap | Kegiatan | Target Hasil |
| :---- | :---- | :---- |
| 1 | Finalisasi GDD dan desain peta | Dokumen dan rancangan visual |
| 2 | Persiapan Project Godot | Project dan Struktur awal |
| 3 | Implementasi core game logic  | Game state dan pergerakan musuh  |
| 4 | Implementasi tower dan combat  | Tower dapat menyerang musuh |
| 5 | Implementasi wave dan ekonomi | Sistem permainan berjalan  |
| 6 | Implementasi UI dan audio | Antarmuka dan audio terintegrasi  |
| 7 | Implementasi efek visual  | Efek permainan berjalan  |
| 8 | Integrasi dan pengujian | Game dapat dimainkan dari awal hingga akhir  |
| 9 | Penyusunan laporan dan demonstrasi | Hasil akhir proyek |

# **16\. Pengujian Sistem**

| No. | Skenario Pengujian | Hasil yang Diharapkan |
| :---- | :---- | :---- |
| 1 | Memulai permainan | Gameplay berhasil ditampilkan |
| 2 | Membangun menara | Menara muncul pada grid yang valid |
| 3 | Membangun menara pada jalur musuh | Sistem menolak pembangunan |
| 4 | Gold tidak mencukupi | Pembelian atau upgrade ditolak |
| 5 | Musuh masuk jangkauan menara | Menara menyerang musuh |
| 6 | Proyektil mengenai musuh | HP musuh berkurang |
| 7 | Musuh dikalahkan | Gold bertambah |
| 8 | Melakukan upgrade | Level dan kemampuan menara meningkat |
| 9 | Menjual menara | Gold dikembalikan sesuai aturan |
| 10 | Menekan Pause | Seluruh simulasi berhenti |
| 11 | Mengubah kecepatan permainan | Kecepatan berubah sesuai pilihan |
| 12 | Musuh mencapai Energy Core | HP Energy Core berkurang |
| 13 | HP Energy Core mencapai nol | Game Over ditampilkan |
| 14 | Menyelesaikan wave terakhir | Victory ditampilkan |
| 15 | Menutup dan Menjalankan kembali aplikasi | Rekor dan pengaturan tersimpan |

# **17\. Batasan Pengembangan (MVP)**

Agar proyek dapat diselesaikan sesuai waktu yang tersedia, ruang lingkup awal dibatasi sebagai berikut:

* Hanya menggunakan satu peta utama.  
* Menggunakan sistem jalur musuh berbasis waypoint.  
* Menggunakan sistem penempatan menara berbasis grid.  
* Menyediakan empat jenis menara.  
* Menyediakan empat jenis musuh.  
* Menyediakan lima wave dengan satu Boss utama.  
* Menyediakan tiga level menara.  
* Menggunakan satu Energy Core.  
* Tidak menggunakan sistem multiplayer.  
* Tidak memerlukan akun atau server database.  
* Tidak menggunakan sistem pathfinding dinamis.

Fitur tambahan seperti peta baru, variasi Boss, skill khusus pemain, dan sistem level dapat dikembangkan jika seluruh fitur MVP telah berjalan dengan stabil.

# **18\. Kesimpulan**

CYBER DEFENSE dirancang sebagai game Tower Defense berbasis PC/Desktop yang menggabungkan strategi, pengelolaan sumber daya, pergerakan objek, dan interaksi pengguna. Game ini tidak hanya berfokus pada mekanik permainan, tetapi juga menerapkan konsep Grafika Komputer seperti transformasi geometri, sistem koordinat, deteksi tabrakan, perhitungan jarak, rendering, transparansi, dan particle system.

Dengan pembagian tugas berdasarkan modul, penggunaan JavaScript berorientasi objek, serta ruang lingkup MVP yang terukur, proyek diharapkan dapat dikembangkan secara terstruktur dan memenuhi tujuan mata kuliah Grafika Komputer Interaktif.

