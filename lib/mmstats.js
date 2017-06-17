
/*

node mmvisitor.js

a = require("JOSM-Scripts-HOT/mmvisitor.js");
a.run([],["mmcambridge"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
a.run([],["mmcambridge","validating"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
*/

(function() {

    var users = [];
    var osmstats;
    var overpass;
    var stat = {};
    
    run = function() {
	xrun([],["mmcambridge"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
    };
    
    xrun = function(users_extra,hashtags,start,end,boundary_limit,boundary_add) {
	users = users_extra;
	addUsersFromHashtag(hashtags,start,end,boundary_limit,boundary_add);
	//    var objects = exports.getObjects(users,start,end,boundary_limit,boundary_add);
	// Now process objects
	//    var checklist = exports.processObjects(objects);
    };


    processObjects = function() {
	var obj = overpass.elements;
	console.log("Objects received: "+obj.length);
	obj.forEach(function(item){
	    /* 
	       E.g. 
	       count objects edited by users
	       check for nodes not on ways
	       check for untagged nodes
	       check for untagged ways	       
	    */	    
	    //console.log("- "+ item.user + " " + item.type );
	    if (!stat[item.user]) {
		stat[item.user] = {"node":0, "way":0, "building":0, "highway":0, "landuse": 0,"tagged":0,"natural":0,"waterway":0 };
	    };
/*	    if (!stat[item.user][item.type]) {
		stat[item.user][item.type] = 0;
	    };*/
	    stat[item.user][item.type]++;
	    // This should be settable by project...
	    if (item.tags) {
		stat[item.user]["tagged"]++;
		if (item.tags.building) {
		    stat[item.user]["building"]++;
		} else if (item.tags.highway) {
		    stat[item.user]["highway"]++;
		} else 	if (item.tags.landuse) {
		    stat[item.user]["landuse"]++;
		} else 	if (item.tags.natural) {
		    stat[item.user]["natural"]++;
		} else 	if (item.tags.waterway) {
		    stat[item.user]["waterway"]++;
		} else {
		    console.log(item);
		};		
	    };
	});
	// return obj;
	console.log("Statistics:");
	for (var user in stat) {
	    console.log("- "+user);
	    for (var type in stat[user]) {	    
		console.log("   " +type + ": " + stat[user][type]);
		//	    stat[user].forEach(function(type){
		//		console.log(user + " " + type + " " + stat[user][type]);
		//	    });
	    };
	    if (stat[user].tagged != stat[user].node + stat[user].way) {
		console.log("   ERROR: Untagged nodes or ways.");
	    };
	    if (stat[user].way != stat[user].building + stat[user].highway + stat[user].landuse + stat[user].natural+ stat[user].waterway) {
		console.log("   WARNING: User created/amended ways that are not buildings / highways / landuse / natural / waterway.");
	    };
	};
    };

    XHR = function(url, fn) {
	var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	var xhr = new XMLHttpRequest();
//	console.log(url);
	xhr.open('GET', url);
	xhr.onload = function() {
	    if (xhr.status === 200) {
//		console.log(xhr.responseText);
		fn(xhr.responseText);
	    } else {
		console.log("Request failed for uri="+url);
	    }
	};
	xhr.send();
    };
       
    addUsersFromHashtag = function(hashtags,start,end,boundary_limit,boundary_add) {
	var url = "";
	// hashtags.forEach(hasthtag) {
	url = "http://osmstats.redcross.org/hashtags/"+hashtags[0]+"/users";
	XHR(url, function(responseText) {
//	    console.log(responseText);
	    osmstats = JSON.parse(responseText);
	    getUsersFromAPIResponse();
	    getObjects(users,start,end,boundary_limit,boundary_add);
	}
	   );
	//	users.push(getUsersFromAPI(url));
	//	async:
	//	exports.getObjects(users,start,end,boundary_limit,boundary_add);   
	//    }
	return 1;
    };

    getUsersFromAPIResponse = function() {
	// var arr = parseJSON(XAPI(url));
	if (!osmstats) {
	    console.log("Error - osmstats=Undefined");
	    return 0;
	};
	osmstats.forEach(function(item){
	    users.push(item.user_id);
//	    console.log(item.user_id);
	});
	console.log("Users: "+users.length);
	return 1;
    };

    getObjects = function(users,start,end,boundary_limit,boundary_add) {
//	console.log(users);
	var bbox = "";
	if (boundary_limit) {
	    bbox = "{{bbox:"+boundary_limit+"}}";
	}
	var userstr ='(uid:'+users.join(",")+')';
	var changed = '(changed:"'+start+'","'+end+'")';
	var query = '[out:json][timeout:180];' + getQuery(userstr,changed,bbox);
	if (boundary_add) {
	    // add boundary query as well
	    bbox = "'+bbox:"+boundary_limit+"+'";
	    query += getQuery("",changed,bbox);
	}
	getObjectsFromAPI(query);
	//    asyc:
	//    process(changes);
	// return changes;
    };

    getObjectsFromAPI = function(query) {
	//	console.log(query);
	var url = 'http://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
	XHR(url, function(responseText) {
	    overpass = JSON.parse(responseText);
	    processObjects();
	}
	   );
	return 1;
    };

    getQuery = function(users,changed,bbox) {
	// query for ways and nodes-not-on-ways
	return 'way'+users+''+changed+''+bbox+' -> .a;'+
	    '(.a);'+
	    'out meta;'+
	    '(>;) -> .b;'+
	    'node'+users+''+changed+''+bbox+' -> .c;'+
	    '(.c - .b);'+
	    'out meta;';
	// though maybe we need the additional nodes to calculate building angles?
    };


    run();

}());




