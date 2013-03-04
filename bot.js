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

function djMode (callback) {
	this.mode = null;
	this.mode_text = "There are no special DJ modes enabled. ";
	this.queue_text = "There is no queue to DJ. ";
	this.use_queue = false;
	this.setMode = function setMode( new_mode ) {
		if (new_mode.match('play[0-9]+') ) {
			this.limit = Math.floor(new_mode.substr(4));
			this.limit_units = this.limit == 1 ? "song" : "songs";
			this.mode = new_mode;
			this.mode_text = "DJs will now be removed after playing "+this.limit+" "+this.limit_units+". ";
		}
		if (new_mode.match('queue') ) {
			this.use_queue = true;
			this.queue = [];
			this.queue_text = "There is a queue to DJ, say 'add' to be added. ";
		}
		if (new_mode.match('ffa') ) {
			this.use_queue = false;
			this.queue = false;
			this.queue_text = "There is no queue to DJ. ";
		}
	}
	this.addToQueue = function addToQueue( userid ) {
		if (this.use_queue) {
			this.queue.push(userid);
		}
	}
	this.getNextInLine = function getNextInLine() {
		if (this.use_queue && this.queue.length > 0) {
			var next = this.queue[0];
			this.queue.shift();
			return next;
		}
	}
	this.getPositionInLine = function getPositionInLine( userid ) {
		if (this.use_queue && this.queue.length > 0) {
			var position = this.queue.indexOf(userid);
			if (position >= 0 ) {
				return position+1;
			} else {
				return false;
			}
		}
	}
	this.removeFromQueue = function removeFromQueue( userid ) {
		var position = this.queue.indexOf(userid);
		if (position >= 0) {
			this.queue.splice(position);
			return this.queue.length;
		} else {
			return false;
		}
	}
}

function getCurrentSong(callback) {
	bot.roomInfo(true, function(data) {
		var cs = data.room.metadata.current_song;
		now_playing = {
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
		callback(now_playing);
	});
}
function getShortenedUserIds(callback) {
	bot.roomInfo(true, function(data) {
		list = [];
		for(i=0;i<data.users.length;i++) {
			list.push(data.users[i].userid.substr(0,6));
		}
		callback(list);
	});
}


function heartBeat(callback) {
	var options = { bufferType: 'buffer', url:apibase+'heartbeat.php?key='+authKey()+'&bot=theSloth' };
	http.get(options, function(error, res) {
		if (error) {
			myLog('addDj','heartBeat() - Error connecting to '+options['url']);
		} else {
			myLog('heartBeat()', res.buffer);
		}
	});
}
bot.on('registered', function(data) {
	heartBeat();
});
bot.on('newsong', function(data) { 
	getCurrentSong( function(now_playing) {
		if (now_playing.artist.match(/Daily\sGhost/i)) {
			bot.speak(':ghost:'+data.room.metadata.current_song.metadata.album);
		}

	});
	heartBeat();
});
bot.on('endsong', function(data) {
	heartBeat();
});
bot.on('roomChanged', function(data) {
	heartBeat();
});
bot.on('new_moderator', function (data) {
	heartBeat();
});
bot.on('add_dj', function(data) {
	heartBeat();
});
bot.on('rem_dj', function(data) {
	heartBeat();
});
bot.on('speak', function (data) {
	heartBeat();
});
bot.on('pmmed', function (data) {
	heartBeat();
	var name = data.name;
	var text = data.text;
	var userid = data.userid;
	if(text.match(/^!who$/i)) {
		getCurrentSong(function(song) {
			if (song.showdate) {
				getShortenedUserIds(function(userlist) {
					var options = {bufferType: 'string', url:apibase+'getUsersAtShow.php?key='+authKey()+'&date='+song.showdate+'&u='+userlist.join() };
					http.get(options, function(error, res) {
						if (error) {
							myLog('speak', '!who - Error connecting to '+options['url']);
						} else {
							// todo return json + validate for success
							console.log(res.buffer);
						}
					});
				}); 
			} else {
				console.log("I don't know the showdate");
			}
		});
	}
	if(text.match(/^!mode/i)) {
		bot.mode = !bot.mode ? new djMode() : bot.mode;
		myLog('mode', bot.mode.mode_text+bot.mode.queue_text);
	}
	if(text.match(/^!mode:/i)) {
		var new_mode = text.substr(6);
		//myLog('!mode', 'New mode: '+new_mode);
		bot.mode = !bot.mode ? new djMode() : bot.mode;
		bot.mode.setMode(new_mode);
		console.log(bot.mode);
	}
	if(text.match(/add/i)) {
		bot.mode = !bot.mode ? new djMode() : bot.mode;
		if (bot.mode.use_queue) {
			bot.mode.addToQueue(userid);
			var position = bot.mode.getPositionInLine(userid);
			myLog("add", "Your position in line: "+position);
		} else {
			myLog("add", "There is currently no queue.");
		}
	}
});