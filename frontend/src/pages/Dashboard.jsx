import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import axios from 'axios';
import { io } from 'socket.io-client';
import 'maplibre-gl/dist/maplibre-gl.css';
import './Dashboard.css';

const Dashboard = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const socket = useRef(null);
  const carMarker = useRef(null);
  const animationRef = useRef(null);
  
  const [lng, setLng] = useState(77.2090);
  const [lat, setLat] = useState(28.6139);
  const [zoom, setZoom] = useState(11);
  
  const [searchParams] = useSearchParams();
  const initialPickup = searchParams.get('pickup') || '';
  const initialDropoff = searchParams.get('dropoff') || '';

  // Location State
  const [pickupQuery, setPickupQuery] = useState(initialPickup);
  const [dropoffQuery, setDropoffQuery] = useState(initialDropoff);
  const [pickupResults, setPickupResults] = useState([]);
  const [dropoffResults, setDropoffResults] = useState([]);
  const [pickupCoords, setPickupCoords] = useState(null);
  const [dropoffCoords, setDropoffCoords] = useState(null);
  const [rideStatus, setRideStatus] = useState('IDLE'); // IDLE, SEARCHING, BOOKED, IN_PROGRESS

  useEffect(() => {
    // Initialize Socket
    socket.current = io("http://localhost:5000");

    socket.current.on("cab_booked", async (data) => {
      setRideStatus('BOOKED');
      console.log("Cab booked!", data);
      
      if (pickupCoords && dropoffCoords) {
        await fetchAndDrawRoute(pickupCoords, dropoffCoords);
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, [pickupCoords, dropoffCoords]);

  // Initial geocoding if query params exist
  useEffect(() => {
    if (initialPickup) {
      searchLocation(initialPickup, setPickupResults);
    }
    if (initialDropoff) {
      searchLocation(initialDropoff, setDropoffResults);
    }
  }, []);

  useEffect(() => {
    if (map.current) return;
    
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [lng, lat],
      zoom: zoom,
      attributionControl: false
    });

    map.current.addControl(new maplibregl.NavigationControl(), 'bottom-right');
  }, [lng, lat, zoom]);

  useEffect(() => {
    if (map.current) {
      setTimeout(() => { map.current.resize(); }, 100);
    }
  }, []);

  const searchLocation = async (query, setResults) => {
    if (!query || query.length < 3) {
      setResults([]);
      return;
    }
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&countrycodes=in&limit=5`);
      setResults(res.data);
    } catch (err) {
      console.error("Geocoding error", err);
    }
  };

  const handleSelectLocation = (place, type) => {
    const coords = [parseFloat(place.lon), parseFloat(place.lat)];
    
    if (type === 'pickup') {
      setPickupQuery(place.display_name);
      setPickupCoords(coords);
      setPickupResults([]);
      map.current.flyTo({ center: coords, zoom: 15 });
      new maplibregl.Marker({ color: "#3b82f6" }).setLngLat(coords).addTo(map.current);
    } else {
      setDropoffQuery(place.display_name);
      setDropoffCoords(coords);
      setDropoffResults([]);
      map.current.flyTo({ center: coords, zoom: 15 });
      new maplibregl.Marker({ color: "#ef4444" }).setLngLat(coords).addTo(map.current);
    }
  };

  const fetchAndDrawRoute = async (start, end) => {
    try {
      // OSRM Routing API
      const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${start[0]},${start[1]};${end[0]},${end[1]}?overview=full&geometries=geojson`);
      
      const routeGeoJSON = res.data.routes[0].geometry;
      const coords = routeGeoJSON.coordinates;

      // Draw polyline on map
      if (map.current.getSource('route')) {
        map.current.getSource('route').setData({
          type: 'Feature',
          properties: {},
          geometry: routeGeoJSON
        });
      } else {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: routeGeoJSON
          }
        });
        
        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 5,
            'line-opacity': 0.8
          }
        });
      }

      // Fit bounds
      const bounds = new maplibregl.LngLatBounds(start, start);
      bounds.extend(end);
      map.current.fitBounds(bounds, { padding: 100 });

      // Start Animation
      animateCar(coords);

    } catch (err) {
      console.error("Routing error", err);
    }
  };

  const animateCar = (coordinates) => {
    if (!carMarker.current) {
      // Create a custom HTML marker for the car
      const el = document.createElement('div');
      el.className = 'car-marker';
      el.style.width = '20px';
      el.style.height = '40px';
      el.style.backgroundColor = 'white';
      el.style.borderRadius = '4px';
      el.style.border = '2px solid black';
      
      carMarker.current = new maplibregl.Marker({ element: el })
        .setLngLat(coordinates[0])
        .addTo(map.current);
    }

    let i = 0;
    const animate = () => {
      if (i < coordinates.length) {
        carMarker.current.setLngLat(coordinates[i]);
        
        // Calculate rotation if we have a next point
        if (i < coordinates.length - 1) {
          const cur = coordinates[i];
          const next = coordinates[i + 1];
          const angle = Math.atan2(next[0] - cur[0], next[1] - cur[1]) * (180 / Math.PI);
          carMarker.current.setRotation(angle);
        }

        i++;
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setRideStatus('COMPLETED');
      }
    };
    
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animate();
  };

  const handleSearchRides = () => {
    if (!pickupCoords || !dropoffCoords) {
      alert("Please select both pickup and dropoff locations first.");
      return;
    }
    
    setRideStatus('SEARCHING');
    
    // Fit bounds to show both markers
    const bounds = new maplibregl.LngLatBounds(pickupCoords, pickupCoords);
    bounds.extend(dropoffCoords);
    map.current.fitBounds(bounds, { padding: 100 });
    
    // Send WebSocket request
    socket.current.emit("request_ride", {
      pickup: pickupCoords,
      dropoff: dropoffCoords
    });
  };

  return (
    <div className="dashboard-container">
      <div className="map-sidebar glass-panel">
        <div className="sidebar-header">
          <h2>Request a Ride</h2>
        </div>
        <div className="sidebar-content">
          <div className="location-inputs">
            
            {/* Pickup Input */}
            <div className="input-row">
              <div className="icon-wrapper dot"><div className="dot-inner"></div></div>
              <input 
                type="text" 
                placeholder="Current Location" 
                value={pickupQuery}
                onChange={(e) => {
                  setPickupQuery(e.target.value);
                  searchLocation(e.target.value, setPickupResults);
                }}
              />
              {pickupResults.length > 0 && (
                <div className="search-results">
                  {pickupResults.map((res) => (
                    <div key={res.place_id} className="search-result-item" onClick={() => handleSelectLocation(res, 'pickup')}>
                      {res.display_name.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="connector"></div>
            
            {/* Dropoff Input */}
            <div className="input-row">
              <div className="icon-wrapper square"><div className="square-inner"></div></div>
              <input 
                type="text" 
                placeholder="Where to?" 
                value={dropoffQuery}
                onChange={(e) => {
                  setDropoffQuery(e.target.value);
                  searchLocation(e.target.value, setDropoffResults);
                }}
              />
              {dropoffResults.length > 0 && (
                <div className="search-results">
                  {dropoffResults.map((res) => (
                    <div key={res.place_id} className="search-result-item" onClick={() => handleSelectLocation(res, 'dropoff')}>
                      {res.display_name.substring(0, 50)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
          <button 
            className={`btn-primary request-btn ${rideStatus !== 'IDLE' ? 'disabled' : ''}`} 
            onClick={handleSearchRides}
            disabled={rideStatus !== 'IDLE'}
          >
            {rideStatus === 'IDLE' && 'Search Rides'}
            {rideStatus === 'SEARCHING' && 'Looking for drivers...'}
            {rideStatus === 'BOOKED' && 'Cab Booked! Drawing Route...'}
            {rideStatus === 'COMPLETED' && 'Ride Completed!'}
          </button>
        </div>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default Dashboard;
