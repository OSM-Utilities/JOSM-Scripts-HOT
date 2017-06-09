/*
Bjoern Hassler - http://bjohas.de
*/
(function() {
    exports.offset = function(lat1, lon1, lat2, lon2, lat3, lon3, d) {
	// In a line segment p1->p2->p3, find a point P offset from p2, bisecting the angle.
	// The point is offset to the right, i.e. if p1->p2->p3->p1 are traversed anti-clockwise, offset points are on the outside.
	var lat;
	var lon;
	const rad = Math.PI/180;
	lat1 *= rad;
	lat2 *= rad;
	lat3 *= rad;
	lon1 *= rad;
	lon2 *= rad;
	lon3 *= rad;	
	var b1 = bearing(lat1, lon1, lat2, lon2);
	var b2 = bearing(lat2, lon2, lat3, lon3);
	var angle =(b1-b2);
	while (angle <= -Math.PI) {
	    angle += 2*Math.PI;
	};
	while (angle > Math.PI) {
	    angle -= 2*Math.PI;
	};
	if (angle < 0) {
	    angle += 2*Math.PI;
	};
	angle = b1 - angle/2 - Math.PI/2;
	var offsetlatlon = exports.transport(lat2, lon2, angle, d);
	lat=offsetlatlon.lat/rad;
	lon=offsetlatlon.lon/rad;
	return {lat:lat, lon:lon};
    };

    // https://stackoverflow.com/questions/2187657/calculate-second-point-knowing-the-starting-point-and-distance
    // https://stackoverflow.com/questions/7222382/get-lat-long-given-current-point-distance-and-bearing
    exports.transport = function(lat1,lon1,brng,d) {
	// Starting from lat1,lon2 go in bearing angle for distance dist
	const R = 6371e3;
	var lat = Math.asin( Math.sin(lat1)*Math.cos(d/R) +
			     Math.cos(lat1)*Math.sin(d/R)*Math.cos(brng) );
	var lon = lon1 + Math.atan2(Math.sin(brng)*Math.sin(d/R)*Math.cos(lat1),
				    Math.cos(d/R)-Math.sin(lat1)*Math.sin(lat));
	return{lat:lat,lon:lon};
    };

    // http://www.movable-type.co.uk/scripts/latlong.html
    function bearing(lat1, lon1, lat2, lon2) {
	// Calculate the bearing from p1 to p2, provided as four coords    
	var y = Math.sin(lon2-lon1) * Math.cos(lat2);
	var x = Math.cos(lat1)*Math.sin(lat2) - Math.sin(lat1)*Math.cos(lat2)*Math.cos(lon2-lon1);
	var brng = Math.atan2(y, x);	
	return brng;
    };

    exports.flatten = function(dataset) {
//	var console = require("josm/scriptingconsole");	
	const rad = Math.PI/180;
	// This adjusts for unequal spacing in lat/lon:
	if (dataset.length > 0)
	    dataset.forEach( function(latlon) {
//		console.println("ll0="+latlon);
//		console.println("ll1="+latlon.lat+ " " + latlon.lon);
		if (latlon.x) {
		    latlon.x *= Math.cos(rad * latlon.y);
		    		    console.println("Conv1");
		} else if (latlon.lat) {
		    // In case dataset is an OSM object, it may be passed by ref... hence need to create plain variable.
		    var lat = parseFloat(latlon.lat);
//		    console.println("ll2a="+lat+ " " +latlon.lat+ " " + latlon.lon);
		    latlon.lon = latlon.lon * Math.cos(rad * lat);
		    latlon.lat = lat;
//		    console.println("Conv2");
//		    console.println("ll2b="+lat+" " +latlon.lat+ " " + latlon.lon);
		} else {
		    latlon[1] *= Math.cos(rad * latlon[0]);
//		    console.println("Conv3");
		};
//		console.println("ll2="+latlon.lat+ " " + latlon.lon);
	    });
	return dataset;
    }

    exports.unflatten = function(dataset) {
	const rad = Math.PI/180;
	// This does the reverse.
	if (dataset.length > 0)
	    dataset.forEach( function(latlon) {
		if (latlon.x)
		    latlon.x /= Math.cos(rad * latlon.y);
		else if (latlon.lat)
		    latlon.lon /= Math.cos(rad * latlon.lat);
		else
		    latlon[1] /= Math.cos(rad * latlon[0]);
	    });
	return dataset;
    }


    exports.centroid = function(z) {
	var console = require("josm/scriptingconsole");	
	// expects closed way, way[i].lat, way[i].lon
	// console.println("getC: ");
	// console.println(" " + way);
	exports.flatten(z);
	// Need to do this because of precision issues:
	var latnor = z[0].lat;
	var lonnor = z[0].lon;
	for(var i=0; i < z.length; i++) {
	    // console.println("f: "+z[i].lat+ ", " + z[i].lon);
	    z[i].lat -= latnor;
	    z[i].lon -= lonnor;
	}
	//https://en.wikipedia.org/wiki/Centroid#Centroid_of_polygon
	// z[0..4], length=5. Need to go from 0..3 => i<=lengh-1-1
	var n = z.length-1;
	var A = 0;
	for (var i=0; i<=n-1; i++) {
	    // x_i y_i+1 - x_i+1 y_i 
	    A += z[i].lon * z[i+1].lat - z[i+1].lon * z[i].lat;
	}
	A /= 2;
	var Cx = 0;
	for (var i=0; i<=n-1; i++) {
	    // (x_i + x_i+1)( x_i y_i+1 - x_i+1 y_i)
	    Cx += (z[i].lon + z[i+1].lon) * (z[i].lon * z[i+1].lat - z[i+1].lon * z[i].lat);
	}
	Cx /= 6 * A;
	var Cy = 0;
	for (var i=0; i<=n-1; i++) {
	    // (y_i + y_i+1)( x_i y_i+1 - x_i+1 y_i)
	    Cy += (z[i].lat + z[i+1].lat) * (z[i].lon * z[i+1].lat - z[i+1].lon * z[i].lat);
	}
	Cy /= 6 * A;
	Cy += latnor;
	Cx += lonnor;
	coord = [{"lat": Cy, "lon": Cx }];
	var val = exports.unflatten(coord);
//	var val=coord;
//	console.println("lat: "+Cy+", lon: " + Cx + ", " + A);
//	console.println("lat: "+val[0].lat+", lon: " + val[0].lon);
	return val[0];
    };


    
}());

