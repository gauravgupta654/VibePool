import { createContext, useContext, useState } from 'react';

const LocationContext = createContext(null);

export const LocationProvider = ({ children }) => {
  // Default to New Delhi if nothing is selected
  const [selectedCityCoords, setSelectedCityCoords] = useState([77.2090, 28.6139]);
  const [selectedCityName, setSelectedCityName] = useState('New Delhi');

  return (
    <LocationContext.Provider value={{
      selectedCityCoords,
      setSelectedCityCoords,
      selectedCityName,
      setSelectedCityName
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocationContext = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
};
