/*A
  gyslerc
  Bjoern Hassler, http://bjohas.de

  Run like this:

  var a= require("JOSM-Scripts-HOT/examples/nodeBuilding2Way.js");
  a.nodeBuilding2Way(distance on each side of node in metres, 
  tagKey "building", 
  tagValue "expanded from nodeBuilding", 
  );

  examples:

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
	return exports.addOrChangeOLC(false, locality);
    };

    exports.changeOLC = function(locality) {
	return exports.addOrChangeOLC(true, locality);
    };
    
    exports.addOrChangeOLC = function(force,locality) {
	console.clear();
	var layer = layers.activeLayer;
	var buildings =	layer.data.query("building");
	var numB = buildings.length;
	console.println("Number of buildings: " + numB);
	var count = 0;
	for(i=0; i< buildings.length; i++)
	    count += addOLCtoBuilding(buildings[i], force, locality);
	console.println("Done! Code added to " + count + " buildings.");
    };
    
    function addOLCtoBuilding(building, force, locality ) {
	var coord = centroid(building);
	var code = OpenLocationCode.encode(coord.lat, coord.lon);
	//console.println("Code: "+code);
	var tags = building.tags;
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
	// Does not work:
	// building.tags = tags
	// Instead:
	building.set(tags);
	return count;
    };
    
    function centroid(building) {
	// TODO
	var lat = 0;
	var lon = 0;
	if (building.isNode) {
	    lat = building.lat;
	    lon = building.lon;
	} else if (building.isWay) {
	    lat = building.firstNode().lat;
	    lon = building.firstNode().lon;
	} else {
	    // Dont handle relations.
	}
	return {"lat": lat, "lon": lon};
    };
 
}());





