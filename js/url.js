// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //
// -- url.js (JavaScript) -------------------------------------------------- //
// -- written by Cody M Leff (codymleff@gmail.com) ------------------------- //
// -- for Forma Urbis Romae at CESTA - Spatial History Lab ----------------- //
// ------------------------------------------------------------------------- //
// ------------------------------------------------------------------------- //

/*
*   This script creates the service that reads from and updates the URL bar
*   to enable loading and saving application states.
*/

(function() {

    var module = angular.module('FormaUrbisRomae');

    /*  Controller for the URL bar.  If the URL contains meaningful
    *   data on application launch the controller attempts to recreate
    *   those search conditions.  The controller also updates the URL with
    *   a string representing the current application state.
    */
    module.factory('URLController', function($log, $location, LayerHierarchy, Filters) {


        /*
        *   Exports object.
        */
        var exports = {};

        /*
        *   Holds the promise from the initial filtering.
        */
        exports.done = null;

        /*
        *   Saved state.
        */
        var layers = [];
        var encodedFilters = {};
        var mapBounds = [];


        /*
        *   Loads initial state from URL, if URL contains valid data.
        */
        if ($location.path() === '/search') {

            exports.initialSearch = parseSearch($location.search());
            setURL();

        }


        /*
        *   Parses the search into native objects.
        */
        function parseSearch(search) {

            //  save layers
            if (typeof search.layers === 'string') layers.push(search.layers);
            else if (search.layers) layers = search.layers;
            else layers = [];
            delete search.layers;

            //  save map bounds
            mapBounds = search.mapBounds;
            delete search.mapBounds;

            //  non-filter-value key/value pairs have been removed from the
            //  search, so the rest are encoded filter values.
            encodedFilters = search;
            var filtersPromise = Filters.done.then(function() {

                exports.initialSearch.filters = decodeFilterValues(encodedFilters);

            });


            return {

                    layers: layers,
                    filtersPromise: filtersPromise,
                    mapBounds: mapBounds,

            };

        };


        /*
        *   Decodes filter values into an array of filters.
        */
        function decodeFilterValues(encodedFilters) {

            var decodedFilters = [];

            for (var key in encodedFilters) {

                if (encodedFilters.hasOwnProperty(key)) {

                    var filterID_valueType = key.split('.');

                    var filterIndex = +(filterID_valueType[0].split('-')[1]);
                    if (!decodedFilters[filterIndex]) decodedFilters[filterIndex] = {};
                    var filter = decodedFilters[filterIndex];

                    var valueType = filterID_valueType[1];

                    if (valueType === 'template') {

                        var templateName = encodedFilters[key];
                        filter.template = Filters.filterTemplates[templateName];

                    }

                    if (valueType === 'subtypes') {

                        if (!filter.subtypes) filter.subtypes = {};

                        if (typeof encodedFilters[key] === 'string') {

                            var subtypeName = encodedFilters[key];
                            filter.subtypes[subtypeName] = true;

                        } else for (var i = 0; i < encodedFilters[key].length; i++) {

                            var subtypeName = encodedFilters[key][i];
                            filter.subtypes[subtypeName] = true;

                        }
                    }

                    else {

                        var valueIndex = key.split('_')[1];
                        if (!filter.values) filter.values = [];
                        filter.values[valueIndex] = encodedFilters[key];

                    }

                }
            }
            return decodedFilters;
        }


        /*
        *   Sets the URL.
        */
        function setURL() {

            var search = encodedFilters;
            search.layers = layers;
            search.mapBounds = mapBounds;

            $location.path('/search');
            $location.search(search);
        };


        /*
        *   Adds a layer to the URL bar.
        */
        exports.setLayers = function(incomingLayers) {

            layers = incomingLayers;
            setURL();

        };


        /*
        *   Sets the filters in the URL bar.
        */
        exports.setFilters = function(incomingFilters) {

            //  need to encode filters as an object with single-depth array
            //  properties for successful URL encoding.

            encodedFilters = {};

            for (var i = 0; i < incomingFilters.length; i++) {

                var filter = incomingFilters[i];
                var filterID = 'filter-' + i;

                //  encode template
                var templateKey = filterID + '.template';
                var templateValue = filter.template.name;
                encodedFilters[templateKey] = templateValue;

                //  encode subtypes
                var subtypesKey = filterID + '.subtypes';
                var subtypesValues = [];
                for (var subtype in filter.subtypes) {
                    if (filter.subtypes.hasOwnProperty(subtype)) {
                        if (filter.subtypes[subtype]) subtypesValues.push(subtype);
                    }
                }
                encodedFilters[subtypesKey] = subtypesValues;

                //  encode values
                for (var j = 0; j < filter.values.length; j++) {
                    var valueKey = filterID + '.value_' + j;
                    encodedFilters[valueKey] = filter.values[j];
                }
            }

            setURL();

        };


        /*
        *   Sets the map bounds in the URL bar.
        */
        exports.setMapBounds = function(mapBoundsArray) {

            mapBounds = mapBoundsArray;
            setURL();
        };


        return exports;
    });

})();
