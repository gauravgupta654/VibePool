import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Leaf, Users, Car } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Onboarding.css';

import imgConcept from '../assets/onboarding_concept.png';
import imgHuman from '../assets/onboarding_human.png';
import imgNature from '../assets/onboarding_nature.png';

const slides = [
  {
    id: 1,
    title: "The VibePool Concept",
    subtitle: "What is Carpooling?",
    description: "Carpooling is simply sharing a ride with people heading in the same direction. Instead of 4 people driving 4 separate cars to work or between cities, you all ride together in one vehicle.",
    image: imgConcept,
    icon: <Car size={24} />,
    color: "var(--primary-color)"
  },
  {
    id: 2,
    title: "Better for You",
    subtitle: "Save Money, Reduce Stress",
    description: "Splitting fuel costs means everyone saves money. Plus, taking turns driving reduces your stress in traffic and gives you a chance to network and make new friends along the way.",
    image: imgHuman,
    icon: <Users size={24} />,
    color: "#8b5cf6" // Purple
  },
  {
    id: 3,
    title: "Better for the Planet",
    subtitle: "Reduce Carbon Footprint",
    description: "Fewer cars on the road means significantly less CO2 emissions and reduced traffic congestion. By choosing to share rides, you are actively contributing to a cleaner, greener Earth.",
    image: imgNature,
    icon: <Leaf size={24} />,
    color: "#10b981" // Emerald green
  }
];

const Onboarding = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Removed auto-redirect so logged-in users can still view this page.

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const openLogin = () => {
    // Dispatch custom event that Navbar is listening to
    window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: { view: 'login' } }));
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-card glass-panel">
        
        {/* Navigation Arrows */}
        {currentSlide > 0 && (
          <button className="nav-arrow prev" onClick={prevSlide}>
            <ChevronLeft size={32} />
          </button>
        )}
        
        {currentSlide < slides.length - 1 && (
          <button className="nav-arrow next" onClick={nextSlide}>
            <ChevronRight size={32} />
          </button>
        )}

        <div className="slide-content">
          <div className="slide-image-container">
            <div className="icon-badge" style={{ backgroundColor: slides[currentSlide].color }}>
              {slides[currentSlide].icon}
            </div>
            <img 
              src={slides[currentSlide].image} 
              alt={slides[currentSlide].title} 
              className="slide-image fade-in"
              key={slides[currentSlide].image} // Force re-render for animation
            />
          </div>
          
          <div className="slide-text">
            <h3 className="slide-subtitle" style={{ color: slides[currentSlide].color }}>
              {slides[currentSlide].subtitle}
            </h3>
            <h1 className="slide-title">{slides[currentSlide].title}</h1>
            <p className="slide-description">{slides[currentSlide].description}</p>
          </div>
        </div>

        <div className="onboarding-footer">
          <div className="dots-container">
            {slides.map((slide, index) => (
              <div 
                key={slide.id} 
                className={`dot ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>

          {currentSlide === slides.length - 1 ? (
            isAuthenticated ? (
              <button className="btn-primary start-btn pulse-animation" onClick={() => navigate('/map')}>
                Book a Ride <ArrowRight size={20} />
              </button>
            ) : (
              <button className="btn-primary start-btn pulse-animation" onClick={openLogin}>
                Login / Sign Up to Continue <ArrowRight size={20} />
              </button>
            )
          ) : (
            <div className="skip-btn" onClick={() => setCurrentSlide(slides.length - 1)}>
              Skip to end
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
