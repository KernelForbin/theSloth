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
	this.mode_text = null;
	this.use_queue = false;
	this.setMode = function setMode( new_mode ) {
		if (new_mode.match('play[0-9]+') ) {
			this.limit = Math.floor(new_mode.substr(4));
			this.limit_units = this.limit == 1 ? "song" : "songs";
			this.mode = new_mode;
			this.mode_text = "DJs will now be removed after playing "+this.limit+" "+this.limit_units;
		}
		if (new_mode.match('queue') ) {
			this.use_queue = true;
			this.queue = [];
			callback({"success":true});
		}
		if (new_mode.match('ffa') ) {
			this.use_queue = false;
			this.queue = false;
			callback({"success":true});
		}
	}
	this.addToQueue = function addToQueue( userid ) {
		if (this.use_queue) {
			this.queue.push(userid);
		} else {
			callback({"success":false});
		}
	}
	this.getNextInLine = function getNextInLine() {
		if (this.use_queue && this.queue.length > 0) {
			var next = this.queue[0];
			this.queue.shift();
			callback({"success":true, "next":next});
		}
	}
	this.getPositionInLine = function getPositionInLine( userid ) {
		if (this.use_queue && this.queue.length > 0) {
			var position = this.queue.indexOf(userid);
			if (position >= 0 ) {
				callback(position+1);
			} else {
				callback({"success":false});
			}
		}
	}
	this.removeFromQueue = function removeFromQueue( userid ) {
		var position = this.queue.indexOf(userid);
		if (position >= 0) {
			this.queue.splice(position);
			callback({"success":true, "new_queue_size":this.queue.length});
		} else {
			callback({"success":false});
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
		list = {};
		for(i=0;i<data.users.length;i++) {
			list[i] = (data.users[i].userid.substr(0,6));
		}
		callback(list);
	});
}


function heartBeat() {
	var options = { bufferType: 'buffer', url:apibase+'heartbeat.php?key='+authKey()+'&bot=theSloth' };
	http.get(options, function(error, res) {
		if (error) {
			myLog('addDj','heartBeat() - Error connecting to '+options['url']);

		} else {
			callback(res)
		}
	});
}
bot.on('registered', function(data) {

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
});
bot.on('roomChanged', function(data) {
});
bot.on('new_moderator', function (data) {
});
bot.on('add_dj', function(data) {
	heartBeat();
});
bot.on('rem_dj', function(data) {
});
bot.on('speak', function (data) {

});