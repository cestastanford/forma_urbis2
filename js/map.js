// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //
// -- map.js (JavaScript) -------------------------------------------------- //
// -- written by Cody M Leff (codymleff@gmail.com) ------------------------- //
// -- for Forma Urbis Romae at CESTA - Spatial History Lab ----------------- //
// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //

/*
*   This script registers a controller and directive with the main module for
*   the map view.
*/

(function() {

    var module = angular.module('FormaUrbisRomae');

    /*
    *   This service allows raster layers to be shared from the layer list
    *   to the map.
    */
    module.factory('MapRasterService', function() {

        //  Exports object.
        var exports = {};

        //  Internal data
        var activeRasterLayers = [];

        //  Submits a raster layer to be displayed
        exports.addRasterLayer = function(layer) {

            activeRasterLayers.push(layer);

        };

        //  Remove a raster layer from display
        exports.removeRasterLayer = function(layer) {

            var index = activeRasterLayers.indexOf(layer);
            activeRasterLayers.splice(index, 1);

        };

        //  Expose the list of raster layers for use by the map
        exports.activeRasterLayers = activeRasterLayers;

        return exports;

    });

    /*
    *   This is the controller for the map; it creates it and watches for
    *   changes in the source layers for updating.  It also communicates with
    *   the URL controller to set and save the map bounds.
    */
    module.controller('MapController', function($scope, $window, SearchResults, MapRasterService, URLController) {

        /*
        *   The currently displayed raster and vector Leaflet layers.
        */
        var rasterLayersOnMap = [];
        var vectorLayersOnMap = [];

        /*
        *   The data sources for the map.
        */
        $scope.raster = MapRasterService.activeRasterLayers;
        $scope.vector = SearchResults.filteredActiveDatasets;


        /*
        *   Initial map center and map zoom.
        */
        var MAP_OPTIONS = {

            center: [41.899152, 12.476776],
            zoom: 16,
            scrollWheelZoom: false,

        };


        /*
        *   Point marker style.
        */
        var MARKER_OPTIONS = {

            radius: 4,
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8,

        };


        /*
        *   Polygon style.
        */
        var POLYGON_STYLE = {

            "weight": 1,
            "opacity": 0.6,

        };


        /*
        *   Sets up the Leaflet map on the page.
        */
        var map = L.map('map', MAP_OPTIONS);
        if (URLController.initialSearch) {

            console.log('bounds fit: ', URLController.initialSearch.mapBounds);
            map.fitBounds(URLController.initialSearch.mapBounds);

        };


        /*
        *   Updates the URL bar initially and when the map bounds change.
        */
        URLController.setMapBounds(map.getBounds());
        map.on('moveend zoomend', function() {

            URLController.setMapBounds(map.getBounds());

        });


        /*
        *   Sets up a watch for changes to the raster layers, updating the
        *   map if layers are added or removed.
        */
        $scope.$watchCollection('raster', function(now, before) {

            //  get the added or removed layers
            var added = now.filter(function(layer) { return before.indexOf(layer) < 0; });
            var removed = before.filter(function(layer) { return now.indexOf(layer) < 0; });

            if (added.length) addRasterLayers(added);
            if (removed.length) removeRasterLayers(removed);

        });


        /*
        *   Sets up a watch for changes to the vector layers, updating the map
        *   if layers are added, removed or changed.
        */
        $scope.$watchCollection('vector', function(now, before) {

            //  get the added or removed layers
            var added = now.filter(function(layer) { return before.indexOf(layer) < 0; });
            var removed = before.filter(function(layer) { return now.indexOf(layer) < 0; });

            if (added.length) addVectorLayers(added);
            if (removed.length) removeVectorLayers(removed);

        });


        /*
        *   Adds a new raster layer to the Leaflet map.
        */
        function addRasterLayers(rasterLayersToAdd) {

            for (var i = 0; i < rasterLayersToAdd.length; i++) {

                var rasterLayerToAdd = rasterLayersToAdd[i];

                var newRasterLayer = L.tileLayer(rasterLayerToAdd.url, {
                    tms: rasterLayerToAdd.tms,
                    attribution: rasterLayerToAdd.attribution,
                });

                map.addLayer(newRasterLayer);
                rasterLayersOnMap.push({
                    name: rasterLayerToAdd.name,
                    leafletLayer: newRasterLayer,
                });

            }
        };


        /*
        *   Removes a raster layer from the Leaflet map.
        */
        this.removeRasterLayers = function(rasterLayersToRemove) {

            for (var i = 0; i < rasterLayersToRemove.length; i++) {

                var rasterLayerToRemove = rasterLayersToRemove[i];

                //  gets a reference to the existing layer on the map
                var rasterLayerOnMap = rasterLayersOnMap.filter(function(rasterLayerOnMap) {
                    return rasterLayerToRemove.name === rasterLayerOnMap.name;
                })[0];

                this.mapElement.removeLayer(rasterLayerOnMap.leafletLayer);
                var index = rasterLayersOnMap.indexOf(rasterLayerOnMap);
                rasterLayersOnMap.splice(index, 1);

            }
        }


        /*
        *   Adds a vector layers to the Leaflet map.
        */
        function addVectorLayers(vectorLayersToAdd) {

            for (var i = 0; i < vectorLayersToAdd.length; i++) {

                var vectorLayerToAdd = vectorLayersToAdd[i];

                var newVectorLayer = L.geoJson(vectorLayerToAdd.geoJSON, {

                    pointToLayer: function (feature, latlng) {

                        return L.circleMarker(latlng, MARKER_OPTIONS);

                    },

                    style: $.extend({}, POLYGON_STYLE, {color: vectorLayerToAdd.color}),

                });

                map.addLayer(newVectorLayer);
                if (vectorLayerToAdd.geoJSON.totalFeatures && vectorLayerToAdd.geoJSON.features[0].geometry.type !== 'Point') newVectorLayer.bringToBack();

                vectorLayersOnMap.push({
                    name: vectorLayerToAdd.name,
                    leafletLayer: newVectorLayer,
                });

            }

        };


        /*
        *   Removes a vector layer from the Leaflet map.
        */
        function removeVectorLayers(vectorLayersToRemove) {

            for (var i = 0; i < vectorLayersToRemove.length; i++) {

                var vectorLayerToRemove = vectorLayersToRemove[i];

                //  gets a reference to the existing layer on the map
                var vectorLayerOnMap = vectorLayersOnMap.filter(function(vectorLayerOnMap) {
                    return vectorLayerToRemove.name === vectorLayerOnMap.name;
                })[0];

                map.removeLayer(vectorLayerOnMap.leafletLayer);
                var index = vectorLayersOnMap.indexOf(vectorLayerOnMap);
                vectorLayersOnMap.splice(index, 1);

            }

        };


    });

    /*
    *   The directive for the map element in the HTML.
    */
    module.directive('map', function() {

        return {

            restrict: 'E',
            template: '<div id="map"></div>',
        };

    })

})();
