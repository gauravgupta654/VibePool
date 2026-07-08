import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Car, User, X, Mail, Lock, Phone, UserCircle, LogOut, Loader2, ArrowLeft, Search, MapPin } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLocationContext } from '../context/LocationContext';
import logoImg from '../assets/vibepool_logo.png';
import './Navbar.css';

const Navbar = () => {
  const { user, isAuthenticated, signup, login, verifyOtp, resendOtp, logout } = useAuth();
  const { selectedCityName, setSelectedCityName, setSelectedCityCoords } = useLocationContext();
  const routeLocation = useLocation();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'otp'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // City Search State
  const [cityQuery, setCityQuery] = useState(selectedCityName);
  const [cityResults, setCityResults] = useState([]);
  const [isSearchingCity, setIsSearchingCity] = useState(false);
  const citySearchTimeoutRef = useRef(null);
  
  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  
  // OTP fields
  const [otpEmail, setOtpEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Listen for custom event to open modal from other components (like Onboarding)
  useEffect(() => {
    const handleOpenModal = (e) => {
      const view = e.detail?.view || 'login';
      openModal(view);
    };
    
    window.addEventListener('open-auth-modal', handleOpenModal);
    return () => window.removeEventListener('open-auth-modal', handleOpenModal);
  }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', password: '', phone: '' });
    setOtpDigits(['', '', '', '', '', '']);
    setError('');
    setSuccess('');
    setLoading(false);
  };

  const openModal = (view = 'login') => {
    resetForm();
    setAuthView(view);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // OTP input handling
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits
    
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1); // Only take last digit
    setOtpDigits(newDigits);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    // On backspace, clear current and move to previous
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      otpInputRefs.current[5]?.focus();
    }
  };

  // Signup handler
  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signup(formData.name, formData.email, formData.password, formData.phone);
      setSuccess(result.message);
      setOtpEmail(formData.email);
      setResendCooldown(60);
      
      // Switch to OTP view after a brief delay
      setTimeout(() => {
        setAuthView('otp');
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      setSuccess('Login successful!');
      setTimeout(closeModal, 1000);
    } catch (err) {
      const data = err.response?.data;
      if (data?.needsVerification) {
        // User exists but not verified — switch to OTP view
        setOtpEmail(data.email);
        setError('');
        setAuthView('otp');
        // Auto-resend OTP
        try {
          await resendOtp(data.email);
          setResendCooldown(60);
          setSuccess('A new verification code has been sent to your email.');
        } catch (resendErr) {
          setError('Could not send OTP. Please try again.');
        }
      } else {
        setError(data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // OTP Verify handler
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyOtp(otpEmail, code);
      setSuccess('Email verified! Welcome to VibePool! 🎉');
      setTimeout(closeModal, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
      setOtpDigits(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setLoading(true);

    try {
      await resendOtp(otpEmail);
      setResendCooldown(60);
      setSuccess('A new code has been sent to your email.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // City search handler
  const handleCitySearch = async (query) => {
    setCityQuery(query);
    if (!query || query.length < 2) {
      setCityResults([]);
      return;
    }
    try {
      setIsSearchingCity(true);
      const res = await axios.get(`http://localhost:5000/api/geocode?q=${encodeURIComponent(query)}&featuretype=city`);
      setCityResults(res.data);
    } catch (err) {
      console.error("City search error", err);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleSelectCity = (place) => {
    const coords = [parseFloat(place.lon), parseFloat(place.lat)];
    const displayName = place.display_name.split(',')[0]; // Just take the city name part
    
    setCityQuery(displayName);
    setSelectedCityName(displayName);
    setSelectedCityCoords(coords);
    setCityResults([]);
  };

  // Hide the city search if not on the map page, if desired, but user approved showing everywhere.
  // Actually, showing it everywhere is fine.

  return (
    <>
      <nav className="glass-navbar">
        <div className="navbar-brand">
          <Link to="/" className="logo">
            <img src={logoImg} alt="VibePool Logo" className="logo-icon-img" style={{ height: '32px', width: 'auto', borderRadius: '4px' }} />
            <span>VibePool</span>
          </Link>
        </div>
        
        {isAuthenticated && (
          <div className="navbar-city-search">
            <div className="city-search-wrapper">
              <MapPin size={18} className="city-search-icon" />
              <input 
                type="text" 
                placeholder="Select your city..."
                value={cityQuery}
                onChange={(e) => {
                  setCityQuery(e.target.value);
                  if (citySearchTimeoutRef.current) clearTimeout(citySearchTimeoutRef.current);
                  citySearchTimeoutRef.current = setTimeout(() => {
                    handleCitySearch(e.target.value);
                  }, 600);
                }}
                onFocus={(e) => e.target.select()}
              />
              {isSearchingCity && <Loader2 size={16} className="spin city-loading-icon" />}
            </div>
            
            {cityResults.length > 0 && (
              <div className="city-dropdown glass-panel">
                {cityResults.map((res) => (
                  <div key={res.place_id} className="city-dropdown-item" onClick={() => handleSelectCity(res)}>
                    <MapPin size={16} />
                    <span>{res.display_name.split(',')[0]}</span>
                    <span className="city-state">{res.display_name.split(',').slice(1).join(',')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="navbar-links">
          <Link to="/map" className="nav-link">Ride</Link>
          <Link to="/drive" className="nav-link">Drive</Link>
          
          {isAuthenticated ? (
            <div className="user-menu">
              <div className="profile-btn glass-panel">
                <UserCircle size={20} />
                <span>{user?.name?.split(' ')[0]}</span>
              </div>
              <button className="logout-btn" onClick={logout} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <div className="profile-btn glass-panel" onClick={() => openModal('login')}>
              <User size={20} />
              <span>Login</span>
            </div>
          )}
        </div>
      </nav>

      {/* Auth Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="auth-modal glass-panel" onClick={e => e.stopPropagation()}>
            
            {/* Close button */}
            <button className="close-btn" onClick={closeModal}>
              <X size={24} />
            </button>

            {/* ====== LOGIN VIEW ====== */}
            {authView === 'login' && (
              <form onSubmit={handleLogin} className="auth-form">
                <div className="auth-header">
                  <div className="auth-icon-wrapper">
                    <Car size={32} className="auth-icon" />
                  </div>
                  <h2>Welcome back</h2>
                  <p className="auth-subtitle">Sign in to your VibePool account</p>
                </div>

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <div className="input-group">
                  <div className="input-icon"><Mail size={18} /></div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="input-group">
                  <div className="input-icon"><Lock size={18} /></div>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    autoComplete="current-password"
                  />
                </div>

                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? <><Loader2 size={20} className="spin" /> Signing in...</> : 'Sign In'}
                </button>

                <p className="auth-toggle">
                  Don't have an account?{' '}
                  <span onClick={() => { resetForm(); setAuthView('signup'); }}>Create one</span>
                </p>
              </form>
            )}

            {/* ====== SIGNUP VIEW ====== */}
            {authView === 'signup' && (
              <form onSubmit={handleSignup} className="auth-form">
                <div className="auth-header">
                  <div className="auth-icon-wrapper">
                    <Car size={32} className="auth-icon" />
                  </div>
                  <h2>Create account</h2>
                  <p className="auth-subtitle">Join India's ride sharing community</p>
                </div>

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <div className="input-group">
                  <div className="input-icon"><UserCircle size={18} /></div>
                  <input
                    type="text"
                    name="name"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    autoComplete="name"
                  />
                </div>

                <div className="input-group">
                  <div className="input-icon"><Mail size={18} /></div>
                  <input
                    type="email"
                    name="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="input-group">
                  <div className="input-icon"><Phone size={18} /></div>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="Phone number (e.g. 9876543210)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    autoComplete="tel"
                  />
                </div>

                <div className="input-group">
                  <div className="input-icon"><Lock size={18} /></div>
                  <input
                    type="password"
                    name="password"
                    placeholder="Password (min 6 characters)"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>

                <button type="submit" className="btn-primary auth-submit" disabled={loading}>
                  {loading ? <><Loader2 size={20} className="spin" /> Creating account...</> : 'Create Account'}
                </button>

                <p className="auth-toggle">
                  Already have an account?{' '}
                  <span onClick={() => { resetForm(); setAuthView('login'); }}>Sign in</span>
                </p>
              </form>
            )}

            {/* ====== OTP VERIFICATION VIEW ====== */}
            {authView === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="auth-form">
                <div className="auth-header">
                  <button 
                    type="button" 
                    className="back-btn" 
                    onClick={() => { resetForm(); setAuthView('signup'); }}
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="auth-icon-wrapper otp-icon">
                    <Mail size={32} className="auth-icon" />
                  </div>
                  <h2>Verify your email</h2>
                  <p className="auth-subtitle">
                    We've sent a 6-digit code to<br />
                    <strong className="otp-email">{otpEmail}</strong>
                  </p>
                </div>

                {error && <div className="auth-error">{error}</div>}
                {success && <div className="auth-success">{success}</div>}

                <div className="otp-container" onPaste={handleOtpPaste}>
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={el => otpInputRefs.current[index] = el}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className={`otp-input ${digit ? 'filled' : ''}`}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>

                <button type="submit" className="btn-primary auth-submit" disabled={loading || otpDigits.join('').length !== 6}>
                  {loading ? <><Loader2 size={20} className="spin" /> Verifying...</> : 'Verify Email'}
                </button>

                <p className="auth-toggle resend-text">
                  Didn't receive the code?{' '}
                  {resendCooldown > 0 ? (
                    <span className="cooldown">Resend in {resendCooldown}s</span>
                  ) : (
                    <span onClick={handleResendOtp} className={loading ? 'disabled' : ''}>Resend Code</span>
                  )}
                </p>
              </form>
            )}

          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
