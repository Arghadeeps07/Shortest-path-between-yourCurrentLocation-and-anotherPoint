const socket = io();

let userLocation = null;
let map, routingControl;
const markers = {};

// Initialize the map
map = L.map("map").setView([0, 0], 10);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "OpenStreetMap"
}).addTo(map);

// Watch user's real-time location (Point A)
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            userLocation = { lat: latitude, lng: longitude };

            // Emit location to the server
            socket.emit("send-location", userLocation);
        },
        (err) => {
            console.error(err);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
        }
    );
}

// Handle real-time location updates from the server
socket.on("recieved-location", (data) => {
    const { id, latitude, longitude } = data;
    if (markers[id]) {
        markers[id].setLatLng([latitude, longitude]);
    } else {
        markers[id] = L.marker([latitude, longitude]).addTo(map);
    }

    // Center the map around the current user location
    if (id === socket.id) {
        map.setView([latitude, longitude], 16);
    }
});

// Handle destination (Point B) selection from input
document.getElementById("findRoute").addEventListener("click", () => {
    const pointB = document.getElementById("pointB").value;
    if (pointB && userLocation) {
        // Use Geocoding API to get Point B coordinates
        fetch(`https://nominatim.openstreetmap.org/search?q=${pointB}&format=json`)
            .then((response) => response.json())
            .then((data) => {
                if (data && data.length > 0) {
                    const pointBCoordinates = {
                        lat: data[0].lat,
                        lng: data[0].lon
                    };

                    // Emit Point B selection to the server
                    socket.emit("point-b-selected", pointBCoordinates);

                    // Show the route on the map
                    showRoute(userLocation, pointBCoordinates);
                }
            });
    }
});

// Handle the routing
function showRoute(pointA, pointB) {
    if (routingControl) {
        routingControl.remove();
    }

    routingControl = L.Routing.control({
        waypoints: [L.latLng(pointA.lat, pointA.lng), L.latLng(pointB.lat, pointB.lng)],
        routeWhileDragging: true
    }).addTo(map);
}
