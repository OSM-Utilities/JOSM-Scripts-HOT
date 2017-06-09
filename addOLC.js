/*

  addOLC.js

  This script (intended for the JOSM scripting plugin) adds Open Location Codes 
  to buildings on active layer in JOSM. The code can be easily adapted to add
  Open Location Codes to other objects.

  Note: From openlocationcode.js: "A 10 character code represents a 13.5x13.5 meter area 
  (at the equator). An 11 character code represents approximately a 2.8x3.5 meter area."
  So the code here uses 11 charcters by default.

  Run like this:

  // Long codes only
  var a= require("JOSM-Scripts-HOT/examples/addOLC.js");
  a.addOLC();

  // To get short codes also, you need to pass a place and it's coordinates:
  var a= require("JOSM-Scripts-HOT/examples/addOLC.js");
  a.addOLC({"lat":-13.9712444, "lon":29.605763, "place":"Fiwila, Zambia"});       


  // Existing codes can be updated with 
  var a= require("JOSM-Scripts-HOT/examples/addOLC.js");
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

    exports.addOLC = function(locality) {
	return exports.addOrChangeOLC("building",false, locality);
    };

    exports.changeOLC = function(locality) {
	return exports.addOrChangeOLC("building",true, locality);
    };
    
    exports.addOrChangeOLC = function(query, force,locality) {
	console.clear();
	var layer = layers.activeLayer;
	var objects =	layer.data.query(query);
	var numB = objects.length;
	console.println("Number of objects for '"+query+"': " + numB);
	var count = 0;
	for(i=0; i< objects.length; i++)
	    count += addOLCtoObject(objects[i], force, locality);
	console.println("Done! Code added to " + count + " objects.");
    };
    
    function addOLCtoObject(object, force, locality ) {
	var coord = centroid(object);
	var code = OpenLocationCode.encode(coord.lat, coord.lon, 11);
	//console.println("Code: "+code);
	var tags = object.tags;
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
	    tags["ref:olc_short"] = scode;
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
	    // TODO: Should at least average over nodes
	    // For large areas, really NE-SW should be used, with the codearea function in openlocationcode.js
	    lat = object.firstNode().lat;
	    lon = object.firstNode().lon;
	} else {
	    // Dont handle relations.
	}
	return {"lat": lat, "lon": lon};
    };
 
}());





