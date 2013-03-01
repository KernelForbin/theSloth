var Bot    	= require('ttapi');
var http   	= require('http-get');
var md5 = require('MD5');
var dp = require('./date.js');
var settings = require('./bot.settings.js');
var bot = new Bot(AUTH, USERID, ROOMID);
bot.debug = false;

function parseDate(i) {
	var r = /[0-9]{1,4}[\-\/\s\.\\]{1,2}[0-9]{1,2}[\-\/\s\.\\]{1,2}[0-9]{1,4}/;
	var showdate = i.match(r); 
	if (showdate) {
		var d = Date.parse(showdate[0]);
		if (d) {
			var d2 = d.toString('yyyy-MM-dd');
			return d2;
		} else {
			return false;
		}
	}  else {
		return false;
	}
}

function randomItem(j) {
	var randno = Math.floor(Math.random()*j.length);
	return j[randno];
}

Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i] === obj) {
            return true;
        }
    }
    return false;
}

function getGuid() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
}

function myLog(type, message) {
	var d = new Date();
	console.log('['+d.toString('yyyy-MM-dd HH:mm:ss')+'] ['+type+'] '+message);
}

function getEpoch() {
	var epoch = parseInt((new Date).getTime()/1000);
	return epoch;
}

function pause(millis) {
	var date = new Date();
	var curDate = null;
	do { curDate = new Date(); } 
	while(curDate-date < millis)
}

function isJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

function authKey() {
	return md5(getEpoch()+apikey);
}
function getCurrentSong() {
	bot.roomInfo(true, function(data) {
	var cs = data.room.metadata.current_song;
	var now_playing = {
		songname:cs.metadata.song, 
		artist:cs.metadata.artist,
		songid:cs._id,
		starttime:Math.floor(cs.starttime),
		album:cs.metadata.album,
		song:cs.metadata.song,
		tracktime:cs.metadata.length,
		userid:data.room.metadata.current_dj,
		dateblob:cs.metadata.song+cs.metadata.artist+cs.metadata.album,
		};
	now_playing.showdate = parseDate(now_playing.dateblob);
	return now_playing;
	});
}
function heartBeat() {
	var options = { bufferType: 'buffer', url:apibase+'heartbeat.php?key='+authKey()+'&bot=theSloth' };
	http.get(options, function(error, res) {
		if (error) {
			myLog('addDj','heartBeat() - Error connecting to '+options['url']);
			return false;
		} else {
			return true;
		}
	});
}
function simpleJSONApiResponse(endpoint) {
 	options = {bufferType: 'buffer', url:endpoint};
	http.get(options, function(error, res) {
		if (error) {
			myLog('simpleJSONApiResponse', 'Error connecting to '+options['url']);
		} else {
			if (isJsonString(res.buffer)) {
				var result = JSON.parse(res.buffer);
				if (result.success) {
					bot.speak(result.message);
				}
			} else {
				myLog('simpleJSONApiResponse', 'JSON.parse error - '+res.buffer);
			}
		}
	});
}

chatResponses = [
	{ trigger: new RegExp('^!help$','i'), response: 'http://stats.thephish.fm/about.php' },
	{ trigger: new RegExp('^!tips$','i'), response: 'http://thephish.fm/tips/'},
	{ trigger: new RegExp('^!stats$','i'), response: 'http://stats.thephish.fm'},
	{ trigger: new RegExp('^!gifs$','i'), response: 'http://tinyurl.com/ttgifs'},
	{ trigger: new RegExp('^!deg$','i'), response: 'http://tinyurl.com/phishdeg'},
	{ trigger: new RegExp('^!greet$','i'), response: greeting},
	{ trigger: new RegExp('^!slide$','i'), response: 'http://thephish.fm/theslide'},
	{ trigger: new RegExp('^!(about|commands|sloth)$','i'), response: 'https://github.com/ehedaya/theSloth/wiki/Commands'},
	{ trigger: new RegExp('^commands$','i'), response: 'https://github.com/ehedaya/theSloth/wiki/Commands'},
	{ trigger: new RegExp('^!meettup$','i'), response: 'http://thephish.fm/meettups'},
	{ trigger: new RegExp('^!ttplus$','i'), response: 'TT+ info: http://turntableplus.fm/beta'},
	{ trigger: new RegExp('^!ttx$','i'), response: 'Turntable X: http://bit.ly/WbRp8P'},
	{ trigger: new RegExp('^[!+](add(me)?|list|q|qa)$','i'), response: 'K '+name+', you\'re on "the list!"'},
	{ trigger: new RegExp('feed.+sloth','i'), response: randomItem(['ITALIAN SPAGHETTI!','*omnomnom*', '/me burps'])},
	{ trigger: new RegExp('(pets|hugs).+sloth','i'), response: randomItem(['http://tinyurl.com/slothishappy', '<3', 'http://tinyurl.com/coolsloth'])},
	{ trigger: new RegExp('(lick|spam|dose).+sloth','i'), response: '/me stabs '+name},
	{ trigger: new RegExp('dances with.+sloth','i'), response: '/me dances with '+name},
	{ trigger: new RegExp('^!new$', 'i'), response: 'http://bit.ly/slothNew'}
];


bot.on('newsong', function(data) { 
	now_playing = getCurrentSong();
	myLog('newsong', now_playing);
	if (now_playing.artist.match(/Daily\sGhost/i)) {
		bot.speak(':ghost:'+data.room.metadata.current_song.metadata.album);
	}
	heartBeat();
});
bot.on('endsong', function(data) {
});
bot.on('new_moderator', function (data) {
});
bot.on('add_dj', function(data) {
	heartBeat();
});
bot.on('rem_dj', function(data) {
});
bot.on('speak', function (data) {
   var name = data.name;
   var text = data.text;
   var userid = data.userid;
   for(t in chatResponses) {
		if (text.match(chatResponses[t].trigger)) {
			bot.speak(chatResponses[t].response); 
		}
	}
   if (text.match(/^!skip$/i)) {
   		bot.skip();
   }
   if (text.match(/^!notes$/i)) {
		bot.roomInfo(true, function(data) {
			var starttime = Math.floor(data.room.metadata.current_song.starttime);
	   		bot.speak('Prefix notes with ## and I\'ll save them for later. For example: http://stats.thephish.fm/'+starttime);		
		});
   }
   if (text.match(/^!who$/i)) {
   		var usersHere = '';
   		for(var u in usersList) {
   			usersHere+=u.substring(0,11)+',';
   		}
   		if(usersHere.length>10) {
			bot.roomInfo(true, function(data) {
				if (showdate = parseDate(data.room.metadata.current_song.metadata.artist+' '+data.room.metadata.current_song.metadata.song+' '+data.room.metadata.current_song.metadata.album)) {
					var options = {bufferType: 'buffer', url:apibase+'getUsersAtShow.php?key='+authKey()+'&date='+showdate+'&u='+usersHere };
					http.get(options, function(error, res) {
						if (error) {
							myLog('speak', '!who - Error connecting to '+options['url']);
						} else {
							var who = res.buffer;
							if (who.length > 1) {
								bot.speak(who);
							} 
						}
					});
				} else {
					bot.speak('I don\'t know the showdate.');
				}
			});
   		}
   }
});