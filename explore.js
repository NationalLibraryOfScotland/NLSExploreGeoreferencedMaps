
	var map;

// Do not display any warning for missing tiles

	OpenLayers.IMAGE_RELOAD_ATTEMPTS = 3;
	OpenLayers.Tile.Image.useBlankTile=true;

	function getOverlay() {
	    var layers = map.layers.slice();
	    for (var x = 0; x < layers.length; x++) {
	        if (!layers[x].isBaseLayer && layers[x].displayInLayerSwitcher && layers[x].getVisibility()) return layers[x];
	    }
	}


	function forceRedraw() {
	    var mapDiv = document.getElementById('map');
	    /// FIX THE STUPID MICROSOFT IE:
	    if (document.documentElement && document.documentElement.clientWidth)
	            mapDiv.style.width = document.documentElement.clientWidth - 267;
	    if (document.documentElement && document.documentElement.clientHeight)
	            mapDiv.style.height = document.documentElement.clientHeight - 130;
	
	    if (map) {
	       map.zoomIn();
	       map.zoomOut(); 
	    }   
	}   

	function init() {
	    forceRedraw(); // This must be called before OpenLayers map is initialized

// Changes the base layer

	    function mapBaseLayerChanged(e) {
	        // console.log(e.type + " " + e.layer.name);
	        if (e.layer.backgroundColor)
	        map.div.style.backgroundColor = e.layer.backgroundColor;
	        if (e.layer && document.getElementById('baseOption' + e.layer.name))
	        document.getElementById('baseOption' + e.layer.name).selected = true;
	        if (getOverlay()) forceRedraw();
	    }

// Changes the overlay layer from the georeferenced tileset

	    function mapLayerChanged(e) {
	        // console.log(e.type + " " + e.layer.name + " " + e.property);
	        // if (vectors) vectors.removeAllFeatures();
	        if (e.layer && document.getElementById('overlayRadio' + e.layer.name))
	        document.getElementById('overlayRadio' + e.layer.name).checked = true;
	        // setResults();
	    }

// The main OpenLayers map elements

	    map = new OpenLayers.Map('map', {
	        div: document.getElementById("map"),
	        controls: [
	        new OpenLayers.Control.TouchNavigation({
	                dragPanOptions: { enableKinetic: true }
	
	            }),
	        new OpenLayers.Control.Navigation({'zoomWheelEnabled': true}),
	        new OpenLayers.Control.Zoom(),
	        new OpenLayers.Control.ArgParser(),
	        new OpenLayers.Control.Attribution()
	        ],
	        eventListeners: {
	            "changelayer": mapLayerChanged,
	            "changebaselayer": mapBaseLayerChanged
	        },
	        projection: "EPSG:900913",
	        displayProjection: new OpenLayers.Projection("EPSG:4326")
	    });

// The scalebar on the map

         var scalebar = new OpenLayers.Control.ScaleLine({
                geodesic: true,
                div: document.getElementById("scalebar"),
                displaySystem: "english",
                maxWidth: 110,
                align: "right"
             });
          map.addControl(scalebar);

// The lat/lon of the mouse position 

    var mouseposition = new OpenLayers.Control.MousePosition();

// This code below converts the lat lon into a British National Grid Reference. With thanks from http://www.movable-type.co.uk/scripts/latlong-gridref.html NT261732

    function gridrefNumToLet(e, n, digits) {
        // get the 100km-grid indices
        var e100k = Math.floor(e / 100000),
        n100k = Math.floor(n / 100000);

        if (e100k < 0 || e100k > 6 || n100k < 0 || n100k > 12) return '';

        // translate those into numeric equivalents of the grid letters
        var l1 = (19 - n100k) - (19 - n100k) % 5 + Math.floor((e100k + 10) / 5);
        var l2 = (19 - n100k) * 5 % 25 + e100k % 5;

        // compensate for skipped 'I' and build grid letter-pairs
        if (l1 > 7) l1++;
        if (l2 > 7) l2++;
        var letPair = String.fromCharCode(l1 + 'A'.charCodeAt(0), l2 + 'A'.charCodeAt(0));

        // strip 100km-grid indices from easting & northing, and reduce precision
        e = Math.floor((e % 100000) / Math.pow(10, 5 - digits / 2));
        n = Math.floor((n % 100000) / Math.pow(10, 5 - digits / 2));

        Number.prototype.padLZ = function(w) {
            var n = this.toString();
            for (var i = 0; i < w - n.length; i++) n = '0' + n;
            return n;
        }

        var gridRef = letPair + e.padLZ(digits / 2) + n.padLZ(digits / 2);

        return gridRef;
    }
	function gridrefLetToNum(gridref) {
	  // get numeric values of letter references, mapping A->0, B->1, C->2, etc:
	  var l1 = gridref.toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0);
	  var l2 = gridref.toUpperCase().charCodeAt(1) - 'A'.charCodeAt(0);
	  // shuffle down letters after 'I' since 'I' is not used in grid:
	  if (l1 > 7) l1--;
	  if (l2 > 7) l2--;

	  // convert grid letters into 100km-square indexes from false origin (grid square SV):
	  var e = ((l1-2)%5)*5 + (l2%5);
	  var n = (19-Math.floor(l1/5)*5) - Math.floor(l2/5);

	  // skip grid letters to get numeric part of ref, stripping any spaces:
	  gridref = gridref.slice(2).replace(/ /g,'');

	  // append numeric part of references to grid index:
	  e += gridref.slice(0, gridref.length/2);
	  n += gridref.slice(gridref.length/2);

	  // normalise to 1m grid, rounding up to centre of grid square:
	  switch (gridref.length) {
		case 2: e += '5000'; n += '5000'; break;
	    case 4: e += '500'; n += '500'; break;
	    case 6: e += '50'; n += '50'; break;
	    case 8: e += '5'; n += '5'; break;
	    // 10-digit refs are already 1m
	  }

	  return [e, n];
	}

    mouseposition.formatOutput = function(lonLat) {
        // Add Ordnance Survey coordinates
        var osgb = lonLat.clone();
        osgb.transform(map.displayProjection, new OpenLayers.Projection('EPSG:27700'));
        var newHtml = this.prefix +
        '<b>' + gridrefNumToLet(osgb.lon, osgb.lat, 6) + '</b>' + '<br/>' +
        osgb.lon.toFixed(0) + this.separator + osgb.lat.toFixed(0) + '<br/>' +
        lonLat.lon.toFixed(5) + this.separator + lonLat.lat.toFixed(5) +
        this.suffix;
        return newHtml;
    }
    map.addControl(mouseposition);
    // map.addControl( new OpenLayers.Control.Permalink({ anchor: true }));

// Predefined resolutions for Google/Bing/OSM layers based on EPSG:900913 - to save retyping for each tileset

    var allresolutions = [156543.03390625, 78271.516953125, 39135.7584765625,
                      19567.87923828125, 9783.939619140625, 4891.9698095703125,
                      2445.9849047851562, 1222.9924523925781, 611.4962261962891,
                      305.74811309814453, 152.87405654907226, 76.43702827453613,
                      38.218514137268066, 19.109257068634033, 9.554628534317017,
                      4.777314267158508, 2.388657133579254, 1.194328566789627,
                      0.5971642833948135, 0.2985821416974068, 0.1492910708487034,
                      0.0746455354243517, 0.0373227677121759];

    var  tileserverResolutions = [156543.03390625, 78271.516953125, 39135.7584765625,
	                            19567.87923828125, 9783.939619140625,
	                            4891.9698095703125, 2445.9849047851562,
	                            1222.9924523925781, 611.4962261962891,
	                            305.74811309814453, 152.87405654907226];

    var  serverResolutions22 = [156543.03390625, 78271.516953125, 39135.7584765625,
                      19567.87923828125, 9783.939619140625, 4891.9698095703125,
                      2445.9849047851562, 1222.9924523925781, 611.4962261962891,
                      305.74811309814453, 152.87405654907226, 76.43702827453613,
                      38.218514137268066, 19.109257068634033, 9.554628534317017,
                      4.777314267158508, 2.388657133579254, 1.194328566789627,
                      0.5971642833948135, 0.2985821416974068, 0.1492910708487034,  0.0746455354243517];

   var  serverResolutions21 = [156543.03390625, 78271.516953125, 39135.7584765625,
                      19567.87923828125, 9783.939619140625, 4891.9698095703125,
                      2445.9849047851562, 1222.9924523925781, 611.4962261962891,
                      305.74811309814453, 152.87405654907226, 76.43702827453613,
                      38.218514137268066, 19.109257068634033, 9.554628534317017,
                      4.777314267158508, 2.388657133579254, 1.194328566789627,
                      0.5971642833948135, 0.2985821416974068, 0.1492910708487034];

   var  serverResolutions19 = [156543.03390625, 78271.516953125, 39135.7584765625,
                            19567.87923828125, 9783.939619140625,
                            4891.9698095703125, 2445.9849047851562,
                            1222.9924523925781, 611.4962261962891,
                            305.74811309814453, 152.87405654907226,
                            76.43702827453613, 38.218514137268066,
                            19.109257068634033, 9.554628534317017,
			    4.777314267158508, 2.388657133579254, 
			    1.194328566789627, 0.5971642833948135];

   var  serverResolutions18 = [156543.03390625, 78271.516953125, 39135.7584765625,
                            19567.87923828125, 9783.939619140625,
                            4891.9698095703125, 2445.9849047851562,
                            1222.9924523925781, 611.4962261962891,
                            305.74811309814453, 152.87405654907226,
                            76.43702827453613, 38.218514137268066,
                            19.109257068634033, 9.554628534317017,
			    4.777314267158508, 2.388657133579254, 
			    1.194328566789627];

   var  serverResolutions17 = [156543.03390625, 78271.516953125, 39135.7584765625,
                            19567.87923828125, 9783.939619140625,
                            4891.9698095703125, 2445.9849047851562,
                            1222.9924523925781, 611.4962261962891,
                            305.74811309814453, 152.87405654907226,
                            76.43702827453613, 38.218514137268066,
                            19.109257068634033, 9.554628534317017,
			    4.777314267158508, 2.388657133579254];

   var  serverResolutions16 = [156543.03390625, 78271.516953125, 39135.7584765625,
                            19567.87923828125, 9783.939619140625,
                            4891.9698095703125, 2445.9849047851562,
                            1222.9924523925781, 611.4962261962891,
                            305.74811309814453, 152.87405654907226,
                            76.43702827453613, 38.218514137268066,
                            19.109257068634033, 9.554628534317017,
			    4.777314267158508];

   var  serverResolutions15 = [156543.03390625, 78271.516953125, 39135.7584765625,
                            19567.87923828125, 9783.939619140625,
                            4891.9698095703125, 2445.9849047851562,
                            1222.9924523925781, 611.4962261962891,
                            305.74811309814453, 152.87405654907226,
                            76.43702827453613, 38.218514137268066,
                            19.109257068634033, 9.554628534317017];

   var  serverResolutions14 = [156543.03390625, 78271.516953125, 39135.7584765625,
                            19567.87923828125, 9783.939619140625,
                            4891.9698095703125, 2445.9849047851562,
                            1222.9924523925781, 611.4962261962891,
                            305.74811309814453, 152.87405654907226,
                            76.43702827453613, 38.218514137268066,
                            19.109257068634033];

// Base map layers


	var gsat = new OpenLayers.Layer.Google("Background map - Google Satellite", {
	        type: google.maps.MapTypeId.SATELLITE,
	        numZoomLevels: 22
	    });

	var gmap = new OpenLayers.Layer.Google("Background - Google Maps", {
	        numZoomLevels: 20
	    });

	var ghyb = new OpenLayers.Layer.Google("Background - Google Hybrid", {
	        type: google.maps.MapTypeId.HYBRID,
	        numZoomLevels: 20
	    });

	var gphy = new OpenLayers.Layer.Google("Background - Google Terrain", {
	        type: google.maps.MapTypeId.TERRAIN,
	        numZoomLevels: 20
	    });

    	var osm = new OpenLayers.Layer.OSM( "Background - OpenStreetMap");

        var osmm = new OpenLayers.Layer.OSM("Background - OSM (MapQuest)", ["http://otile1.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
                        "http://otile2.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
                        "http://otile3.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg",
                        "http://otile4.mqcdn.com/tiles/1.0.0/osm/${z}/${x}/${y}.jpg"]); 

        var opendata = new OpenLayers.Layer.OSM("Background- OS OpenData, 2011", "http://geo.nls.uk/maps/opendata/${z}/${x}/${y}.png",
    {
        numZoomLevels: 17,
        backgroundColor: '#DFF3FC',
        attribution: '<a href="http://www.ordnancesurvey.co.uk/oswebsite/opendata/">Ordnance Survey OpenData</a> rendered by <a href="http://www.klokantech.com/" target="_blank">Klokan Technologies GmbH</a>',     
        tileOptions: {crossOriginKeyword: null},
	resolutions: allresolutions,
        serverResolutions: serverResolutions17,
        transitionEffect: 'resize'
    });

// Bing API key - please generate your own for use on a different server

    var apiKey = "AgS4SIQqnI-GRV-wKAQLwnRJVcCXvDKiOzf9I1QpUQfFcnuV82wf1Aw6uw5GJPRz";


    var veroad = new OpenLayers.Layer.Bing({
        name: "Background - Bing Roads",
        key: apiKey,
        type: "Road",
        wrapDateLine: true
    });

    var veaer = new OpenLayers.Layer.Bing({
        name: "Background - Bing Aerial",
        key: apiKey,
        type: "Aerial",
        wrapDateLine: true
    });

    var vehyb = new OpenLayers.Layer.Bing({
        name: "Background - Bing Hybrid",
        key: apiKey,
        type: "AerialWithLabels",
        wrapDateLine: true
    });

// Add all base layers - the first is active by default 

    var baseLayers = [ gsat, gmap, ghyb, gphy, veroad, veaer, vehyb, opendata, osm, osmm];
    map.addLayers(baseLayers);

// Maintains overhead view rather than 45 degree view at high zoom levels

    ghyb.mapObject.setTilt(0);

// Overlay layers from tilesets generated by MapTiler -  http://www.maptiler.org/ . 
// The oneinchpopular layer is uses the Google XYZ tiling conventions with a positive Y dimension (top down). 
// The second two layers use the OSGeo tiling where the Y dimension needs to be reversed - hence the final four lines in the statement
// See http://www.maptiler.org/google-maps-coordinates-tile-bounds-projection/ for further details

// One of the overlay layers should have visibility:true

    var oneinchpopular = new OpenLayers.Layer.OSM("Scotland, OS One Inch, 1921-1930", "http://geo.nls.uk/maps/os/popular/${z}/${x}/${y}.png",
    {
        numZoomLevels: 14,
        backgroundColor: '#eee',
	isBaseLayer: false, 
        visibility: true,
	resolutions: allresolutions,
        serverResolutions: serverResolutions15,
        transitionEffect: 'resize',
        tileOptions: {crossOriginKeyword: null}    
    });

    var engwalesnewpop = new OpenLayers.Layer.OSM("England and Wales, OS One Inch, 1945-47", "http://geo.nls.uk/maps/os/newpopular/${z}/${x}/${y}.png",
    {
        numZoomLevels: 16,
        backgroundColor: '#eee',
	isBaseLayer: false, 
        visibility: false,
	resolutions: allresolutions,
        serverResolutions: serverResolutions16,
        transitionEffect: 'resize',
        tileOptions: {crossOriginKeyword: null}
    });
	

   var irelandbart = new OpenLayers.Layer.OSM("Ireland, Bartholomew Quarter-Inch, 1940", "http://geo.nls.uk/maps/ireland/bartholomew/${z}/${x}/${y}.png",
    {
        numZoomLevels: 13,
        backgroundColor: '#eee',
	isBaseLayer: false, 
        visibility: false,
	resolutions: allresolutions,
        serverResolutions: serverResolutions14,
        transitionEffect: 'resize',
        tileOptions: {crossOriginKeyword: null}
    });
    irelandbart.getXYZ = function ( bounds ) {
      var xyz = OpenLayers.Layer.OSM.prototype.getXYZ.apply(this, arguments);
      xyz['y'] = (Math.pow(2, xyz['z'])-xyz['y']-1);
      return xyz;
    }

// Add all overlay layers

    map.addLayers([oneinchpopular, engwalesnewpop, irelandbart]);

// Initialize our baselayer + overlay switcher

    var layerSelect = document.getElementById('layerSelect');
    var overlaySelect = document.getElementById('overlaySelect');
    var layers = this.map.layers.slice();
    for (var x = 0; x < layers.length; x++) {
        if (!layers[x].displayInLayerSwitcher) continue;
        if (layers[x].isBaseLayer) {
            var option = document.createElement('option');
            option.appendChild(document.createTextNode(layers[x].name));
            option.setAttribute('value', x);
            option.setAttribute('id', 'baseOption' + layers[x].name);
            layerSelect.appendChild(option);
        } else {
            var option = document.createElement('div');
            var checked = (layers[x].getVisibility()) ? "checked" : "";
            option.innerHTML = '<input type="radio" name="overlay" id="overlayRadio'+ layers[x].name + '" value="' + x + '" onClick="switchOverlay(this.value)" ' + checked + '> ' + layers[x].name + '<br>';
            overlaySelect.appendChild(option);

// Change the layer in this line below to the initial overlay layer that is set to true

            jQuery("#slider-id").slider({ value: 100, slide: function(e, ui) { oneinchpopular.setOpacity(ui.value / 100);}});
        }
    }


// If we do not have a permalink set the default zoom and centre

    if (!map.getCenter()) {
        // Zoom map to extent of Scotland - coordintates must be trasformed from WGS84 to spherical mercator
        var proj = new OpenLayers.Projection("EPSG:4326");
        map.zoomToExtent(new OpenLayers.Bounds( -8.4, 50.5, 2.4, 59.8 ).transform(proj, map.getProjectionObject()));
    }


// Initialize the Gazetteer with autocomplete and County+Parish selector

    // Initialize the Gazetteer with autocomplete and County+Parish selector
    nlsgaz(function(minx,miny,maxx,maxy){
      // alert(minx + ' ' + miny + ' ' + maxx + ' ' + maxy);

      // zoom to gridref
      if (miny == null) {
	var osgbnum = gridrefLetToNum(minx);
        var osgb = new OpenLayers.LonLat(osgbnum[0], osgbnum[1]);
        osgb.transform(new OpenLayers.Projection('EPSG:27700'), new OpenLayers.Projection("EPSG:4326"));
        var osgb900913 = osgb.transform(new OpenLayers.Projection("EPSG:4326"), new OpenLayers.Projection("EPSG:900913"))
        return map.setCenter(osgb900913, 6+minx.length);
      }
      // zoom to bbox
      var proj = new OpenLayers.Projection("EPSG:4326");
      map.zoomToExtent(new OpenLayers.Bounds( minx, miny, maxx, maxy ).transform(proj, map.getProjectionObject()));
    });
}

// Alters the current overlay to a different overlay

	function switchOverlay(index) {
	    getOverlay().setVisibility(false);
	    map.layers[index].setVisibility(true);
	    jQuery("#slider-id").slider({ value: 100, slide: function(e, ui) { map.layers[index].setOpacity(ui.value / 100); }});
	    forceRedraw();
	}

