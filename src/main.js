"use strict";
// DOM Elements
const selectPos = document.querySelector('#app_form-position-select')
const selectType = document.querySelector('#app_form-type-select')
const selectSort = document.querySelector('#app_form-sortby-select')

const inputPosEnding = document.querySelector('#app_form-input-ending')
const inputDuration = document.querySelector('#app_form-input-duration')
const inputDistance = document.querySelector('#app_form-input-distance-label')

const labelDistance = document.querySelector('.form_workout-distance-label')
const labelDuration = document.querySelector('.form_workout-duration-label')
const labelPace = document.querySelector('.form_workout-pace-label')
const labelTemp = document.querySelector('.form_workout-temp-label')
const labelDurationError = document.querySelector('.app_input-label-danger')

const divOptions = document.querySelector('.app_options-component')
const divInput = document.querySelector('.app_left-form-input')
const divWorkout = document.querySelector('.app_left-form-workout')
const divBegin = document.querySelector('.app_form-begin')

const btnConfirm = document.querySelector('#button-save')
const btnCancel = document.querySelector('#button-cancel')

const btnNew = document.querySelector('.app_options-locate-wrapper')

// Workout Clas
// Maybe I should have split into subclasses Running/Cycling. But no real differences besides the 'type' to call super().
class Workout {
    _id = this._randomNumber(1, 1000)
    _date = new Date()
    _weatherToken = 'c0c4cb552464fc0334187736473c053a'
    constructor(type, distance, duration, temperature, locationRoad, locationCity, route) {
        this.type = type
        this.distance = distance
        this.duration = duration
        this.temperature = temperature
        this.locationRoad = locationRoad
        this.locationCity = locationCity
        this.route = route
        this._getPace()
    }



    _randomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    _getPace() {
        return this.pace = Number((this.distance / this.duration).toFixed(1))
    }



}

// App Class
class App {
    _accessToken = 'pk.eyJ1IjoibWlsa29xcSIsImEiOiJjbDZtZTY3encwMzM3M2JubDFncjgzM2x1In0.LnjZPWDRE_YiImykL9OeMw'
    _distance;
    _fetchType = 'walking'
    _map;
    _mapZoomLevel = 13
    _markers = []
    _markerStart;
    _markerStartCoords;
    _markerEnd;
    _markerEndCoords;
    _markerRoutes = []
    _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    _userLng;
    _userLat;
    _temperature;
    _locationCity;
    _locationStreet;
    _workouts = [];
    _type;
    _route;

    constructor() {
        this._init()
        btnConfirm.addEventListener('click', this._newWorkout.bind(this))
        btnNew.addEventListener('click', this._addNewWorkout.bind(this))

    }



    async _init() {
        try {

            console.log('Initialization ')
            const pos = await this._getPosition().catch(err => console.log(err))
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


        // Set Marker End if it doesn't exist.
        if (!this._markerEnd) {
            // Get Lng/Lat positions from click on map
            let { lng, lat } = e.lngLat

            // Assigning to markerEndCoords global property.
            this._markerEndCoords = [lng, lat]

            this._markerEnd = new mapboxgl.Marker({
                color: "#FFFFFF",
                draggable: true
            }).setLngLat([lng, lat])
                .addTo(this._map)

            inputPosEnding.value = `${lng}, ${lat.toFixed(4)}`
            this._markers.push(this._markerEnd)
            this._markerRoutes.push([lng, lat])
            console.log(this._markerRoutes)
            await this._fetchRoute(this._markerStartCoords, this._markerEndCoords)
            console.log(this._map.getLayer('route')) ////// UNDEFINED?
            console.log(this._route) /////// EXISTS
            this._markerEnd.setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML(`<h4 style="color: black">Run in Komotini ${this._distance}km</h4>`)) // add popup
            this._markerEnd.togglePopup()
            divBegin.classList.add('is--hidden')
            divInput.classList.remove('is--hidden')
            inputDuration.focus()


        }

        async function onDragEnd() {
            // Function fires when dragging of 2nd marker stops.
            // Get new Lng/Lat from Marker
            this._markerEndCoords = Object.values(this._markerEnd.getLngLat());
            inputPosEnding.value = `${this._markerEndCoords[0].toFixed(4)}, ${this._markerEndCoords[1].toFixed(4)}`;
            await this._fetchRoute(this._markerStartCoords, this._markerEndCoords)
            this._markerEnd.setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML(`<h4 style="color: black">Run in Komotini ${this._distance}km</h4>`)) // add popup
            this._markerEnd.togglePopup()
        }
        this._markerEnd.on('dragend', onDragEnd.bind(this))


    }

    _setMarkerStartToDrag() {
        if (selectPos.value === 'dragToPos') {
            this._markerStart.setDraggable(true)
            // console.log(this._markerStart.isDraggable())
            this._markerStart.on('dragend', this._updateMarkerStartCoords.bind(this))


        }

        if (selectPos.value === 'currentPos') {
            this._markerStart.remove()
            this._setMarkerStart(this._userLng, this._userLat)
            this._markerStartCoords = Object.values(this._markerStart.getLngLat())
            this._fetchRoute(this._markerStartCoords, this._markerEndCoords)
        }
    }

    _updateMarkerStartCoords() {
        this._markerStartCoords = Object.values(this._markerStart.getLngLat())
        console.log(this._markerStartCoords)
        this._fetchRoute(this._markerStartCoords, this._markerEndCoords)

    }

    _getJSON(url, errorMsg = 'Something went wrong') {
        return fetch(url).then(response => {
            if (!response.ok) throw new Error(`${errorMsg} (${response.status})`);

            return response.json();
        });
    };

    async _fetchRoute(start, end) {

        // let [jsonDir, jsonTemp] = await Promise.allSettled([
        //     this._getJSON(`https://api.mapbox.com/directions/v5/mapbox/${this._fetchType}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${this._accessToken}`),
        //     this._getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${start[1]}&longitude=${start[0]}&hourly=temperature_2m&current_weather=true`)
        // ])
        // why the fuck it doesn't work atm idk.

        const queryDir = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/${this._fetchType}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${this._accessToken}`
        );
        const queryTemp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${start[1]}&longitude=${start[0]}&hourly=temperature_2m&current_weather=true`)
        const queryLoc = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${end[1]}&lon=${end[0]}&apiKey=ae4d111379a849988e6112880aba2273`)
        const jsonTemp = await queryTemp.json()
        const jsonDir = await queryDir.json();
        const locTemp = await queryLoc.json()
        this._locationStreet = locTemp.features[0].properties.street ?? locTemp.features[0].properties.address_line1 ?? locTemp.features[0].properties.address_line2
        this._locationCity = locTemp.features[0].properties.city ?? locTemp.features[0].properties.country
        // console.log(jsonDir)
        // console.log(queryTemp, jsonTemp)
        // console.log(queryLoc, locTemp)
        const data = jsonDir.routes[0];
        this._distance = (data.distance / 1000).toFixed(2)
        this._temperature = jsonTemp.current_weather.temperature
        // console.log(this._temperature)con
        inputDistance.textContent = `Distance: ${this._distance}km`
        this._route = data.geometry.coordinates;
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: this._route
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

    _newWorkout(e) {
        e.preventDefault()
        // console.log(selectType)

        if (!(inputDuration.value && inputDuration.value > 0)) {
            labelDurationError.style.opacity = 1
            labelDurationError.textContent = `Required`
        }

        // Get data from form.
        // already global: _distance, _temperature
        const type = selectType.value
        const duration = +inputDuration.value
        let workout;


        if (type === 'running') {
            workout = new Workout(type, +this._distance, duration, this._temperature, this._locationStreet, this._locationCity, this._route)
        }
        this._workouts.push(workout)
        this._renderWorkout(workout)
        if (this._workouts.length > 0) {
            divOptions.classList.remove('is--hidden')
        }

    }

    _renderWorkout(workout) {
        let html = `
        <div class="app_left-form-workout">
        <div class="app_left-form-workout-side is--${workout.type}"></div>
        <div class="app_left-form-workout-main">
          <div class="form_workout-main-top">
            <div class="text-size-small">${String(workout._date.getDate())} ${this._months[workout._date.getMonth()]} ${workout._date.getFullYear()}</div>
          </div>
          <div class="form_workout-main-mid">
            <div class="text-block-5">Running in <span class="text-span">${workout.locationRoad}, ${workout.locationCity}.</span></div>
          </div>
          <div class="form_workout-main-bottom">
            <div class="div-block-7">
              <div class="form_workout-stats-wrapper"><img src="https://www.svgrepo.com/show/406153/man-biking-medium-dark-skin-tone.svg" loading="lazy" id="app_cycling-icon" alt="" class="workout-stats-icon is--hidden">
              <img src="https://www.svgrepo.com/show/400693/running.svg" loading="lazy" id="app_running-icon" alt="" class="workout-stats-icon">
                <div class="form_workout-distance-label">${workout.distance}</div>
                <div class="margin-left margin-xxsmall">
                  <div class="text-size-tiny">KM</div>
                </div>
              </div>
              <div class="form_workout-stats-wrapper">
            <img src="https://www.svgrepo.com/show/112325/timer.svg" loading="lazy" alt="" class="workout-stats-icon-copy">
                <div class="form_workout-duration-label">${workout.duration}</div>
                <div class="margin-left margin-xxsmall">
                  <div class="text-size-tiny">MIN</div>
                </div>
              </div>
              <div class="form_workout-stats-wrapper"><img src="https://www.svgrepo.com/show/233266/bolt-thunder.svg" loading="lazy" alt="" class="workout-stats-icon-copy">
                <div class="form_workout-pace-label">${workout.pace}</div>
                <div class="margin-left margin-xxsmall">
                  <div class="text-size-tiny">KM/MIN</div>
                </div>
              </div>
              <div class="form_workout-stats-wrapper"><img src="https://www.svgrepo.com/show/15601/sun.svg" loading="lazy" alt="" class="workout-stats-icon-copy">
                <div class="form_workout-temp-label">${workout.temperature}</div>
                <div class="margin-left margin-xxsmall">
                  <div class="text-size-tiny">°C</div>
                </div>
              </div>
            </div>
            <div class="form_workout-edit-wrapper">
              <div class="form_workout-edit-action"><img src="https://www.svgrepo.com/show/32615/edit.svg" loading="lazy" alt="" class="form_workout-edit-img"></div>
              <div class="form_workout-edit-action"><img src="https://www.svgrepo.com/show/244044/delete.svg" loading="lazy" alt="" class="form_workout-edit-img"></div>
            </div>
          </div>
        </div>
        `
        document.querySelector('.app_form-wrapper').insertAdjacentHTML('beforeend', html)
        console.log(this._workouts)

        divInput.classList.add('is--hidden')


    }

    _addNewWorkout() {
        // Removal process
        inputDuration.value = ''
        this._markerStart.remove()
        this._markerEnd.remove()
        this._markerEnd = null
        this._map.removeLayer('route')
        this._map.removeSource('route')
        this._route = []
        divInput.classList.remove('is--hidden')

        inputDuration.focus()
        this._setMarkerStart(this._userLng, this._userLat)
        console.log('========debugg=========')
        console.log(this._workouts)

    }
}



const app = new App()

const running = new Workout(44, 22)

console.log(running)

