/*
Bjoern Hassler - http://bjohas.de
*/
function offset(lat1, lon1, lat2, lon2, lat3, lon3,d) {
    // In a line segment p1->p2->p3, find a point P offset from p2, bisecting the angle.
    var lat;
    var lon;
    var b1 = bearing(lat1, lon1, lat2, lon2);
    var b2 = bearing(lat2, lon2, lat3, lon3);
    var angle = -(-b1+b2+180);
    while (angle <= -180) {
	angle += 360;
    };
    while (angle > 180) {
	angle -= 360;
    };
    if (angle < 0) {
	angle += 360;
    };
    angle = b1 - angle/2 + 180;
    (lat,lon) = transport(lat2, lon2, angle, d);
    return (lat,lon);
}

// https://stackoverflow.com/questions/2187657/calculate-second-point-knowing-the-starting-point-and-distance
// https://stackoverflow.com/questions/7222382/get-lat-long-given-current-point-distance-and-bearing
function transport(lat1,lon1,angle,dist) {
    // Starting from lat1,lon2 go in bearing angle for distance dist
    var pi = 3.14159265359;
    var rad = pi/180;
    lat1 *= rad;
    lon1 *= rad;
    angle *= rad;
    radius = 6378.1  * 1000;
    var lat2 = asin( sin(lat1) * cos(dist/radius) + cos(lat1) * sin(dist/radius) * cos(angle) );
    var lon2 = lon1 + atan2(sin(angle) * sin(dist/radius) * cos(lat1), cos(dist/radius) -sin(lat1) * sin(lat2)	);
    lat2 /= rad;
    lon2 /= rad;
    return (lat2,lon2);
}

// http://www.movable-type.co.uk/scripts/latlong.html
function bearing(lat1, lon1, lat2, lon2) {
    // Calculate the bearing from p1 to p2, provided as four coords
    var pi = 3.14159265359;
    var rad = pi/180;
    lat1 *= rad;
    lat2 *= rad;
    lon1 *= rad;
    lon2 *= rad;    
    var y = sin(lon2-lon1) * cos(lat2);
    var x = cos(lat1)* sin(lat2) - sin(lat1) * cos(lat2) * cos(lat2-lat1);
    var brng = atan2(y, x) / rad;
    return brng;
};

