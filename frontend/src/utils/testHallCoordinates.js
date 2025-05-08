// Function to geocode a hall name and print the coordinates and address
export const testHallCoordinate = async (hallName) => {
  console.log(`Testing coordinates for: ${hallName}`);
  
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
      };
    }
    
    const { lat, lon, display_name } = data[0];
    console.log(`Geocoded: Lat ${lat}, Lng ${lon}`);
    console.log(`Address: ${display_name}`);
    
    return {
      success: true,
      hallName,
      geocoded: { lat: parseFloat(lat), lng: parseFloat(lon) },
      display_name,
    };
  } catch (error) {
    console.error(`Error testing coordinates for ${hallName}:`, error);
    return {
      success: false,
      message: error.message,
    };
  }
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

// If running this directly in the browser console
window.testHallCoordinate = testHallCoordinate; 