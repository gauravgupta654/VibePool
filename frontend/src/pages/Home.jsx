import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Home.css';
import { MapPin, Navigation, ShieldCheck } from 'lucide-react';

const Home = () => {
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const navigate = useNavigate();

  const handleSeePrices = () => {
    const params = new URLSearchParams();
    if (pickup) params.append('pickup', pickup);
    if (dropoff) params.append('dropoff', dropoff);
    
    navigate(`/map?${params.toString()}`);
  };

  return (
    <div className="home-container">
      <div className="hero-section">
        <div className="hero-content glass-panel">
          <h1>Go anywhere in India with VibePool</h1>
          <p>India's trusted ride sharing platform. Request a ride, hop in, and go.</p>
          
          <div className="location-inputs">
            <div className="input-row">
              <div className="icon-wrapper dot"><div className="dot-inner"></div></div>
              <input 
                type="text" 
                placeholder="Enter pickup (e.g. Connaught Place, Delhi)" 
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </div>
            <div className="connector"></div>
            <div className="input-row">
              <div className="icon-wrapper square"><div className="square-inner"></div></div>
              <input 
                type="text" 
                placeholder="Enter dropoff (e.g. India Gate, Delhi)" 
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
            </div>
          </div>
          
          <button className="btn-primary see-prices-btn" onClick={handleSeePrices}>
            See prices
          </button>
        </div>
      </div>

      <div className="features-section">
        <h2>Why ride with us?</h2>
        <div className="features-grid">
          <div className="feature-card glass-panel">
            <MapPin size={32} className="feature-icon" />
            <h3>Route Optimization</h3>
            <p>Our algorithms find the fastest route to get you where you need to be.</p>
          </div>
          <div className="feature-card glass-panel">
            <ShieldCheck size={32} className="feature-icon" />
            <h3>Safe & Secure</h3>
            <p>All our drivers undergo background checks and our rides are tracked in real-time.</p>
          </div>
          <div className="feature-card glass-panel">
            <Navigation size={32} className="feature-icon" />
            <h3>Real-time Tracking</h3>
            <p>Know exactly where your driver is and share your trip status with friends.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
