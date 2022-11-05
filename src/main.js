"use strict";
import Toastify from 'toastify-js'
import "toastify-js/src/toastify.css"

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
    #accessToken = 'pk.eyJ1IjoibWlsa29xcSIsImEiOiJjbDliczUwejEwcnd6M3ZtejNpY3BuMTV3In0.88orHaz8EYjsOvloMJQd7Q'
    #distance;
    #fetchtype = 'walking'
    #map;
    #mapZoomLevel = 13
    #markers = []
    #markerStart;
    #markerStartCoords;
    #markerEnd;
    #markerEndCoords;
    #markerRoutes = []
    #userLng;
    #userLat;
    #temperature;
    #locationCity;
    #locationStreet;
    #workouts = [];
    #type;
    #route;
    #html;
    //State management
    _isAdding = false; //state while adding a new workout. This should be used to ignore all other stuff while adding.
    _isShowing = false; //state when showing a route on map
    _isEditing = false; //state when editing
    _workoutToEdit;
    _displayedWorkout;
    _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


    constructor() {
        this._init()

        divWrapper.addEventListener('click', this._handleWorkout.bind(this))
        divWorkout.addEventListener('click', this._showWorkoutOnMap)

        btnNew.addEventListener('click', this._addNewWorkout.bind(this))
        btnConfirm.addEventListener('click', this._newWorkout.bind(this))
        btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this))
        btnSaveEdit.addEventListener('click', this._saveEditWorkout.bind(this))
        btnCancel.addEventListener('click', this._cancelNewWorkout.bind(this))

        // this._loadLocalStorage()

        selectSort.addEventListener('change', this._sortWorkouts.bind(this))
    }



    async _init() {
        try {

            console.log('Initialization ')
            btnSaveEdit.style.display = 'none' // hide edit/save button
            inputPosStarting.style.display = 'none' //hide starting input
            const pos = await this._getPosition().catch(err => console.log(err))
            const { longitude: lng, latitude: lat } = pos.coords
            this.#userLng = lng;
            this.#userLat = lat;
            await this._loadMap(lng, lat)
            this._setMarkerStart(lng, lat)
            this.#map.on('click', this._setMarkerEnd.bind(this))
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
            this.#map = new mapboxgl.Map({
                accessToken: this.#accessToken,
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [lng, lat], // starting position
                zoom: this.#mapZoomLevel
                // center: [80, 36], // starting position
                // zoom: 1,
                // projection: 'globe'

            });

        }
        catch {
            throw new Error('Could not Initialize Map')
        }

    }

    _setMarkerStart(lng, lat) {

        this.#markerStart = new mapboxgl.Marker()
            .setLngLat([lng, lat])
            // .setPopup(new mapboxgl.Popup({ offset: 25 }).setText('Current Position'))
            .addTo(this.#map);
        this.#markerStartCoords = Object.values(this.#markerStart.getLngLat());
        this.#markers.push(this.#markerStart)
        this.#markerRoutes.push(this.#markerStartCoords) // maybe not needed?
    }

    async _setMarkerEnd(e) {


        // Set Marker End if it doesn't exist.
        if (!this.#markerEnd) {
            // Get Lng/Lat positions from click on map
            let { lng, lat } = e.lngLat

            // Assigning to global property markerEndCoords.
            this.#markerEndCoords = [lng, lat]

            this.#markerEnd = new mapboxgl.Marker({
                color: "#FFFFFF",
                draggable: true
            }).setLngLat([lng, lat])
                .addTo(this.#map)

            inputPosEnding.value = `${lng.toFixed(4)}, ${lat.toFixed(4)}`
            this.#markers.push(this.#markerEnd)
            this.#markerRoutes.push([lng, lat])
            // console.log(this.#markerRoutes)
            await this._fetchRoute(this.#markerStartCoords, this.#markerEndCoords)
            // console.log(this.#map.getLayer('route')) ////// UNDEFINED?
            // console.log(this.#route) /////// EXISTS
            this.#markerEnd.setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML(`<h5 style="color: black">Run in ${this.#locationStreet}, ${this.#locationCity}. <br> Distance: ${this.#distance}km</h5>`)) // add popup
            this.#markerEnd.togglePopup()
            divBegin.classList.add('is--hidden')
            divInput.classList.remove('is--hidden')
            this._isAdding = true
            inputDuration.focus()


        }

        async function onDragEnd() {
            // Function fires when dragging of 2nd marker stops.
            // Get new Lng/Lat from Marker
            this.#markerEndCoords = Object.values(this.#markerEnd.getLngLat());
            inputPosEnding.value = `${this.#markerEndCoords[0].toFixed(4)}, ${this.#markerEndCoords[1].toFixed(4)}`;
            await this._fetchRoute(this.#markerStartCoords, this.#markerEndCoords)

        }
        this.#markerEnd.on('dragend', onDragEnd.bind(this))


    }

    _setMarkerStartToDrag() {
        if (selectPos.value === 'dragToPos') {
            this.#markerStart.setDraggable(true)
            // console.log(this.#markerStart.isDraggable())
            this.#markerStart.on('dragend', this._updateMarkerStartCoords.bind(this))


        }

        if (selectPos.value === 'currentPos') {
            this.#markerStart.remove()
            this._setMarkerStart(this.#userLng, this.#userLat)
            this.#markerStartCoords = Object.values(this.#markerStart.getLngLat())
            this._fetchRoute(this.#markerStartCoords, this.#markerEndCoords)
        }
    }

    _updateMarkerStartCoords() {
        this.#markerStartCoords = Object.values(this.#markerStart.getLngLat())
        this._fetchRoute(this.#markerStartCoords, this.#markerEndCoords)

    }

    _getJSON(url, errorMsg = 'Something went wrong') {
        return fetch(url).then(response => {
            if (!response.ok) throw new Error(`${errorMsg} (${response.status})`);

            return response.json();
        });
    };

    async _fetchRoute(start, end) {

        // let [jsonDir, jsonTemp] = await Promise.allSettled([
        //     this._getJSON(`https://api.mapbox.com/directions/v5/mapbox/${this.#fetchtype}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${this.#accessToken}`),
        //     this._getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${start[1]}&longitude=${start[0]}&hourly=temperature_2m&current_weather=true`)
        // ])
        // why the fuck it doesn't work atm idk.

        const queryDir = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/${this.#fetchtype}/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${this.#accessToken}`
        );
        const queryTemp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${start[1]}&longitude=${start[0]}&hourly=temperature_2m&current_weather=true`)
        const queryLoc = await fetch(`https://api.geoapify.com/v1/geocode/reverse?lat=${end[1]}&lon=${end[0]}&apiKey=ae4d111379a849988e6112880aba2273`)
        const jsonTemp = await queryTemp.json()
        const jsonDir = await queryDir.json();
        const locTemp = await queryLoc.json()
        this.#locationStreet = locTemp.features[0].properties.street ?? locTemp.features[0].properties.address_line1 ?? locTemp.features[0].properties.address_line2
        this.#locationCity = locTemp.features[0].properties.city ?? locTemp.features[0].properties.country
        // console.log(jsonDir)
        // console.log(queryTemp, jsonTemp)
        // console.log(queryLoc, locTemp)
        const data = jsonDir.routes[0];
        this.#distance = (data.distance / 1000).toFixed(2)
        this.#temperature = jsonTemp.current_weather.temperature
        // console.log(this.#temperature)con
        inputDistance.textContent = `Distance: ${this.#distance}km`
        this.#route = data.geometry.coordinates;
        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: this.#route
            }
        };
        // if the route already exists on the map, we'll reset it using setData
        if (this.#map.getSource('route')) {
            this.#map.getSource('route').setData(geojson);
        }
        // otherwise, we'll make a new request
        else {
            this.#map.addLayer({
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
        this.#markerEnd.setPopup(new mapboxgl.Popup({ closeOnClick: false }).setHTML(`<h5 style="color: black">Run in ${this.#locationStreet}, ${this.#locationCity}. <br> Distance: ${this.#distance}km</h5>`)) // add popup
        this.#markerEnd.togglePopup()

    }

    _newWorkout(e) {
        e.preventDefault()

        if (!(inputDuration.value && inputDuration.value > 0)) {
            labelDurationError.style.opacity = 1
            labelDurationError.textContent = `Required`
            return
        }

        if (!this.#markerEnd) {
            console.log("Set an ending-route marker on map!")
            return
        }

        // Get data from form.
        // already global: #distance, #temperature
        const type = selectType.value
        const duration = +inputDuration.value
        let workout;


        if (type === 'running') {
            workout = new Workout(type, +this.#distance, duration, this.#temperature, this.#locationStreet, this.#locationCity, this.#route)
        }

        if (type === 'cycling') {
            workout = new Workout(type, +this.#distance, duration, this.#temperature, this.#locationStreet, this.#locationCity, this.#route)
        }
        this.#workouts.push(workout)
        this._renderWorkout(workout)
        if (this.#workouts.length > 0) {
            divOptions.classList.remove('is--hidden')
        }
        this.#markerEnd.setDraggable(false)
        this.#markerStart.setDraggable(false)
        this._removeMapElements()
        this._setMarkerStart(this.#userLng, this.#userLat)
        labelDurationError.style.opacity = 0
        //save to local storage
        // localStorage.setItem('workouts', JSON.stringify(this.#workouts))
        this._isAdding = false //state while adding a new workout
        selectPos.value = 'currentPos'
        // console.log('Workout added successfully.')
        Toastify({
            text: "Workout added successfully.",
            duration: 1000,
            style: {
                background: `rgba(19, 189, 0, 1)`,
                color: 'white'
            },
        }).showToast();

    }

    _renderWorkout(workout) {
        workout._date = new Date(workout._date)
        this.#html = `
        <div class="app_left-form-workout">
        <div class="app_left-form-workout-side is--${workout.type}"></div>
        <div class="app_left-form-workout-main" data-id="${workout._id}">
          <div class="form_workout-main-top">
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
        divWorkoutList.insertAdjacentHTML('beforeend', this.#html)

        divInput.classList.add('is--hidden')


    }
    _removeMapElements() {
        if (this.#markerStart) this.#markerStart.remove()
        if (this.#markerEnd) this.#markerEnd.remove()
        this.#markerEnd = null
        if (this.#map.getLayer('route')) {
            this.#map.removeLayer('route')
            this.#map.removeSource('route')
            this.#route = []
        }
        inputDuration.value = ''
    }

    _addNewWorkout() {

        selectPos.value = 'currentPos'

        this._removeMapElements()
        this._setMarkerStart(this.#userLng, this.#userLat)

        this.#map.flyTo({
            center: [this.#userLng, this.#userLat],
            essential: true, // this animation is considered essential with respect to prefers-reduced-motion
            zoom: 14
        });
        // divInput.classList.remove('is--hidden')
        labelDurationError.style.opacity = 0
        inputDuration.focus()
        btnConfirm.style.display = 'inline-block'
        selectPos.style.display = 'inline-block'
        inputPosStarting.style.display = 'none'
        btnSaveEdit.style.display = 'none'

    }



    _sortWorkouts(e) {
        if (this.#workouts.length <= 1) {
            console.log(selectSort.value)
            console.log('No workouts to sort. Please add a workout')
            Toastify({
                text: `No workouts to sort. \n\ Please add more than 1 workouts.`,
                duration: 2000,
                style: {
                    background: `rgba(255, 102, 25, 1)`,
                    color: 'white'
                },
            }).showToast();
            selectSort.value = 'default'
            return
        }
        divWorkoutList.innerHTML = ''
        switch (selectSort.value) {
            case 'distance-asc':
                Toastify({
                    text: `Workouts sorted based on Distance Ascending`,
                    duration: 2000,
                    style: {
                        background: `rgba(189, 126, 0, 1)`,
                        color: 'white'
                    },
                }).showToast();
                this.#workouts.sort((a, b) => a['distance'] - b['distance'])
                break;
            case 'distance-dsc':
                Toastify({
                    text: `Workouts sorted based on Distance descending`,
                    duration: 2000,
                    style: {
                        background: `rgba(189, 126, 0, 1)`,
                        color: 'white'
                    },
                }).showToast();
                this.#workouts.sort((a, b) => b['distance'] - a['distance']);
                break;
            case 'duration-asc':
                Toastify({
                    text: `Workouts sorted based on Duration ascending`,
                    duration: 2000,
                    style: {
                        background: `rgba(189, 126, 0, 1)`,
                        color: 'white'
                    },
                }).showToast();
                this.#workouts.sort((a, b) => a['duration'] - b['duration'])
                break;
            case 'duration-dsc':
                Toastify({
                    text: `Workouts sorted based on Duration descending`,
                    duration: 2000,
                    style: {
                        background: `rgba(189, 126, 0, 1)`,
                        color: 'white'
                    },
                }).showToast();
                this.#workouts.sort((a, b) => b['duration'] - a['duration'])
                break;
            case 'pace-asc':
                Toastify({
                    text: `Workouts sorted based on Pace ascending`,
                    duration: 1000,
                    style: {
                        background: `rgba(189, 126, 0, 1)`,
                        color: 'white'
                    },
                }).showToast();
                this.#workouts.sort((a, b) => b['duration'] - a['duration'])
                break;
            case 'pace-dsc':
                Toastify({
                    text: `Workouts sorted based on Pace descending`,
                    duration: 1000,
                    style: {
                        background: `rgba(189, 126, 0, 1)`,
                        color: 'white'
                    },
                }).showToast();
                this.#workouts.sort((a, b) => b['duration'] - a['duration'])
                break;



        }

        this.#workouts.forEach(workout => this._renderWorkout(workout))
    }

    _showRouteOnMap(route) {
        this._isShowing = true;

        this._removeMapElements() // will probably need to clear the new markers also
        this._setMarkerStart(route[0][0], route[0][1]) //change to new markers please for display only
        this.#markerEndCoords = [route.at(-1)[0], route.at(-1)[1]]
        this.#markerEnd = new mapboxgl.Marker({
            color: "#000",
            draggable: false
        }).setLngLat(this.#markerEndCoords)
            .addTo(this.#map)

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
        if (this.#map.getSource('route')) {
            this.#map.getSource('route').setData(geojson);
        }
        // otherwise, we'll make a new request
        else {
            this.#map.addLayer({
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

        //Delete Function
        if (e.target.id === 'button-delete') {
            //element to delete
            if (this._isEditing) return
            this.#workouts = this.#workouts.filter(workout => workout._id !== Number(parentWorkout.dataset.id))

            //todo: Alert message
            console.log(`Workout #${parentWorkout.dataset.id} deleted.`)
            Toastify({
                text: `Workout deleted.`,
                duration: 1000,
                style: {
                    background: `rgba(255, 102, 25, 1)`,
                    color: 'white'
                },
            }).showToast();

            divWorkoutList.innerHTML = ''

            if (this._isShowing) {
                if (+parentWorkout.dataset.id === this._displayedWorkout._id) {
                    this._removeMapElements()

                }
            }


            this.#workouts.forEach(workout => this._renderWorkout(workout))

            //if there are no workouts - remove UI elements
            if (this.#workouts.length === 0) {
                this._removeMapElements()
                //todo: Alert message
                console.log('There are no more workouts! Start fresh.')

                this._setMarkerStart(this.#userLng, this.#userLat)
            }

        }
        //Editing State - Button
        if (e.target.id === 'button-edit') {
            // console.log('edit mode')
            this._isEditing = true;
            this._workoutToEdit = this.#workouts.find(workout => workout._id === +parentWorkout.dataset.id)
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
            this._displayedWorkout = this.#workouts.find(workout => workout._id === +parentWorkout.dataset.id)
            this.#route = this._displayedWorkout.route
            // console.log(this.#route)
            console.log(this._displayedWorkout)
            // console.log(Boolean(this.#map.getLayer('route')))
            this._showRouteOnMap(this.#route)

            let bbox = [this._displayedWorkout.route[0], this._displayedWorkout.route.at(-1)]
            this.#map.fitBounds(bbox, {
                padding: { top: 10, bottom: 25, left: 150, right: 150 }
            });

        }


    }
    _deleteAllWorkouts() {
        if (this._isEditing) {
            //todo: alert message
            console.log('Currently editing workout. Unable to delete all workouts.')
            Toastify({
                text: `Currently editing workout. Unable to delete all workouts.`,
                duration: 2000,
                style: {
                    background: `rgba(189, 126, 0, 1)`,
                    color: 'white'
                },
            }).showToast();
            return
        }

        console.log(this.#workouts)
        if (this.#workouts.length === 0) {
            //todo: alert message
            console.log('No workouts to delete.')
            Toastify({
                text: `No workouts to delete.`,
                duration: 1000,
                style: {
                    background: `rgba(189, 126, 0, 1)`,
                    color: 'white'
                },
            }).showToast();
            return
        }
        this.#workouts = []
        divWorkoutList.innerHTML = ''
        this.#workouts.forEach(workout => this._renderWorkout(workout))
        this._removeMapElements()
        this._setMarkerStart(this.#userLng, this.#userLat)
        //todo: alert message
        console.log('All workouts deleted. Click on map to start and add again!')
        Toastify({
            text: `All workouts deleted.`,
            duration: 2000,
            style: {
                background: `rgba(255, 102, 25, 1)`,
                color: 'white'
            },
        }).showToast();
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
        this.#workouts.forEach(workout => this._renderWorkout(workout))
        // divInput.style.opacity = 0;
        divInput.classList.add('is--hidden')
        this._removeMapElements()
        this._showRouteOnMap(this._workoutToEdit.route)
        //todo: alert message
        console.log('Changes saved successfully')
        Toastify({
            text: "Workout saved successfully.",
            duration: 1000,
            style: {
                background: `rgba(19, 189, 0, 1)`,
                color: 'white'
            },
        }).showToast();
        this._isEditing = false;

    }


    _cancelNewWorkout() {
        divInput.classList.add('is--hidden')
        this._removeMapElements()
        this._setMarkerStart(this.#userLng, this.#userLat)
        //todo: alert message
        console.log('Process Cancelled')
        Toastify({
            text: `Process Cancelled`,
            duration: 1000,
            style: {
                background: `rgba(189, 126, 0, 1)`,
                color: 'white'
            },
        }).showToast();
        this._isEditing = false
        labelDurationError.style.opacity = 0
    }

    // _loadLocalStorage() {

    //     const data = JSON.parse(localStorage.getItem('workouts'))

    //     if (!data) return

    //     data.forEach(workout => {
    //         workout = new Workout(workout.type, workout.distance, workout.duration, workout.temperature, workout.locationRoad, workout.locationCity, workout.route, workout.geojson)

    //     })

    //     this.#workouts = data
    //     this.#workouts.forEach(workout => {

    //         this._renderWorkout(workout)
    //     })
    //     console.log(this.#workouts)
    // }

}



const app = new App()


