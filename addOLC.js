/*

  addOLC.js

  This script (intended for the JOSM scripting plugin) adds Open Location Codes 
  to buildings on active layer in JOSM. The code can be easily adapted to add
  Open Location Codes to other objects.

  Note: From openlocationcode.js: "A 10 character code represents a 13.5x13.5 meter area 
  (at the equator). An 11 character code represents approximately a 2.8x3.5 meter area."
  The code here uses 10 charcters by default, but if your data is accurate enough, you could use 11.

  The code alphabet is 23456789CFGHJMPQRVWX, which helps determining adjacent objects.
  Typically here is a one digit change in the "+AB" part, i.e. A+/-1, B+/-1. (If that lies
  on a boundary, it can of course affect the part before the "+" as well.) I.e. most buildings
  we're looking at fit within four 13.5x13.5 areas (i.e. contained within a 27mx27m area).

  Warnings are produced if buildings are smaller than warranted by the
  current precision (set in accuracy), or if the buildings are large
  (previcision < 7).

  Run like this:

  // Long codes only
  var a= require("JOSM-Scripts-HOT/addOLC.js");
  a.addOLC();

  // To get short codes also, you need to pass a place and it's coordinates:
  var a= require("JOSM-Scripts-HOT/addOLC.js");
  a.addOLC({"lat":-13.9712444, "lon":29.605763, "place":"Fiwila, Zambia"});       

  //TODO: Pass in accuracy.

  // Existing codes can be updated with 
  var a= require("JOSM-Scripts-HOT/addOLC.js");
  a.changeOLC();
  // Note that the short code is always updated if details for short code are provided.

  Bjoern Hassler (http://bjohas.de)
  gyslerc
  https://github.com/OSM-Utilities/JOSM-Scripts-HOT
  June 2017

*/

(function() {
    var util = require("josm/util");
    var console = require("josm/scriptingconsole");
    var layers = require("josm/layers");
    var nb = require("josm/builder").NodeBuilder; 
    var wb = require("josm/builder").WayBuilder;
    var command = require("josm/command");	
    var OpenLocationCode = require("JOSM-Scripts-HOT/lib/openlocationcode_1.js");
    var geoutils = require("JOSM-Scripts-HOT/lib/geoutils.js");
    
    exports.addOLC = function(locality) {
	return exports.addOrChangeOLC("building",false, locality);
    };

    exports.changeOLC = function(locality) {
	return exports.addOrChangeOLC("building",true, locality);
    };
    
    exports.addOrChangeOLC = function(query, force,locality) {
	// console.clear();
	var date = new Date();
	console.println("Start: "+date);
	var layer = layers.activeLayer;
	var objects =	layer.data.query(query);
	var numB = objects.length;
	console.println("Number of objects for '"+query+"': " + numB);
	var count = 0;
	for(i=0; i< objects.length; i++)
	    count += addOLCtoObject(objects[i], force, locality);
	console.println("Done! Code added to " + count + " objects.");
	// timing
	var date2 = new Date();
	var diff = date2-date;
	console.println("End: "+date2);
	var perobj = diff / numB;
	diff = Math.round(diff/1000);
	console.println("time="+diff+" s, "+perobj+"ms per object");
    };

    function append(object,key,value) {
	var out = "";
	if (object[key]) {
	    object[key] += ";"+value;
	    out += object[key]+";"+value;
	} else {
	    object[key] = value;
	    out = value;
	}
	return out;
    };
    
    function addOLCtoObject(object, force, locality ) {
	var coord = centroid(object);
	// as a test:
	const markCentroid = false;
	if (markCentroid) {
	    var layer = layers.activeLayer;
            var node=nb.withPosition(coord.lat, coord.lon).withTags({}).create();
	    command.add(node).applyTo(layer)
	}
	const accuracy = 10;
	// See where it falls:
	var NS = coord.N - coord.S;
	var EW = coord.E - coord.W;
	var sigDigLat = geoutils.significantDigitsOLC(NS);
	var sigDigLon = geoutils.significantDigitsOLC(EW);	
	var note = "";
	var tags = object.tags;
	if (sigDigLat>accuracy+1 || sigDigLon>accuracy+1) {
	    console.println("Encountered small objects: " + sigDigLat + " | " + sigDigLon+" > "+accuracy);
	    tags["note:olc"] = append(tags,"note:olc","Small object: " + sigDigLat + " | " + sigDigLon+" > "+accuracy);
	}
	if (sigDigLat<7 || sigDigLon<7) {
	    console.println("Encountered large objects: " + sigDigLat + ", " + sigDigLon);
	    tags["note:olc"] = append(tags,"note:olc","Large object: " + sigDigLat + ", " + sigDigLon);
	}
	var code = OpenLocationCode.encode(coord.lat, coord.lon, accuracy);
	// console.println("Code: "+code + " " + coord.lat + " " + coord.lon);
	var count = 0;
	if (tags["ref:olc"]) {
	    if (tags["ref:olc"] === code) {
		// console.println("Maintaining code: "+code);
	    } else {
		if (force) {
		    console.println("Changing code: "+tags["ref:olc"]+" to "+code);
		    tags["ref:olc"] = code;
		    count=1;
		} else {
		    console.println("Not changing code: "+tags["ref:olc"]+" to "+code);
		    code = tags["ref:olc"];
		}
	    }
	} else {
	    tags["ref:olc"] = code;
	    count=1;
	}
	if (locality) {
	    // Always change short code
	    scode = OpenLocationCode.shorten(code, locality.lat, locality.lon);
	    var scode = scode + ", " + locality.place;
	    tags["ref:olc:short"] = scode;
	    // console.println("- Short code: "+scode);
	};
	// Does not work... pass-by-ref?
	// object.tags = tags
	// Instead:
	object.set(tags);
	return count;
    };
       
    function centroid(object) {
	var lat = 0;
	var lon = 0;
	if (object.isNode) {
	    lat = object.lat;
	    lon = object.lon;
	} else if (object.isWay) {
	    lat = object.firstNode().lat;
	    lon = object.firstNode().lon;
	    //Obtain centroid.
	    var nodes = object.nodes;
	    // var coord = geoutils.centroid(nodesinBuilding);
	    // console.println("Nodes: " + nodesinBuilding);
	    if (nodes) {
		var z=[];	
		for(var i=0; i < nodes.length; i++) {
		    // console.println("s "+i+": " +nodes[i].lat+ ", " + nodes[i].lon);
		    z[i]={"lat": nodes[i].lat, "lon": nodes[i].lon};	    
		};
		var coord = geoutils.centroid(z);
		var bounds = geoutils.bbox(z);
		lat = coord.lat;
		lon = coord.lon;
	    } else {
		console.println("Error");
	    }
	    // If you want to see how the code changes along the path of the building:
	    // codesAlongPath(object);
	} else {
	    // Dont handle relations.
	}
	return {"lat": lat, "lon": lon, "N":bounds.N, "S":bounds.S, "E":bounds.E, "W":bounds.W};
    };

    function codesAlongPath(object) {
	// Check for variation along a path.
	var code = OpenLocationCode.encode(object.firstNode().lat, object.firstNode().lon);
	var scode = "";
	var nodesinBuilding = object.nodes; 
	for(var i=0; i < nodesinBuilding.length-1; i++){
            var code2 = OpenLocationCode.encode(nodesinBuilding[i].lat, nodesinBuilding[i].lon);	   
	    scode = OpenLocationCode.shorten(code2, object.firstNode().lat, object.firstNode().lon);
	    console.println("- "+i+ ", s=" + scode+ " " + ", l=" + code2 + ", wrt.=" + code); 
	}
    };
    
}());





