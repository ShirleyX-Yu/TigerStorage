import { HALL_COORDINATES } from './hallCoordinates';

// Function to geocode a hall name and compare with our hard-coded coordinates
export const testHallCoordinate = async (hallName) => {
  console.log(`Testing coordinates for: ${hallName}`);
  
  const hardcodedCoords = HALL_COORDINATES[hallName];
  if (!hardcodedCoords) {
    console.error(`No hard-coded coordinates found for ${hallName}`);
    return { success: false, message: `No hard-coded coordinates found` };
  }
  
  console.log(`Hard-coded: Lat ${hardcodedCoords.lat}, Lng ${hardcodedCoords.lng}`);
  
  try {
    // Format the search address with Princeton University context
    const searchAddress = `${hallName}, Princeton University, Princeton, NJ 08544, USA`;
    console.log(`Geocoding address: ${searchAddress}`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch coordinates: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.length === 0) {
      console.error(`No geocoding results found for ${hallName}`);
      return { 
        success: false, 
        message: `No geocoding results found`,
        hardcoded: hardcodedCoords
      };
    }
    
    const { lat, lon, display_name } = data[0];
    console.log(`Geocoded: Lat ${lat}, Lng ${lon}`);
    console.log(`Address: ${display_name}`);
    
    // Calculate distance between the two coordinates (in meters)
    const distance = calculateDistance(
      hardcodedCoords.lat, 
      hardcodedCoords.lng, 
      parseFloat(lat), 
      parseFloat(lon)
    );
    
    console.log(`Distance between coordinates: ${distance.toFixed(2)} meters`);
    
    return {
      success: true,
      hallName,
      hardcoded: hardcodedCoords,
      geocoded: { lat: parseFloat(lat), lng: parseFloat(lon) },
      display_name,
      distance,
      isClose: distance < 100 // Consider "close" if within 100 meters
    };
  } catch (error) {
    console.error(`Error testing coordinates for ${hallName}:`, error);
    return { 
      success: false, 
      message: error.message,
      hardcoded: hardcodedCoords
    };
  }
};

// Test all halls in the HALL_COORDINATES object
export const testAllHallCoordinates = async () => {
  const results = {};
  const hallNames = Object.keys(HALL_COORDINATES);
  
  console.log(`Testing coordinates for ${hallNames.length} halls...`);
  
  // To avoid rate limiting, we'll test halls one at a time with a delay
  for (const hallName of hallNames) {
    results[hallName] = await testHallCoordinate(hallName);
    // Add a delay to avoid rate limiting (1 second)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return results;
};

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in meters
  
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI/180);
}

// If you want to run this directly in the browser console
window.testHallCoordinate = testHallCoordinate;
window.testAllHallCoordinates = testAllHallCoordinates; 