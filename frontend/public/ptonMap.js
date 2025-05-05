// All logic from the previous inline <script> in ptonMap.html
// Attach functions to window for global access from HTML attributes

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}
window.getCookie = getCookie;

function logout() {
  localStorage.clear();
  sessionStorage.clear();
  document.cookie.split(';').forEach(function(c) {
    document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
  });
  window.location.href = '/';
}
window.logout = logout;

function goToDashboard() {
  window.location.href = '/';
  localStorage.setItem('dashboardRedirect', 'renter');
  console.log('Navigating to home with renter dashboard redirect flag set');
}
window.goToDashboard = goToDashboard;

function toggleFilterColumn() {
  const filterColumn = document.getElementById('filterColumn');
  filterColumn.classList.toggle('active');
}
window.toggleFilterColumn = toggleFilterColumn;

function updatePriceValue(value) {
  document.getElementById('priceValue').textContent = value;
  filterMarkers();
}
window.updatePriceValue = updatePriceValue;

function filterBySize() { applyFilters(); }
window.filterBySize = filterBySize;
function filterByLocation(location) { filterMarkers(); }
window.filterByLocation = filterByLocation;
function updateRating(value) {
  const stars = document.querySelectorAll('.star-rating .stars i');
  const valueDisplay = document.querySelector('.star-rating .value');
  stars.forEach((star, index) => {
    if (index < value) {
      star.classList.add('fas');
      star.classList.remove('far');
    } else {
      star.classList.add('far');
      star.classList.remove('fas');
    }
  });
  valueDisplay.textContent = value + (value === '1' ? ' star' : ' stars');
  filterMarkers();
  createStorageUnitList();
}
window.updateRating = updateRating;
function filterByCost() { applyFilters(); }
window.filterByCost = filterByCost;
function filterByContract() { applyFilters(); }
window.filterByContract = filterByContract;
function filterByDistance() { applyFilters(); }
window.filterByDistance = filterByDistance;
function filterByRating() {
  const rating = document.getElementById('ratingRange').value;
  updateRating(rating);
  applyFilters();
}
window.filterByRating = filterByRating;

function filterMarkers() {
  const size = document.getElementById('sizeSelect').value;
  const cost = document.getElementById('costSelect').value;
  const contract = document.getElementById('contractSelect').value;
  const distance = document.getElementById('distanceSelect').value;
  const rating = parseInt(document.getElementById('ratingRange').value);
  console.log('Filtering with:', { size, cost, contract, distance, rating });
}
window.filterMarkers = filterMarkers;

let markers = [];
let listings = [];
let interestedLocations = new Set(JSON.parse(localStorage.getItem('interestedLocations') || '[]'));

function debugImageUrl(imageUrl) {
  if (!imageUrl) return '/assets/placeholder.jpg';
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/')) return imageUrl;
  return `${window.location.origin}${imageUrl}`;
}
window.debugImageUrl = debugImageUrl;

const map = L.map('map', {
  center: [40.3434, -74.6517],
  zoom: 15,
  zoomControl: false
});
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
  maxZoom: 20
}).addTo(map);

function createMarkers(listings) {
  markers.forEach(marker => marker.remove());
  markers = [];
  listings.forEach(listing => {
    try {
      if (listing.latitude && listing.longitude) {
        const imageUrl = debugImageUrl(listing.image_url);
        const marker = L.marker([listing.latitude, listing.longitude])
          .addTo(map)
          .bindPopup(`
            <div class="custom-popup-content">
              <h2>${listing.location}</h2>
              <div class="popup-image">
                <img src="${listing.image_url || '/assets/placeholder.jpg'}" alt="Storage space at ${listing.location}" onerror="this.onerror=null; this.src='/assets/placeholder.jpg';">
              </div>
              <div class="popup-details">
                <div class="popup-description">${listing.description || 'No description available'}</div>
                <div class="popup-specs">
                  <div><strong>Price:</strong> $${listing.cost}/month</div>
                  <div><strong>Size:</strong> ${listing.cubic_feet} cubic feet</div>
                  <div><strong>Contract Length:</strong> ${listing.contract_length_months} months</div>
                </div>
                <button class="interested-button ${interestedLocations.has(listing.id) ? 'interested' : ''}" onclick="toggleInterest(${listing.id})">
                  <i class="fas ${interestedLocations.has(listing.id) ? 'fa-check' : 'fa-heart'}"></i> ${interestedLocations.has(listing.id) ? 'Interested' : 'Show Interest'}
                </button>
              </div>
            </div>
          `);
        marker.listingId = listing.id;
        markers.push(marker);
      }
    } catch (err) {
      console.error('Error creating marker:', err);
    }
  });
}
window.createMarkers = createMarkers;

async function fetchListings() {
  try {
    const response = await fetch(`${window.location.origin}/api/listings`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch listings');
    listings = await response.json();
    createMarkers(listings);
    createStorageUnitList(listings);
  } catch (err) {
    console.error('Error fetching listings:', err);
  }
}
window.fetchListings = fetchListings;
fetchListings();

function applyFilters() {
  const size = document.getElementById('sizeSelect').value;
  const cost = document.getElementById('costSelect').value;
  const contract = document.getElementById('contractSelect').value;
  const distance = document.getElementById('distanceSelect').value;
  const rating = parseInt(document.getElementById('ratingRange').value);
  markers.forEach(marker => marker.setOpacity(1));
  fetchListings().then(() => {
    markers.forEach(marker => {
      const content = marker.getPopup().getContent();
      const listing = listings.find(l => content.includes(l.location));
      if (listing) {
        let matchesAllFilters = true;
        if (size !== 'all') {
          const cubicFeet = listing.cubic_feet;
          if (!((size === 'small' && cubicFeet < 50) || (size === 'medium' && cubicFeet >= 50 && cubicFeet <= 150) || (size === 'large' && cubicFeet > 150 && cubicFeet <= 250) || (size === 'xlarge' && cubicFeet > 250))) {
            matchesAllFilters = false;
          }
        }
        if (cost !== 'all') {
          const price = listing.cost;
          if (!((cost === 'low' && price < 15) || (cost === 'medium-low' && price >= 15 && price <= 30) || (cost === 'medium' && price > 30 && price <= 45) || (cost === 'medium-high' && price > 45 && price <= 60) || (cost === 'high' && price > 60))) {
            matchesAllFilters = false;
          }
        }
        if (contract !== 'all' && listing.contract_length_months !== parseInt(contract)) {
          matchesAllFilters = false;
        }
        if (!matchesAllFilters) {
          marker.setOpacity(0.5);
        }
      }
    });
  });
}
window.applyFilters = applyFilters;

async function toggleInterest(listingId) {
  try {
    const isInterested = interestedLocations.has(listingId);
    const method = isInterested ? 'DELETE' : 'POST';
    const response = await fetch(`${window.location.origin}/api/listings/${listingId}/interest`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to ${isInterested ? 'remove' : 'add'} interest`);
    }
    if (isInterested) {
      interestedLocations.delete(listingId);
    } else {
      interestedLocations.add(listingId);
    }
    localStorage.setItem('interestedLocations', JSON.stringify(Array.from(interestedLocations)));
    const marker = markers.find(m => m.listingId === listingId);
    if (marker) {
      const listing = listings.find(l => l.id === listingId);
      if (listing) {
        const newPopupContent = `
          <div class="custom-popup-content">
            <h2>${listing.location}</h2>
            <div class="popup-image">
              <img src="${listing.image_url || '/assets/placeholder.jpg'}" alt="Storage space at ${listing.location}" onerror="this.onerror=null; this.src='/assets/placeholder.jpg';">
            </div>
            <div class="popup-details">
              <div class="popup-description">${listing.description || 'No description available'}</div>
              <div class="popup-specs">
                <div><strong>Price:</strong> $${listing.cost}/month</div>
                <div><strong>Size:</strong> ${listing.cubic_feet} cubic feet</div>
                <div><strong>Contract Length:</strong> ${listing.contract_length_months} months</div>
              </div>
              <button class="interested-button ${interestedLocations.has(listingId) ? 'interested' : ''}" onclick="toggleInterest(${listingId})">
                <i class="fas ${interestedLocations.has(listingId) ? 'fa-check' : 'fa-heart'}"></i> ${interestedLocations.has(listingId) ? 'Interested' : 'Show Interest'}
              </button>
            </div>
          </div>
        `;
        marker.setPopupContent(newPopupContent);
      }
    }
    createStorageUnitList(listings);
  } catch (err) {
    alert(err.message || 'Failed to update interest status. Please try again.');
  }
}
window.toggleInterest = toggleInterest;

async function fetchInterestedListings() {
  try {
    const response = await fetch(`${window.location.origin}/api/my-interested-listings`, { credentials: 'include' });
    if (!response.ok) throw new Error('Failed to fetch interested listings');
    const data = await response.json();
    interestedLocations = new Set(data.map(listing => listing.id));
    markers.forEach(marker => {
      const listing = listings.find(l => l.id === marker.listingId);
      if (listing) {
        const newPopupContent = `
          <div class="custom-popup-content">
            <h2>${listing.location}</h2>
            <div class="popup-image">
              <img src="${listing.image_url || '/assets/placeholder.jpg'}" alt="Storage space at ${listing.location}" onerror="this.onerror=null; this.src='/assets/placeholder.jpg';">
            </div>
            <div class="popup-details">
              <div class="popup-description">${listing.description || 'No description available'}</div>
              <div class="popup-specs">
                <div><strong>Price:</strong> $${listing.cost}/month</div>
                <div><strong>Size:</strong> ${listing.cubic_feet} cubic feet</div>
                <div><strong>Contract Length:</strong> ${listing.contract_length_months} months</div>
              </div>
              <button class="interested-button ${interestedLocations.has(listing.id) ? 'interested' : ''}" onclick="toggleInterest(${listing.id})">
                <i class="fas ${interestedLocations.has(listing.id) ? 'fa-check' : 'fa-heart'}"></i> ${interestedLocations.has(listing.id) ? 'Interested' : 'Show Interest'}
              </button>
            </div>
          </div>
        `;
        marker.setPopupContent(newPopupContent);
      }
    });
  } catch (err) {
    // Silent fail
  }
}
window.fetchInterestedListings = fetchInterestedListings;
fetchInterestedListings();

function createStorageUnitList(listings) {
  const storageUnitsList = document.getElementById('storageUnitsList');
  storageUnitsList.innerHTML = '';
  listings.forEach(listing => {
    const imageUrl = getFullImageUrl(listing.image_url);
    const unitElement = document.createElement('div');
    unitElement.className = 'storage-unit-item';
    unitElement.innerHTML = `
      <div class="storage-unit-image">
        <img src="${imageUrl}" alt="${listing.location}" onerror="this.src='/assets/placeholder.jpg'">
      </div>
      <div class="storage-unit-info">
        <div class="storage-unit-name">${listing.location}</div>
        <div class="storage-unit-details">
          <span class="storage-unit-price">$${listing.cost}/month</span>
          <span> • ${listing.cubic_feet} cubic feet</span>
        </div>
      </div>
    `;
    unitElement.addEventListener('click', () => {
      const marker = markers.find(m => {
        const content = m.getPopup().getContent();
        return content.includes(listing.location);
      });
      if (marker) {
        map.setView(marker.getLatLng(), 16);
        setTimeout(() => {
          marker.openPopup();
        }, 100);
      }
    });
    storageUnitsList.appendChild(unitElement);
  });
}
window.createStorageUnitList = createStorageUnitList;

function getFullImageUrl(imageUrl) {
  if (!imageUrl) return '/assets/placeholder.jpg';
  if (imageUrl.startsWith('http')) return imageUrl;
  if (imageUrl.startsWith('/')) {
    const apiUrl = window.API_URL || window.location.origin;
    return `${apiUrl}${imageUrl}`.replace(/([^:]\/)/g, "$1");
  }
  return `/${imageUrl}`;
}
window.getFullImageUrl = getFullImageUrl; 