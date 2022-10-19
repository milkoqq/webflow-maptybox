"use strict";
// DOM Elements
const selectPos = document.querySelector('#app_form-position-select')
const selectType = document.querySelector('#app_form-type-select')
const selectSort = document.querySelector('#app_form-sortby-select')

const inputPosEnding = document.querySelector('#app_form-input-ending')
const inputDuration = document.querySelector('#app_form-input-duration')
const inputDistance = document.querySelector('#app_form-input-distance-label')
const inputPosStarting = document.querySelector('[js-input="startingPos"]')

const labelDistance = document.querySelector('.form_workout-distance-label')
const labelDuration = document.querySelector('.form_workout-duration-label')
const labelPace = document.querySelector('.form_workout-pace-label')
const labelTemp = document.querySelector('.form_workout-temp-label')
const labelDurationError = document.querySelector('.app_input-label-danger')

const divOptions = document.querySelector('.app_options-component')
const divInput = document.querySelector('.app_left-form-input')
const divWorkout = document.querySelector('[js-element="workout"]') // first query of an attribute!
const divBegin = document.querySelector('.app_form-begin')
const divWrapper = document.querySelector('.app_form-wrapper')
const divWorkoutList = document.querySelector('.app_left-workout-container')

const btnConfirm = document.querySelector('#button-save')
const btnCancel = document.querySelector('#button-cancel')
const btnDel = document.querySelector('#button-delete')
const btnEdit = document.querySelector('#button-edit')
const btnDeleteAll = document.querySelector('[js-element="deleteAll"]')
const btnSaveEdit = document.querySelector('[js-button="saveEdit"]')

const btnNew = document.querySelector('.app_options-locate-wrapper')

// Workout Class
// Maybe I should have split into subclasses Running/Cycling. But no real differences besides the 'type' to call super().
class Workout {
    _id = this._randomNumber(1, 1000)
    _date = new Date()
    _weatherToken = 'c0c4cb552464fc0334187736473c053a'
    constructor(type, distance, duration, temperature, locationRoad, locationCity, route, geojson) {
        this.type = type
        this.distance = distance
        this.duration = duration
        this.temperature = temperature
        this.locationRoad = locationRoad
        this.locationCity = locationCity
        this.route = route
        this._getPace()
        // this._setGeoJson()
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
    _accessToken = 'pk.eyJ1IjoibWlsa29xcSIsImEiOiJjbDliczUwejEwcnd6M3ZtejNpY3BuMTV3In0.88orHaz8EYjsOvloMJQd7Q'
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
    _html;
    //State management
    _isAdding = false; //state while adding a new workout. This should be used to ignore all other stuff while adding.
    _isShowing = false; //state when showing a route on map
    _isEditing = false; //state when editing
    _workoutToEdit;
    _displayedWorkout;

    constructor() {
        this._init()

        divWrapper.addEventListener('click', this._handleWorkout.bind(this))
        divWorkout.addEventListener('click', this._showWorkoutOnMap)

        btnNew.addEventListener('click', this._addNewWorkout.bind(this))
        btnConfirm.addEventListener('click', this._newWorkout.bind(this))
        btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this))
        btnSaveEdit.addEventListener('click', this._saveEditWorkout.bind(this))
        btnCancel.addEventListener('click', this._cancelNewWorkout.bind(this))


        // selectSort.addEventListener('change', this._sortWorkouts.bind(this, selectSort.value))
    }



    async _init() {
        try {

            console.log('Initialization ')
            btnSaveEdit.style.display = 'none' // hide edit/save button
            inputPosStarting.style.display = 'none' //hide starting input
            const pos = await this._getPosition().catch(err => console.log(err))
            const { longitude: lng, latitude: lat } = pos.coords
            this._userLng = lng;
            this._userLat = lat;
            // console.log(lng, lat)
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
        this._markerRoutes.push(this._markerStartCoords) // maybe not needed?
        // Print the marker's longitude and latitude values in the console
        // console.log(this._markerStartCoords)
        // console.log(this._markerRoutes) ///// ERRRORORSRS
    }

    async _setMarkerEnd(e) {


        // Set Marker End if it doesn't exist.
        if (!this._markerEnd) {
            // Get Lng/Lat positions from click on map
            let { lng, lat } = e.lngLat

            // Assigning to global property markerEndCoords.
            this._markerEndCoords = [lng, lat]

            this._markerEnd = new mapboxgl.Marker({
                color: "#FFFFFF",
                draggable: true
            }).setLngLat([lng, lat])
                .addTo(this._map)

            inputPosEnding.value = `${lng.toFixed(4)}, ${lat.toFixed(4)}`
            this._markers.push(this._markerEnd)
            this._markerRoutes.push([lng, lat])
            // console.log(this._markerRoutes)
            await this._fetchRoute(this._markerStartCoords, this._markerEndCoords)
            // console.log(this._map.getLayer('route')) ////// UNDEFINED?
            // console.log(this._route) /////// EXISTS
            this._markerEnd.setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML(`<h4 style="color: black">Run in Komotini ${this._distance}km</h4>`)) // add popup
            this._markerEnd.togglePopup()
            divBegin.classList.add('is--hidden')
            divInput.classList.remove('is--hidden')
            this._isAdding = true
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

        if (!(inputDuration.value && inputDuration.value > 0)) {
            labelDurationError.style.opacity = 1
            labelDurationError.textContent = `Required`
            return
        }

        if (!this._markerEnd) {
            console.log("Set an ending-route marker on map!")
            return
        }

        // Get data from form.
        // already global: _distance, _temperature
        const type = selectType.value
        const duration = +inputDuration.value
        let workout;


        if (type === 'running') {
            workout = new Workout(type, +this._distance, duration, this._temperature, this._locationStreet, this._locationCity, this._route)
        }

        if (type === 'cycling') {
            workout = new Workout(type, +this._distance, duration, this._temperature, this._locationStreet, this._locationCity, this._route)
        }
        this._workouts.push(workout)
        this._renderWorkout(workout)
        if (this._workouts.length > 0) {
            divOptions.classList.remove('is--hidden')
        }
        this._markerEnd.setDraggable(false)
        this._markerStart.setDraggable(false)
        this._removeMapElements()
        this._setMarkerStart(this._userLng, this._userLat)
        this._isAdding = false //state while adding a new workout
        selectPos.value = 'currentPos'
        console.log('Workout added successfully.')
    }

    _renderWorkout(workout) {
        this._html = `
        <div class="app_left-form-workout">
        <div class="app_left-form-workout-side is--${workout.type}"></div>
        <div class="app_left-form-workout-main" data-id="${workout._id}">
          <div class="form_workout-main-top" >
            <div class="text-size-small">${String(workout._date.getDate())} ${this._months[workout._date.getMonth()]} ${workout._date.getFullYear()}</div>
          </div>
          <div class="form_workout-main-mid">
            <div class="text-block-5">Running in <span class="text-span">${workout.locationRoad}, ${workout.locationCity}.</span></div>
          </div>
          <div class="form_workout-main-bottom">
            <div class="div-block-7">
              <div class="form_workout-stats-wrapper"><img src="https://www.svgrepo.com/show/406153/man-biking-medium-dark-skin-tone.svg" loading="lazy" id="app_cycling-icon" alt="" class="workout-stats-icon is--hidden">
              <img src="${workout.type === 'running' ? 'https://www.svgrepo.com/show/400693/running.svg' : 'https://uploads-ssl.webflow.com/62fbb644e10f136346d86d9e/630370d60fed0a1883f92513_%F0%9F%9A%B4_%E2%99%80%EF%B8%8F.svg'}" loading="lazy" id="app_running - icon" alt="" class="workout-stats-icon">
            <div class="form_workout-distance-label"> ${workout.distance}</div>
                <div class="margin-left margin-xxsmall">
                    <div class="text-size-tiny">KM</div>
                </div>
              </div >
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
            </div >
            <div class="form_workout-edit-wrapper">
                <div class="form_workout-edit-action"><img src="https://uploads-ssl.webflow.com/62fbb644e10f136346d86d9e/630351b40fed0ac1b5f7acf8_Vector.svg" loading="lazy" alt="" id="button-edit" class="form_workout-edit-img"></div>
                <div class="form_workout-edit-action"><img src="https://uploads-ssl.webflow.com/62fbb644e10f136346d86d9e/630351b3ee19b62ebdbb93dc_Vector-1.svg" loading="lazy" alt="" id="button-delete" class="form_workout-edit-img"></div>
                <a js-element="viewWorkout" id="button-view" href="#">View</a>
            </div>
          </div >
        </div >
            `
        divWorkoutList.insertAdjacentHTML('beforeend', this._html)

        divInput.classList.add('is--hidden')


    }
    _removeMapElements() {
        if (this._markerStart) this._markerStart.remove()
        if (this._markerEnd) this._markerEnd.remove()
        this._markerEnd = null
        if (this._map.getLayer('route')) {
            this._map.removeLayer('route')
            this._map.removeSource('route')
            this._route = []
        }
        inputDuration.value = ''
    }

    _addNewWorkout() {

        selectPos.value = 'currentPos'

        this._removeMapElements()
        this._setMarkerStart(this._userLng, this._userLat)

        // divInput.classList.remove('is--hidden')
        labelDurationError.style.opacity = 0
        inputDuration.focus()
        btnConfirm.style.display = 'inline-block'
        selectPos.style.display = 'inline-block'
        inputPosStarting.style.display = 'none'
        btnSaveEdit.style.display = 'none'

        console.log(this._workouts)

    }

    // _sortWorkouts(attr) {
    //     divWorkoutList.innerHTML = ''
    //     if (attr === 'distance-asc') { this._workouts.sort((a, b) => a['distance'] - b['distance']) }
    //     if (attr === 'distance-dsc') { this._workouts.sort((a, b) => b['distance'] - a['distance']) }

    //     divWorkoutList.innerHTML = ''
    //     // console.log(`I want to sort this ${array}`)
    //     this._workouts.forEach(workout => this._renderWorkout(workout))
    //     // console.log(attr)
    // }

    _showRouteOnMap(route) {
        this._isShowing = true;

        this._removeMapElements() // will probably need to clear the new markers also
        this._setMarkerStart(route[0][0], route[0][1]) //change to new markers please for display only
        this._markerEndCoords = [route.at(-1)[0], route.at(-1)[1]]
        this._markerEnd = new mapboxgl.Marker({
            color: "#000",
            draggable: false
        }).setLngLat(this._markerEndCoords)
            .addTo(this._map)

        const geojson = {
            type: 'Feature',
            properties: {
                // id: this.
            },
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
                    // #00C46A running
                    // cycling
                    'line-width': 5,
                    'line-opacity': 0.75
                }
            });
        }

    }

    _handleWorkout(e) {
        //target delete button of workout
        let parentWorkout = e.target.closest('.app_left-form-workout-main')
        if (!parentWorkout) return
        console.log(parentWorkout.dataset.id)

        //Delete Function
        if (e.target.id === 'button-delete') {
            //element to delete
            this._workouts = this._workouts.filter(workout => workout._id !== Number(parentWorkout.dataset.id))
            console.log(`Workout #${parentWorkout.dataset.id} deleted.`)
            divWorkoutList.innerHTML = ''

            console.log(parentWorkout.dataset.id, typeof +parentWorkout.dataset.id)
            console.log(this._displayedWorkout._id, typeof this._displayedWorkout._id)
            if (+parentWorkout.dataset.id === this._displayedWorkout._id) {
                this._removeMapElements()
            }

            this._workouts.forEach(workout => this._renderWorkout(workout))

            //if there are no workouts - remove UI elements
            if (this._workouts.length === 0) {
                this._removeMapElements()
                console.log('There are no more workouts! Start fresh.')
                this._setMarkerStart(this._userLng, this._userLat)
            }

        }

        //Editing State - Button
        if (e.target.id === 'button-edit') {
            console.log('edit mode')
            this._isEditing = true;
            this._workoutToEdit = this._workouts.find(workout => workout._id === +parentWorkout.dataset.id)
            console.log(this._workoutToEdit)
            this._showRouteOnMap(this._workoutToEdit.route)

            divInput.classList.remove('is--hidden')
            btnConfirm.style.display = 'none'
            selectPos.style.display = 'none'
            inputPosStarting.style.display = 'inline-block'
            btnSaveEdit.style.display = 'inline-block'
            labelDurationError.style.opacity = 0

            inputDuration.value = this._workoutToEdit.duration
            inputDistance.textContent = `Distance: ${this._workoutToEdit.distance} KM`
            selectType.value = this._workoutToEdit.type

            inputPosStarting.disabled = true;
            inputPosEnding.disabled = true;
            inputPosStarting.value = this._workoutToEdit.route.at(0).toString().split(',').join(', ')
            inputPosEnding.value = this._workoutToEdit.route.at(-1).toString().split(',').join(', ')


        }

        //View Function
        if (e.target.id === 'button-view') {
            if (this._isAdding) return;
            this._displayedWorkout = this._workouts.find(workout => workout._id === +parentWorkout.dataset.id)
            this._route = this._displayedWorkout.route
            // console.log(this._route)
            console.log(this._displayedWorkout)
            // console.log(Boolean(this._map.getLayer('route')))
            this._showRouteOnMap(this._route)
        }


    }
    _deleteAllWorkouts() {
        if (this._isEditing) {
            console.log('Currently editing workout. Unable to delete all workouts.')
            return
        }

        console.log(this._workouts)
        if (this._workouts.length === 0) {
            console.log('No workouts to delete.')
            return
        }
        this._workouts = []
        divWorkoutList.innerHTML = ''
        this._workouts.forEach(workout => this._renderWorkout(workout))
        this._removeMapElements()
        this._setMarkerStart(this._userLng, this._userLat)
        console.log('All workouts deleted. Click on map to start and add again!')
        // this._setMarkerStart(this._userLat, this._userLng)
    }

    _saveEditWorkout(e) {
        e.preventDefault()
        if (!(inputDuration.value && inputDuration.value > 0)) {
            labelDurationError.style.opacity = 1
            labelDurationError.textContent = `Required`
            return
        }
        this._workoutToEdit.duration = +inputDuration.value
        this._workoutToEdit.type = selectType.value
        divWorkoutList.innerHTML = ''
        this._workouts.forEach(workout => this._renderWorkout(workout))
        // divInput.style.opacity = 0;
        divInput.classList.add('is--hidden')
        this._removeMapElements()
        // this._setMarkerStart(this._userLng, this._userLat)
        this._showRouteOnMap(this._workoutToEdit.route)
        console.log('Changes saved successfully')
        this._isEditing = false;

    }


    _cancelNewWorkout() {
        divInput.classList.add('is--hidden')
        this._removeMapElements()
        this._setMarkerStart(this._userLng, this._userLat)
        console.log('Process Cancelled')
    }

}



const app = new App()

//Keep pushing

