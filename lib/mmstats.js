
/*

node mmstats.js

The code retrieves changes made by 

- users (user ids either provided directly, or user ids retrieved from hashtags in the users changeset comment),
- within a certain timeframe
- within a certain area

The script outputs changes made per user, and performs some basic
validation, e.g. listing of untagged isolated nodes, non-square
buildings.

Enhancement: Rather than 'direct validation' it may be better to just
use the script to download OSM data, and then run a validator on it.

*/

(function() {

    var usernames = [];
    var userids = [];
    var osmstats;
    var overpass;
    var stat = {};
    var opquery;
    const show_api_queries = false;
    const show_api_responses = false;
    const fileInsteadOfAPI = false;
    const alwaysShowDetails = false;
    
    run = function() {
	/* 
	   Checking contrbutions of user 504708 (anywhere, anytime)
	   Not very helpful in this context (and no query is run!), but it explains the parameter.
	*/
	// analyse([504708]);
	/* 
	   Checking contributions from users that contrbuted to #hotosm-project-2769.
	   The hashtag is used to extract users, and the ovepass returns all changes made by those users (anywhere, anytime).
	   Not very helpful in this context (and no query is run!), but it explains the parameter.
	*/
	// analyse([],["hotosm-project-2769"],"","",[],[]);
	/* 
	   Checking ongoing mapathon with #mmcambridge starting at 2017-06-15T17:00:00Z
	   Users submitting changes under #mmcambridge, as well as user 504708, since 2017-06-15T17:00:00Z (anywhere).
	*/
	// analyse([504708],["mmcambridge"],"2017-06-15T17:00:00Z");

	/*
	  Checking/getting stats for same mapathon just after end at 2017-06-15T21:00:00Z
	  Same as last query, but between 2017-06-15T17:00:00Z and 2017-06-15T21:00:00Z.
	*/
	analyse([504708],["mmcambridge"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
	//analyse([],["tanzaniadevelopmenttrust"],"2017-06-15T17:00:00Z","2017-06-15T21:00:00Z");
	/* 
	   Checking project retrospectively - using users from hastag, and within area (rather than timeframe).
	   It fetches users from #hotosm-project-2769, and searches the area for contributions by those users (anytime).
	   It then adds the area itself, and lists changes by those users in the area.
	*/
	// analyse([],["hotosm-project-2769"],"","",[7.09885, -9.12416, 7.2955387, -8.9176649]);
	/*
	  Same as previous query. However, while the query only retrieves edits by the user from hashtag (and recurses up/down),
	  this query looks for additional users in the area. That's really only useful if you add a timeframe, as in the second query, because
	  it then tells that there are users that are not using the hashtag (and are likely to be part of the mapathon).
	*/
	// analyse([],["hotosm-project-2769"],"","",[7.09885, -9.12416, 7.2955387, -8.9176649],true);
	// analyse([],["hotosm-project-2769"],"2017-06-01T17:00:00Z","2017-06-01T20:00:00Z",[7.09885, -9.12416, 7.2955387, -8.9176649],true);
	/*
	  Searching within long timeframe and area.
	  However, ths seems to be too resource intensive on the overpass server.
	*/
	// analyse([],["hotosm-project-2769"],"2017-01-01T17:00:00Z","2017-06-15T17:00:00Z",[7.09885, -9.12416, 7.2955387, -8.9176649]);
	/*
	  Search within area, retrieving all edits (anytime). Could be used as final consistency check.
	  The two queries are identical.
	  All users will be listed.
	*/
	// analyse([],[],"","",[7.09885, -9.12416, 7.2955387, -8.9176649]);
	// analyse([],[],"","",[7.09885, -9.12416, 7.2955387, -8.9176649],true);
    };
    
    analyse = function(users_extra,hashtags,start,end,boundary_limit,boundary_add) {
	// Update global var:
	userids = users_extra;
	addUsersFromHashtag(hashtags,start,end,boundary_limit,boundary_add);
    };

    processObjects = function() {
	var obj = overpass.elements;
	var o = [];
	var nodesOnWaysOrInRels = [];
	var nodesInRels = [];
	var waysInRels = [];
	// var usersInDataH = {};
	console.log("Objects received: "+ obj.length);
	// If we did a full query, we now need to determine which nodes are not on ways.
	obj.forEach(function(item){
	    o[item.id] = item;	    
	    // usersInDataH[item.user] = 1;
	    if (item.type === 'way') {
		item.nodes.forEach(function(id){
		    nodesOnWaysOrInRels[id] = true;
		});
	    } else if (item.type === 'relation') {
		item.members.forEach(function(member){
		    if (member.type === 'node')
			nodesInRels[member.ref] = true;
		    else if (member.type === 'way')
			waysInRels[member.ref] = true;
		});

	    };
	});
	var statall = {
	    "node":0,
	    "way":0,
	    "relation": 0,
	    "tagged":0,
	    "untaggedIsolated":0, "untaggedIsolatedID": [],
	    "untaggedInObject": 0,
	    "building":0, "highway":0, "landuse": 0,"natural":0,"waterway":0,"railway":0,"barrier":0,"historic":0,"amenity":0,
	    "taggedOther":0, "taggedOtherID": [],
	    "taggedNodeOnWay": 0, "taggedNodeOnWayID": [],
	    "nonSquaredBuilding":0, "nonSquaredBuildingID": []
	};
	// "nonSquare": 0, "nonSquare": [],
	// var usersInData = Object.keys(usersInDataH);
	obj.forEach(function(item){
	    /* 
	       E.g. 
	       count objects edited by users
	       check for nodes not on ways
	       check for untagged nodes
	       check for untagged ways	       
	    */	    
	    if (!stat[item.user]) {
		stat[item.user] = {
	    "node":0,
	    "way":0,
	    "relation": 0,
	    "tagged":0,
	    "untaggedIsolated":0, "untaggedIsolatedID": [],
	    "untaggedInObject": 0,
	    "building":0, "highway":0, "landuse": 0,"natural":0,"waterway":0,"railway":0,"barrier":0,"historic":0,"amenity":0,
	    "taggedOther":0, "taggedOtherID": [],
	    "taggedNodeOnWay": 0, "taggedNodeOnWayID": [],
	    "nonSquaredBuilding":0, "nonSquaredBuildingID": []
	};;
	    };
	    //console.log("- "+ item.user + " " + item.type );
	    /* if (!stat[item.user][item.type]) {
		stat[item.user][item.type] = 0;
	    };*/
	    stat[item.user][item.type]++;
	    statall[item.type]++;
	    // This should be settable by project...
	    // console.log("item.id = "+item.id);
	    // console.log("item.tags = "+item.tags);
	    if (item.tags) {
		stat[item.user]["tagged"]++;
		statall["tagged"]++;
		if (item.tags.building) {
		    stat[item.user]["building"]++;
		    statall["building"]++;
		    if (item.type === 'way') {
			if (item.nodes.length === 5) {
			    // console.log("Building: "+item.id);
			    var node = item.nodes;
			    var rightAngle = true;
			    if (o[node[0]] && o[node[1]] && o[node[2]] && o[node[3]]) {
				for (var i=0; i<=3; i++) {
				    var i2 = (i+1)%4;
				    var i3 = (i+2)%4;
				    var angle = Math.round(bearing(o[node[i]].lat,o[node[i]].lon,o[node[i2]].lat,o[node[i2]].lon)
							   - bearing(o[node[i2]].lat,o[node[i2]].lon,o[node[i3]].lat,o[node[i3]].lon));
				    // console.log("   "+ i + " "  + angle);
				    var angle = angle % 90;
				    if (angle !== 0)
					rightAngle = false;
				};
			    } else {
				console.log("Building: id: "+item.type+item.id+"; COULD NOT GET COORDS!");
			    };
			    if (!rightAngle){
				stat[item.user]["nonSquaredBuilding"]++;
				statall["nonSquaredBuilding"]++;
				stat[item.user]["nonSquaredBuildingID"].push(item.type+""+item.id);
				statall["nonSquaredBuildingID"].push(item.type+""+item.id);
			    };
			};
		    };	
		} else if (item.tags.highway) {
		    stat[item.user]["highway"]++;
		    statall["highway"]++;
		} else if (item.tags.landuse) {
		    stat[item.user]["landuse"]++;
		    statall["landuse"]++;
		} else if (item.tags.natural) {
		    stat[item.user]["natural"]++;
		    statall["natural"]++;
		} else if (item.tags.waterway) {
		    stat[item.user]["waterway"]++;
		    statall["waterway"]++;
		} else if (item.tags.railway) {
		    stat[item.user]["railway"]++;
		    statall["railway"]++;
		} else if (item.tags.barrier) {
		    stat[item.user]["barrier"]++;
		    statall["barrier"]++;
		} else if (item.tags.historic) {
		    stat[item.user]["historic"]++;
		    statall["historic"]++;
		} else if (item.tags.amenity) {
		    stat[item.user]["amenity"]++;
		    statall["amenity"]++;
		} else {
		    // console.log(item);
		    stat[item.user]["taggedOther"]++;
		    statall["taggedOther"]++;
		    stat[item.user]["taggedOtherID"].push(item.type+""+item.id);
		    statall["taggedOtherID"].push(item.type+""+item.id);
		};
		if (item.type === 'node' && nodesOnWaysOrInRels[item.id]) {
		    stat[item.user].taggedNodeOnWay++;
		    stat[item.user]["taggedNodeOnWayID"].push(item.type+""+item.id);
		    statall.taggedNodeOnWay++;
		    statall["taggedNodeOnWayID"].push(item.type+""+item.id);
		    stat[item.user]++;
		};
	    } else {
		if ((item.type === 'node' && !nodesOnWaysOrInRels[item.id] && !nodesInRels[item.id]) ||
		    (item.type === 'way' && !waysInRels[item.id])) {
		    stat[item.user]["untaggedIsolated"]++;
		    statall["untaggedIsolated"]++;
		    stat[item.user]["untaggedIsolatedID"].push(item.type+""+item.id);
		    statall["untaggedIsolatedID"].push(item.type+""+item.id);
		} else {
		    stat[item.user]["untaggedInObject"]++;
		    statall["untaggedInObject"]++;
		};
	    };
	});
	// return obj;
	var usersInArea = Object.keys(stat);
	// This would give all users in area: for (var user in stat) {
	var userlist = usernames;
	if (usernames.length === 0) {
	    console.log("No users specified (directly or via hashtag). Using users in area: " + usersInArea.length + ".");
	    userlist = usersInArea;
	} else {
	    console.log("(Users that edited within the area:" + usersInArea.length + ", but only checking "+usernames.length+" from hashtag.)");
	};
	console.log("\nStatistics:");
	for (var jj=1; jj<=userlist.length; jj++) {
	    user = userlist[jj-1];
	    console.log("- ["+jj+"] user: "+user);
	    if (stat[user]) {
		var warnings = false;
		if (stat[user].untaggedIsolated !== 0) {
		    console.log("   ERROR: Untagged (isolated) objects: "+stat[user].untaggedIsolated);
		    warnings = true;
		};
		/* if (stat[user].tagged != stat[user].node + stat[user].way + stat[user].relation) {
		    console.log("   ERROR: Mismatch in tagging: "+stat[user].untaggedIsolated + " " + stat[user].tagged);
		    warnings = true;
		}; */
		if (stat[user].taggedNodeOnWay != 0) {
		    console.log("   WARNING: Tagged node on ways: "+stat[user].taggedNodeOnWay);
		    warnings = true;
		};
		if (stat[user].nonSquaredBuilding != 0) {
		    var ratio  = Math.round(stat[user].nonSquaredBuilding*100/stat[user]["building"]);
		    console.log("   WARNING: Non-squared buildings: "+stat[user].nonSquaredBuilding+", ratio: "+ratio+" %.");
		    warnings = true;
		};
		if (stat[user].taggedOther) {
		    console.log("   WARNING 1: User created/amended ways that are not building/highway/landuse/natural/waterway/historic/railway/amenity/barrier: "+stat[user].taggedOther);
		    warnings = true;
		};
		if (stat[user].way != stat[user].building + stat[user].highway + stat[user].landuse + stat[user].natural+ stat[user].waterway) {
		    console.log("   WARNING 2: User created/amended ways ...");
		    warnings = true;
		};
		if (warnings || alwaysShowDetails) {
		    console.log();
		    console.log("   Details:");
		    // var total = stat[user].node + stat[user].way + stat[user].relation;
		    // var total1 = stat[user].untaggedInObject + stat[user].untaggedIsolated + stat[user].tagged;
		    // console.log("    "+ total + " " + total1);
		    for (var type in stat[user]) {	    
			if (stat[user][type] > 0 || stat[user][type].length > 0) {
			    console.log("    - " +type + ": " + stat[user][type]);
			    // stat[user].forEach(function(type){
			    // console.log(user + " " + type + " " + stat[user][type]);
			    // });
			};
		    };
		    console.log();
		};
	    } else {
		console.log("      (no edits)");
	    };
	};
	console.log("Summary:");
	for (var type in statall) {	    
	    if (statall[type] > 0 || statall[type].length > 0) {
		console.log("    - " +type + ": " + statall[type]);
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

    getObjects = function(userids,start,end,boundary_limit,boundary_add) {
//	console.log(userids);
	var bbox = "";
	var userstr = "";
	if (userids.length > 0) {
	    userstr = '(uid:'+userids.join(",")+')';
	};
	var changed = "";
	if (start !== '') {
	    if (end !== '') {
		changed = '(changed:"'+start+'","'+end+'")';
	    } else {
		changed = '(changed:"'+start+'")';
	    };
	}
	if (boundary_limit) {
	    if (boundary_limit.length===4) 
		bbox = "("+boundary_limit.join(",")+")";
	}
	var query = '[out:json][timeout:180];' + getQuery(userstr,changed,bbox,true);
	if (boundary_add) {
	    // add boundary query as well
	    // bbox = "("+boundary_add.join(",")+")";
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

    // http://www.movable-type.co.uk/scripts/latlong.html
    function bearing(lat1, lon1, lat2, lon2) {
	const rad = Math.PI/180;
	lat1 *= rad;
	lat2 *= rad;
	lon1 *= rad;
	lon2 *= rad;
	// Calculate the bearing from p1 to p2, provided as four coords
	var y = Math.sin(lon2-lon1) * Math.cos(lat2);
	var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
	var brng = Math.atan2(y, x);
	return brng/rad;
    };
    

    run();

}());




