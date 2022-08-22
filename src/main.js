
// DOM Elements
const selectPos = document.querySelector('#app_form-position-select')
const selectType = document.querySelector('.select-workout')
const selectSort = document.querySelector('#app_form-sortby-select')

const inputPosEnding = document.querySelector('#app_form-input-ending')
const inputDuration = document.querySelector('#app_form-input-duration')

const labelDistance = document.querySelector('.form_workout-distance-label')
const labelDuration = document.querySelector('.form_workout-duration-label')
const labelPace = document.querySelector('.form_workout-pace-label')
const labelTemp = document.querySelector('.form_workout-temp-label')


// App Class
class App {
    _accessToken = 'pk.eyJ1IjoibWlsa29xcSIsImEiOiJjbDZtZTY3encwMzM3M2JubDFncjgzM2x1In0.LnjZPWDRE_YiImykL9OeMw'
    _distance;
    _fetchType = 'walking'
    _map;
    _mapZoomLevel = 15
    _markers = []
    _markerStart;
    _markerStartCoords;
    _markerEnd;
    _markerEndCoords;
    _markerRoutes = []
    _userLng;
    _userLat;

    constructor() {
        this._init()

    }

    async _init() {
        try {
            console.log('e')
            const pos = await this._getPosition()
            const { longitude: lng, latitude: lat } = pos.coords
            this._userLng = lng;
            this._userLat = lat;
            console.log(lng, lat)
            await this._loadMap(lng, lat)
            this._setMarkerStart(lng, lat)
            this._map.on('click', this._setMarkerEnd.bind(this))
            selectPos.addEventListener('change', this._setMarkerStartToDrag.bind(this))
        }
        catch (e) {
            console.log(e)
        }
    }

    _getPosition() {
        // Get User Coords
        return new Promise(function (resolve, reject) {
            navigator.geolocation.getCurrentPosition(resolve, reject);

        });
    };

    wait(seconds) {
        return new Promise((resolve) => {

            setTimeout(resolve, seconds * 1000)

        })
    }

    async _loadMap(lng, lat) {
        try {
            // Get Map with position coords.
            this._map = new mapboxgl.Map({
                accessToken: this._accessToken,
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [lng, lat], // starting position
                zoom: this._mapZoomLevel
            });

        }
        catch {
            throw new Error('Could not Initialize Map')
        }

    }

    _setMarkerStart(lng, lat) {
        this._markerStart = new mapboxgl.Marker()
            .setLngLat([lng, lat])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Current Position'))
            .addTo(this._map);
        this._markerStartCoords = Object.values(this._markerStart.getLngLat());
        this._markers.push(this._markerStart)
        this._markerRoutes.push(this._markerStartCoords)
        // Print the marker's longitude and latitude values in the console
        console.log(this._markerStartCoords)
    }

    async _setMarkerEnd(e) {
        // Get Lng/Lat positions from click on map
        let { lng, lat } = e.lngLat

        // Assigning to markerEndCoords global property.
        this._markerEndCoords = [lng, lat]

        // Set Marker End if it doesn't exist.
        if (!this._markerEnd) {

            this._markerEnd = new mapboxgl.Marker({
                color: "#FFFFFF",
                draggable: true
            }).setLngLat([lng, lat])
                // .setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML("<h4>Run in Komotini</h4>")) // add popup
                .addTo(this._map)

            inputPosEnding.value = `${lng}, ${lat.toFixed(4)}`
            this._markers.push(this._markerEnd)
            this._markerRoutes.push([lng, lat])
            await this._updateRoute(this._markerStartCoords, this._markerEndCoords)
            this._markerEnd.setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML("<h4>Run in Komotini</h4>" + this._distance + 'km')) // add popup
            this._markerEnd.togglePopup()


        }


        // document.querySelector('.form').classList.remove('hidden')

        async function onDragEnd() {
            // Function fires when dragging of 2nd marker stops.
            // Get Lng/Lat from Marker
            this._markerEndCoords = Object.values(this._markerEnd.getLngLat());
            inputPosEnding.value = `${this._markerEndCoords[0].toFixed(4)}, ${this._markerEndCoords[1].toFixed(4)}`;
            await this._updateRoute(this._markerStartCoords, this._markerEndCoords)
            this._markerEnd.setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML("<h4>Run in Komotini</h4>" + this._distance + 'km'))
            this._markerEnd.togglePopup()
        }
        this._markerEnd.on('dragend', onDragEnd.bind(this))


    }

    _setMarkerStartToDrag() {
        if (selectPos.value === 'dragToPos') {
            this._markerStart.setDraggable(true)
            console.log(this._markerStart.isDraggable())
            this._markerStart.on('dragend', this._updateMarkerStartCoords.bind(this))


        }

        if (selectPos.value === 'currentPos') {
            this._markerStart.remove()
            this._setMarkerStart(this._userLng, this._userLat)
            this._markerStartCoords = Object.values(this._markerStart.getLngLat())
            this._updateRoute(this._markerStartCoords, this._markerEndCoords)
        }
    }

    _updateMarkerStartCoords() {
        this._markerStartCoords = Object.values(this._markerStart.getLngLat())
        console.log(this._markerStartCoords)
        this._updateRoute(this._markerStartCoords, this._markerEndCoords)

    }

    async _updateRoute(start, end) {
        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/${this._fetchType}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${this._accessToken}`
        );
        const json = await query.json();
        const data = json.routes[0];
        this._distance = (data.distance / 1000).toFixed(2)
        inputDistance.textContent = `Distance: ${this._distance}km`
        const route = data.geometry.coordinates;
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: route
            }
        };
        // if the route already exists on the map, we'll reset it using setData
        if (this._map.getSource('route')) {
            this._map.getSource('route').setData(geojson);
        }
        // otherwise, we'll make a new request
        else {
            this._map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: geojson
                },
                layout: {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                paint: {
                    'line-color': '#3887be',
                    'line-width': 5,
                    'line-opacity': 0.75
                }
            });
        }
    }
}

const app = new App()


