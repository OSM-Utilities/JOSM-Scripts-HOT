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
	const rad = Math.PI/180;
	// This adjusts for unequal spacing in lat/lon:
	if (dataset.length > 0)
	    dataset.forEach( function(latlon) {
		if (latlon.x)
		    latlon.x *= Math.cos(rad * latlon.y);
		else if (latlon.lat)
		    latlon.lon *= Math.cos(rad * latlon.lat);
		else
		    latlon[1] *= Math.cos(rad * latlon[0]);
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
   
}());

