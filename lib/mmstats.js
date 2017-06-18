
/*

node mmvisitor.js

a = require("JOSM-Scripts-HOT/mmvisitor.js");
a.run([],["mmcambridge"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
a.run([],["mmcambridge","validating"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
*/

(function() {

    var usernames = [];
    var userids = [];
    var osmstats;
    var overpass;
    var stat = {};
    var opquery;
    const show_api_queries = false;;
    const show_api_responses = false;
    const fileInsteadOfAPI = false;
    
    run = function() {
	xrun([504708],["mmcambridge"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
    };
    
    xrun = function(users_extra,hashtags,start,end,boundary_limit,boundary_add) {
	// Update global var:
	userids = users_extra;
	addUsersFromHashtag(hashtags,start,end,boundary_limit,boundary_add);
    };

    processObjects = function() {
	var obj = overpass.elements;
	var o = [];
	var nodesOnWays = [];
	console.log("Objects received: "+ obj.length);
	// If we did a full query, we now need to determine which nodes are not on ways.
	obj.forEach(function(item){
	    o[item.id] = item;	    
	    if (item.type === 'way') {
		item.nodes.forEach(function(id){
		    nodesOnWays[id] = true;
		});
	    };
	});
	obj.forEach(function(item){
	    if (!stat[item.user]) {
		stat[item.user] = {"relation": 0, "node":0, "way":0, "building":0, "highway":0, "landuse": 0,"tagged":0,"natural":0,"waterway":0,
				   "taggedNodeOnWay": 0, "nonSquare": 0,
				   "taggedNodeOnWayID": [], "nonSquare": [],
				   "untagged":0, "untaggedID": [],
				   "taggedOther":0, "taggedOtherID": [],
				   "nonSquaredBuilding":0, "nonSquaredBuildingID": []
				  };
		// Need to also record ids
	    };
	    /* 
	       E.g. 
	       count objects edited by users
	       check for nodes not on ways
	       check for untagged nodes
	       check for untagged ways	       
	    */	    
	    //console.log("- "+ item.user + " " + item.type );
/*	    if (!stat[item.user][item.type]) {
		stat[item.user][item.type] = 0;
	    };*/
	    if (nodesOnWays[item.id]) {
		if (!item.tags) {
		} else {
		    stat[item.user].taggedNodeOnWay++;
		};
	    } else {
		stat[item.user][item.type]++;
		// This should be settable by project...
		if (item.tags) {
		    stat[item.user]["tagged"]++;
		    if (item.tags.building) {
			stat[item.user]["building"]++;
			if (item.type === 'way') {
			    if (item.nodes.length === 5) {
				var node = item.nodes;
				var rightAngle = true;
				for (var i=0; i<=4; i++) {
				    // angle(o[node[i]].lat,o[node[i]].lon,o[node[i+1]].lat,o[node[i+1]].lon);
				    // rightAngle = false;
				};
				if (!rightAngle){
				    stat[item.user]["nonSquaredBuilding"]++;
				    stat[item.user]["nonSquaredBuildingID"].push(item.id);
				};
			    };
			};	
		    } else if (item.tags.highway) {
			stat[item.user]["highway"]++;
		    } else 	if (item.tags.landuse) {
			stat[item.user]["landuse"]++;
		    } else 	if (item.tags.natural) {
			stat[item.user]["natural"]++;
		    } else 	if (item.tags.waterway) {
			stat[item.user]["waterway"]++;
		    } else {
			// console.log(item);
			stat[item.user]["taggedOther"]++;
			stat[item.user]["taggedOtherID"].push(item.id);
		    };
		} else {
		    stat[item.user]["untagged"]++;
		    stat[item.user]["untaggedID"].push(item.id);
		};
	    };
	});
	// return obj;
	console.log("Statistics:");
	var usersInArea = Object.keys(stat);
	console.log("Users that edited with the area:" + usersInArea.length);
	// This would give all users in area: for (var user in stat) {
	for (var jj=1; jj<=usernames.length; jj++) {
	    user = usernames[jj-1];
	    console.log("\n- ["+jj+"] user: "+user);
	    for (var type in stat[user]) {	    
		console.log("   " +type + ": " + stat[user][type]);
		//	    stat[user].forEach(function(type){
		//		console.log(user + " " + type + " " + stat[user][type]);
		//	    });
	    };
	    console.log();
	    if (stat[user].tagged != stat[user].node + stat[user].way) {
		console.log("   ERROR: Untagged nodes or ways: "+stat[user].untagged);
	    };
	    if (stat[user].taggedNodeOnWay != 0) {
		console.log("   WARNING: Tagged node on ways: "+stat[user].taggedNodeOnWay);
	    };
	    if (stat[user].nonSquaredBuilding != 0) {
		console.log("   WARNING: Non-squared buildings: "+stat[user].nonSquaredBuilding);
	    };
	    if (stat[user].taggedOther) {
		console.log("   WARNING 1: User created/amended ways that are not buildings / highways / landuse / natural / waterway: "+stat[user].taggedOther);
	    };
	    if (stat[user].way != stat[user].building + stat[user].highway + stat[user].landuse + stat[user].natural+ stat[user].waterway) {
		console.log("   WARNING 2: User created/amended ways that are not buildings / highways / landuse / natural / waterway.");
	    };
	};
    };

    XHR = function(url, fn) {
//	console.log(url);
	var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	var xhr = new XMLHttpRequest();
//	console.log(url);
	if (url.match("overpass") && fileInsteadOfAPI) {
	    var fs =require("fs");  // file system
	    var data= fs.readFileSync("test.json");
//	    console.log(data.toString());
	    fn(data.toString());
	} else {
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
    };
       
    addUsersFromHashtag = function(hashtags,start,end,boundary_limit,boundary_add) {
	var url = "";
	// hashtags.forEach(hasthtag) {
	url = "http://osmstats.redcross.org/hashtags/"+hashtags[0]+"/users";
	XHR(url, function(responseText) {
	    if (show_api_responses)
		console.log(responseText);
	    osmstats = JSON.parse(responseText);
	    getUsersFromAPIResponse();
	    getObjects(userids,start,end,boundary_limit,boundary_add);
	}
	   );
	return 1;
    };

    getUsersFromAPIResponse = function() {
	// var arr = parseJSON(XAPI(url));
	if (!osmstats) {
	    console.log("Error - osmstats=Undefined");
	    return 0;
	};
	osmstats.forEach(function(item){
	    usernames.push(item.name);
	    //console.log(item.name);
	    userids.push(item.user_id);
	    //console.log(item.user_id);
	});
	console.log("Users contributing to listed hashtags: "+usernames.length);
	return 1;
    };

    getObjects = function(users,start,end,boundary_limit,boundary_add) {
//	console.log(users);
	var bbox = "";
	if (boundary_limit) {
	    bbox = "{{bbox:"+boundary_limit+"}}";
	}
	var userstr ='(uid:'+userids.join(",")+')';
	var changed = '(changed:"'+start+'","'+end+'")';
	var query = '[out:json][timeout:180];' + getQuery(userstr,changed,bbox,true);
	if (boundary_add) {
	    // add boundary query as well
	    bbox = "'+bbox:"+boundary_limit+"+'";
	    query += getQuery("",changed,bbox,true);
	}
	if (show_api_queries)
	    console.log("query="+query);
	opquery = query;
	getObjectsFromAPI(query);
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

    getQuery = function(uids,changed,bbox,get_all) {
	if (get_all) {
	    // we need the additional nodes to calculate building angles
	    // query for ways and nodes-not-on-ways
	    // However, this can cause problems if validators adjust nodes that were edited prevously... so need to add more recursion.
	    return 'relation'+uids+''+changed+''+bbox+';'+
		'out meta qt; >; out meta qt;'+
		'way'+uids+''+changed+''+bbox+';'+
		'out meta qt; >; out meta qt;'+
		'node'+uids+''+changed+''+bbox+';'+
		'out meta qt; <; out meta qt;';
	} else {
	    // query for ways and nodes-not-on-ways
	    return 'way'+uids+''+changed+''+bbox+' -> .a;'+
		'(.a);'+
		'out meta qt;'+
		'(>;) -> .b;'+
		'node'+uids+''+changed+''+bbox+' -> .c;'+
		'(.c - .b);'+
		'out meta qt;';
	};
    };


    run();

}());




