extends Node

const SOUND_PATHS := {
	"base_hit": "res://Assets/sfx/base_hit.wav",
	"defeat": "res://Assets/sfx/defeat.wav",
	"enemy_die": "res://Assets/sfx/enemy_die.wav",
	"explosion": "res://Assets/sfx/explosion.wav",
	"sell_coin": "res://Assets/sfx/sell_coin.wav",
	"shoot_fast": "res://Assets/sfx/shoot_fast.wav",
	"shoot_heavy": "res://Assets/sfx/shoot_heavy.wav",
	"shoot_laser": "res://Assets/sfx/shoot_laser.wav",
	"tower_place": "res://Assets/sfx/tower_place.wav",
	"ui_click": "res://Assets/sfx/ui_click.wav",
	"upgrade": "res://Assets/sfx/upgrade.wav",
	"victory": "res://Assets/sfx/victory.wav",
	"wave_start": "res://Assets/sfx/wave_start.wav",
}

const MUSIC_PATH := "res://Assets/sfx/(main)loop_track.mp3"
const POOL_SIZE := 16
const MIN_INTERVAL_MS := 40
const VOLUME_MUSIK: float = -16.0
const VOLUME_MUSIK_PAUSE: float = -24.0
const VOLUME_MUSIK_HASIL: float = -22.0

var _players: Array[AudioStreamPlayer] = []
var _music: AudioStreamPlayer
var _last_played := {}
var _streams := {}
var _headless := false

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_headless = DisplayServer.get_name() == "headless"
	for sound in SOUND_PATHS.keys():
		_streams[sound] = load(SOUND_PATHS[sound])
	for _i in POOL_SIZE:
		var player := AudioStreamPlayer.new()
		player.bus = "SFX"
		add_child(player)
		_players.append(player)
	_music = AudioStreamPlayer.new()
	_music.bus = "Music"
	_music.stream = load(MUSIC_PATH)
	_music.volume_db = VOLUME_MUSIK
	add_child(_music)
	_music.finished.connect(_play_music)
	_play_music()

func _play_music() -> void:
	if _headless:
		return
	if _music != null and not _music.playing:
		_music.play()

func play(sound: String, volume_db := 0.0, pitch := 1.0) -> void:
	if not _streams.has(sound) or _streams[sound] == null:
		return
	var now := Time.get_ticks_msec()
	if _last_played.has(sound) and now - _last_played[sound] < MIN_INTERVAL_MS:
		return
	_last_played[sound] = now
	var player := _get_free_player()
	player.stream = _streams[sound]
	player.volume_db = volume_db
	player.pitch_scale = pitch
	player.play()

func mainkan_sfx(sound: String, volume_db := 0.0, pitch := 1.0) -> void:
	play(sound, volume_db, pitch)

func mainkan_musik() -> void:
	_play_music()

func atur_volume_musik(nilai_db: float) -> void:
	if _music != null:
		_music.volume_db = nilai_db

func jedakan_musik_pause() -> void:
	atur_volume_musik(VOLUME_MUSIK_PAUSE)

func pulihkan_musik() -> void:
	atur_volume_musik(VOLUME_MUSIK)

func redupkan_musik_hasil() -> void:
	atur_volume_musik(VOLUME_MUSIK_HASIL)

func hentikan_musik() -> void:
	if _music != null:
		_music.stop()

func _exit_tree() -> void:
	if _music != null:
		_music.stop()
		_music.stream = null
	for player in _players:
		player.stop()
		player.stream = null
	_streams.clear()

func _get_free_player() -> AudioStreamPlayer:
	for player in _players:
		if not player.playing:
			return player
	return _players[0]
