# JOSM-Scripts-HOT
JOSM scripts for the JOSM scripting plugin (https://github.com/Gubaer/josm-scripting-plugin), with a focus on supporting HOTOSM tasks (https://www.hotosm.org/) in JOSM.

How to install: see http://bjohas.de/wiki/Maps/JOSM/scripting_plugin and then clone this repository into your JOSM/plugins/scripting/modules/ directory (or a custom directory, which you need to set up separately).

The main scripts are:
- markResAreas.js 
- addOLC.js
- processNodeBuildings.js (previously nodeBuilding2Way.js)
- www/mmstats.html

Third-party / our utilities (in lib/ folder):
- DBSCAN.js
- graham_scan.js
- openlocationcode.js
- geoutils.js
- mmstats.js
- jquery.js

Some examples of javascript code for the scripting plugin can be found in the examples/ folder.

Helpful links:
- JOSM scripting plugin https://github.com/Gubaer/josm-scripting-plugin
- Documentation: http://gubaer.github.io/josm-scripting-plugin/
- API for Javascript: http://gubaer.github.io/josm-scripting-plugin/apidoc/namespaces/josm.html

Other JOSM scripting examples:
- https://github.com/bagage/cadastre-conflation
