import { useEffect, useRef, useState, useContext } from 'react';
import { renderToString } from 'react-dom/server';
import { useSearchParams } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import axios from 'axios';
import { io } from 'socket.io-client';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Bike, CarFront, Car, Sparkles, Clock, Loader2, User, Phone } from 'lucide-react';
import { useLocationContext } from '../context/LocationContext';
import AuthContext from '../context/AuthContext';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const mapContainer = useRef(null);
  const map = useRef(null);
  const socket = useRef(null);
  const carMarker = useRef(null);
  const animationRef = useRef(null);
  
  const { selectedCityCoords, selectedCityName } = useLocationContext();
  
  const [lng, setLng] = useState(selectedCityCoords[0]);
  const [lat, setLat] = useState(selectedCityCoords[1]);
  const [zoom, setZoom] = useState(12);
  
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
  const [rideStatus, setRideStatus] = useState('IDLE'); // IDLE, OPTIONS, CALCULATING, SEARCHING, BOOKED, COMPLETED
  const [mapLoaded, setMapLoaded] = useState(false);
  const [assignedDriver, setAssignedDriver] = useState(null);
  
  // Ride Selection State
  const [distance, setDistance] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [rideOptions, setRideOptions] = useState([]);
  const [selectedRide, setSelectedRide] = useState(null);
  
  // Debounce timers
  const pickupTimeoutRef = useRef(null);
  const dropoffTimeoutRef = useRef(null);

  useEffect(() => {
    // Initialize Socket
    socket.current = io("http://localhost:5000");

    socket.current.on("cab_booked", async (data) => {
      setAssignedDriver(data.driverDetails);
      setRideStatus('BOOKED');
      console.log("Cab booked!", data);
      
      if (routeCoords && routeCoords.length > 0) {
        // Place marker at pickup location but don't move it yet
        if (!carMarker.current) {
          const el = document.createElement('div');
          el.className = 'car-marker';
          
          // Determine which icon to use based on selectedRide
          let IconComponent = Car; // Default
          if (selectedRide?.id === 'bike') IconComponent = Bike;
          else if (selectedRide?.id === 'auto') IconComponent = CarFront;
          else if (selectedRide?.id === 'mini') IconComponent = Car;
          else if (selectedRide?.id === 'prime') IconComponent = Sparkles;
          
          // Render the Lucide React component to an HTML string
          el.innerHTML = renderToString(<IconComponent size={20} color="white" />);
          
          // Style the marker container
          el.style.backgroundColor = '#1e293b';
          el.style.borderRadius = '50%';
          el.style.width = '36px';
          el.style.height = '36px';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.style.border = '2px solid #3b82f6';
          el.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.5)';
          el.style.transition = 'transform 0.1s linear';
          
          carMarker.current = new maplibregl.Marker({ element: el })
            .setLngLat(routeCoords[0])
            .addTo(map.current);
        } else {
          carMarker.current.setLngLat(routeCoords[0]);
        }
        
        // Removed automatic setTimeout transitions. 
        // State changes will be handled later via an admin driver panel emitting socket events.
      }
    });

    return () => {
      socket.current.disconnect();
    };
  }, [routeCoords]);

  // Watch for both coordinates to calculate route & fares immediately
  useEffect(() => {
    if (pickupCoords && dropoffCoords) {
      setRideStatus('CALCULATING');
      fetchAndDrawRoute(pickupCoords, dropoffCoords);
    }
  }, [pickupCoords, dropoffCoords]);

  // Initial geocoding if query params exist
  useEffect(() => {
    if (!mapLoaded) return;
    
    if (initialPickup && !pickupCoords) {
      searchLocation(initialPickup, (results) => {
        if (results && results.length > 0) {
          handleSelectLocation(results[0], 'pickup');
        }
      });
    }
    if (initialDropoff && !dropoffCoords) {
      searchLocation(initialDropoff, (results) => {
        if (results && results.length > 0) {
          handleSelectLocation(results[0], 'dropoff');
        }
      });
    }
  }, [mapLoaded, initialPickup, initialDropoff]);

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
    
    map.current.on('load', () => {
      setMapLoaded(true);
    });
  }, [lng, lat, zoom]);

  // Listen for global city changes
  useEffect(() => {
    if (map.current && selectedCityCoords) {
      map.current.flyTo({
        center: selectedCityCoords,
        zoom: 12,
        speed: 1.2
      });
    }
  }, [selectedCityCoords]);

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
      // Append the selected city to make the search highly accurate for the local area
      const enhancedQuery = query.toLowerCase().includes(selectedCityName.toLowerCase()) 
        ? query 
        : `${query}, ${selectedCityName}`;
        
      // Use Photon API which is much faster, has no strict rate limits, and supports POIs natively
      const res = await axios.get(`https://photon.komoot.io/api/?q=${encodeURIComponent(enhancedQuery)}&limit=5`);
      
      // Format Photon results to match the expected Nominatim structure
      const formattedResults = res.data.features.map(f => {
        const props = f.properties;
        const name = props.name || props.street || props.city;
        const address = [props.street, props.city || props.county, props.state].filter(Boolean).join(', ');
        return {
          place_id: props.osm_id,
          display_name: name !== address ? `${name}, ${address}` : address,
          lat: f.geometry.coordinates[1].toString(),
          lon: f.geometry.coordinates[0].toString()
        };
      });
      
      setResults(formattedResults);
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
      // Use Backend Proxy for OSRM to bypass browser CORS / Network Errors
      const res = await axios.get(`http://localhost:5000/api/route?start=${start[0]},${start[1]}&end=${end[0]},${end[1]}`);
      
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

      // Calculate Distance and Fares
      const distKm = (res.data.routes[0].distance / 1000).toFixed(1);
      setDistance(distKm);
      setRouteCoords(coords);
      
      const timeMins = Math.ceil(res.data.routes[0].duration / 60);

      setRideOptions([
        { id: 'bike', name: 'Moto', price: Math.round(20 + 5 * Number(distKm)), time: timeMins, icon: <Bike size={24} /> },
        { id: 'auto', name: 'Auto', price: Math.round(30 + 10 * Number(distKm)), time: timeMins + 2, icon: <CarFront size={24} /> },
        { id: 'mini', name: 'Mini', price: Math.round(50 + 12 * Number(distKm)), time: timeMins + 3, icon: <Car size={24} /> },
        { id: 'prime', name: 'Prime', price: Math.round(70 + 15 * Number(distKm)), time: timeMins + 5, icon: <Sparkles size={24} /> },
      ]);
      setRideStatus('OPTIONS');

    } catch (err) {
      console.error("Routing error", err);
      setRideStatus(`ERROR: ${err.message || 'Unknown routing error'}`);
    }
  };

  const animateCar = (coordinates) => {
    // Marker is already created and placed at pickup location
    if (!carMarker.current) return;

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
    if (!pickupCoords || !dropoffCoords || !selectedRide) {
      return;
    }
    
    setRideStatus('SEARCHING');
    
    // Send WebSocket request
    const ridePayload = {
        userEmail: user?.email,
        pickupQuery,
        dropoffQuery,
        pickup: pickupCoords,
        dropoff: dropoffCoords,
        rideType: selectedRide.name,
        price: selectedRide.price
      };
      
    socket.current.emit("request_ride", ridePayload);
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
                  if (pickupTimeoutRef.current) clearTimeout(pickupTimeoutRef.current);
                  pickupTimeoutRef.current = setTimeout(() => {
                    searchLocation(e.target.value, setPickupResults);
                  }, 300); // Reduced to 300ms for snappier feeling
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
                  if (dropoffTimeoutRef.current) clearTimeout(dropoffTimeoutRef.current);
                  dropoffTimeoutRef.current = setTimeout(() => {
                    searchLocation(e.target.value, setDropoffResults);
                  }, 300); // Reduced to 300ms for snappier feeling
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
          
          {/* Searching / Booked UI */}
          {rideStatus === 'SEARCHING' && (
            <div className="searching-container">
              <Loader2 className="spinning-loader" size={48} />
              <h3>Finding your driver...</h3>
              <p>Please wait while we connect you with a nearby driver.</p>
            </div>
          )}

          {rideStatus === 'BOOKED' && assignedDriver && (
            <div className="driver-details-container">
              <div className="driver-header">
                <h3>Driver is arriving soon!</h3>
                <span className="eta-badge">3 mins away</span>
              </div>
              <div className="driver-card">
                <div className="driver-avatar">
                  <User size={32} />
                </div>
                <div className="driver-info">
                  <h4>{assignedDriver.name}</h4>
                  <p className="driver-dl">DL: {assignedDriver.dl}</p>
                </div>
                <div className="driver-rating">
                  <span>★</span> 4.8
                </div>
              </div>
              <div className="driver-contact">
                <div className="contact-item">
                  <Phone size={18} /> {assignedDriver.mobile}
                </div>
                <div className="vehicle-info">
                  <span>Vehicle:</span> {selectedRide?.name} 
                </div>
              </div>
            </div>
          )}

          {/* Ride Options UI */}
          {(rideStatus === 'OPTIONS' || rideStatus === 'IDLE') && rideOptions.length > 0 && (
            <div className="ride-options-container">
              <div className="ride-options-header">
                <h3>Recommended Rides</h3>
                <span className="distance-badge">{distance} km</span>
              </div>
              <div className="ride-options-list">
                {rideOptions.map((option) => (
                  <div 
                    key={option.id}
                    className={`ride-option-card ${selectedRide?.id === option.id ? 'active' : ''}`}
                    onClick={() => rideStatus === 'OPTIONS' && setSelectedRide(option)}
                  >
                    <div className="ride-icon-wrapper">
                      {option.icon}
                    </div>
                    <div className="ride-details">
                      <h4>{option.name}</h4>
                      <div className="ride-time">
                        <Clock size={12} />
                        <span>{option.time} mins away</span>
                      </div>
                    </div>
                    <div className="ride-price">
                      ₹{option.price}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button 
            className={`btn-primary request-btn ${(rideStatus !== 'OPTIONS' || !selectedRide) ? 'disabled' : ''}`} 
            onClick={handleSearchRides}
            disabled={rideStatus !== 'OPTIONS' || !selectedRide}
          >
            {rideStatus === 'IDLE' && 'Select locations first'}
            {rideStatus === 'CALCULATING' && 'Calculating route...'}
            {rideStatus.startsWith('ERROR') && rideStatus}
            {rideStatus === 'OPTIONS' && selectedRide && `Book ${selectedRide.name}`}
            {rideStatus === 'OPTIONS' && !selectedRide && 'Select a ride'}
            {rideStatus === 'SEARCHING' && 'Looking for drivers...'}
            {rideStatus === 'BOOKED' && 'Driver is coming to pickup you.'}
            {rideStatus === 'ARRIVED' && 'Driver Arrived! Starting Ride...'}
            {rideStatus === 'STARTED' && 'Ride in Progress...'}
            {rideStatus === 'COMPLETED' && 'Ride Completed! You have reached your destination.'}
          </button>
        </div>
      </div>
      <div ref={mapContainer} className="map-container" />
    </div>
  );
};

export default Dashboard;
