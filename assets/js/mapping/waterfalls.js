



function pageLaunch() {

    var mymap = L.map('lf-map', { attributionControl: false }).setView([-37.56655532524054, 149.1559270001807], 11);
    var legend = L.map('legend', { zoomControl: false, attributionControl: false, dragging: false }).setView([0, 0], 1);

    connectMap(mymap);
    connectLegend(legend, 'legend');

    var carto = baseVicWms("CARTO_VG").addTo(mymap);
    var photo = baseVicWms("AERIAL_VG");
    var ovrly = baseVicWms("CARTO_OVERLAY_VG");

    var compo = L.layerGroup([photo, ovrly]);

    var baseMaps = {
        "Basemap": carto,
        "Image": compo,
    };

    var popControl = L.control.layers(baseMaps, null, { sortLayers: true });
    connectControl(popControl);

    popControl.addTo(mymap);
    L.control.scale({ imperial: false, metric: true, updateWhenIdle: true }).addTo(mymap);
    L.control.attribution({ prefix: false }).addAttribution("From: DELWP Web Map Services").addTo(mymap);
    setFocusLayer(L.tileLayer(''));
    freshenLeaflet(mymap);

    var _polyInterest = {
        symbology: {
            fillColor: "#930eab", //EAAFD8",
            color: "#edbbcd", //FAEFA8",
            weight: 0.5,
            opacity: 1,
            fillOpacity: 0.5,
        },
        _symFilter: function (feature) { return null; }
    };

    var _symInterest = {};
    Object.assign(_symInterest, _polyInterest);
    _symInterest.radius = 8;

    var _symObject = {
        symbology: {
            radius: 4,
            fillColor: "#F49F68",
            color: "#F4CF78",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8,
        },
        _symFilter: function (feature) { return null; }
    };

    _polyInterest._symFilter = function (feature) {
        if (feature.properties.ACT) { //GENER_TYPE == '1') {
            return true;
        } else {
            return false;
        }
    }

    _symInterest._symFilter = function (feature) {
        if (
            (feature.properties.FAC_TYPE == "REC SITES")
        ) {
            return "Recreation and Nature";
        }
        return null;
    }

    _symObject._symFilter = function (feature) {
        var generalDescriptor = "Installed Structure";
        if (feature.properties.ASSET_CLS !== 'SITE ELEMENT' ||
            feature.properties.CATEGORY == 'Gate' ||
            feature.properties.CATEGORY == 'Bench - Seat') {
            return generalDescriptor;
        }
        var structures = [
            'PICNIC SHELTER',
            'TOILET BLOCK',
            'VIEWING PLATFORM',
            'JETTY',
            'INFORMATION SHELTER',
        ];
        classed = feature.properties.ASSET_CLS;
        if (
            (classed && structures.includes(classed))
        ) {
            return generalDescriptor;
        }
        return null;
    }

    var _symStyles = [_polyInterest];
    var _symPoints = [_symInterest, _symObject];
    var _popupFilters = function (layer) {
        if (layer.feature.properties.ACT) {
            if ((layer.feature.properties.LABEL ?? " ") == " ") {
                return layer.feature.properties.NAME;
            } else {
                return layer.feature.properties.LABEL;
            }
        }
        if (layer.feature.properties.FAC_TYPE == "REC SITES") {
            captioned = layer.feature.properties.LABEL ?? "Site of interest.";
            detailed = layer.feature.properties.COMMENTS ?? "";
            if (captioned && detailed) {
                captioned += ": " + detailed;
            }
            return captioned;
        }
        if (layer.feature.properties.ASSET_CLS == 'SITE ELEMENT' &&
            (layer.feature.properties.CATEGORY == 'Gate' ||
                layer.feature.properties.CATEGORY == 'Bench - Seat')) {
            return layer.feature.properties.CATEGORY;
        }
        return layer.feature.properties.ASSET_CLS;
    }

    var layerParameters = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        maxFeatures: 200,
        outputFormat: 'application/json',
        bbox: '-37.853854677977594,148.09321731872052,-36.620632663222686,150.03230420798283'
    };

    var rootUrl = 'https://services.land.vic.gov.au/catalogue/publicproxy/guest/dv_geoserver/wfs?';

    layerParameters.typeName = 'datavic:FORESTS_RECWEB_ASSET';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l1 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters);
    layerParameters.typeName = 'datavic:FORESTS_RECWEB_SITE';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l2 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters);

    var bufferLine = function (buffering) {
        return turf.buffer(buffering, 3.5, { units: 'metres' });
    };

    var _polyLinework = {};
    Object.assign(_polyLinework, _polyInterest);
    _polyLinework._symFilter = function (feature) {
        return true;
    }

    var _popupQuick = function (layer) {
        var ezi = (layer.feature.properties.EZI_ROAD_NAME_LABEL == "Unnamed")
            ? null : layer.feature.properties.EZI_ROAD_NAME_LABEL;
        return (ezi ?? layer.feature.properties.LEFT_LOCALITY)
            ?? layer.feature.properties.RIGHT_LOCALITY;
    }

    layerParameters.typeName = 'datavic:VMTRANS_WALKING_TRACK';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l2 = getWFS(URL, mymap, [_polyLinework], [], _popupQuick, false, "Walking", bufferLine);
    // layerParameters.typeName = 'datavic:FORESTS_RECWEB_TRACK';
    // var URL = rootUrl + L.Util.getParamString(layerParameters);
    // var l2 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters);

    layerParameters.typeName = 'datavic:CROWNLAND_PLM25_H_A_C_FEAT_RES';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l3 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters, false, "Historical");
    layerParameters.typeName = 'datavic:CROWNLAND_PLM25_COMM_USE_AREA';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l4 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters, false, "Community");

    layerParameters.typeName = 'datavic:CROWNLAND_PLM25_FOREST_PARK';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l5 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters, false, "Forest parks");

    layerParameters.typeName = 'datavic:CROWNLAND_PLM25_NATURAL_FEAT';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l6 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters, false, "Landscape");
    layerParameters.typeName = 'datavic:CROWNLAND_PLM25_NATURE_CONSERV';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l7 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters, false, "Conservation");

    layerParameters.typeName = 'datavic:CROWNLAND_PLM25_ALPINE_RESORT';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l8 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters, false, "Resorts");

    layerParameters.typeName = 'datavic:CROWNLAND_PLM25_COASTAL_RES';
    var URL = rootUrl + L.Util.getParamString(layerParameters);
    var l9 = getWFS(URL, mymap, _symStyles, _symPoints, _popupFilters, false, "Coastal");

    ////////////////////////////////////////////////
    ////////////////////////////////////////////////

    var layerParameters = {
        service: 'WFS',
        version: '2.0.0',
        request: 'GetFeature',
        typeName: 'datavic:VMHYDRO_WATERFALL',
        // typeName: 'datavic:FORESTS_OG100', 
        //, ,datavic:FORESTS_OG100 datavic:FLORAFAUNA1_NV2005_EVCBCS_9_1',datavic:FORESTS_RECWEB_POI
        maxFeatures: 200,
        outputFormat: 'application/json',
    };

    var parameters = L.Util.extend(layerParameters);
    var URL = rootUrl + L.Util.getParamString(parameters);

    var WFSLayer = null;
    fetch(URL).then(function (response) {
        response.json().then(function (lyr) {
            WFSLayer = L.geoJson(lyr, {

                pointToLayer: function (feature, latlng) {
                    return legendStyle("Waterfall",
                        L.circleMarker(latlng, {
                            radius: 4,
                            fillColor: "#6AF880",
                            color: "#4AcF68",
                            weight: 3,
                            opacity: 1,
                            fillOpacity: 0.25,
                        })
                    );
                }

            }).bindPopup(function (layer) {
                if (layer.feature.properties.NAME) {
                    return layer.feature.properties.NAME;
                } else {
                    return "Waterfalls";
                }
            }).addTo(mymap);
        })
            .then(function () {
                setFocusLayer(WFSLayer);
            });
    });


    /*Legend specific*/

    //////////////////////////////////////////////////////

    // var wmsLayer = L.tileLayer.wms("http://services.land.vic.gov.au/catalogue/publicproxy/guest/dv_geoserver/datavic/ows?", {
    //   dpiMode: '7',
    //   featureCount: '10',
    //   layers: 'VMTRANS_TR_ROAD',
    //     format: 'image/png',
    //     transparent: 'true',
    // }).addTo(mymap);
    // var wmsLayer = L.tileLayer.wms(", {
    //   dpiMode: '7',
    //   featureCount: '10',
    //   layers: 'FLORAFAUNA1_NV2005_EVCBCS_9_1,FLORAFAUNA1_NV1750_EVCBCS_9_1',
    //     format: 'image/png',
    //     transparent: 'true',
    // }).addTo(mymap);

}