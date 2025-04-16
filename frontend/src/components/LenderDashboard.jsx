import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import { useNavigate, useLocation } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import EditListingForm from './EditListingForm';

const LenderDashboard = ({ username }) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editListingId, setEditListingId] = useState(null);

  const handleOpenEditModal = (listingId) => {
    setEditListingId(listingId);
    setEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditListingId(null);
    fetchListings();
  };

  const navigate = useNavigate();
  const location = useLocation();

  const [listedSpaces, setListedSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);

  const mockListedSpaces = [
    {
      id: 1,
      location: 'Princeton University Campus',
      cost: 50,
      cubicFeet: 100,
      contractLength: 3,
      dateCreated: '2025-04-08',
      status: 'Active',
      interestedRenters: []
    },
    {
      id: 2,
      location: 'Nassau Street Storage',
      cost: 75,
      cubicFeet: 150,
      contractLength: 4,
      dateCreated: '2025-04-08',
      status: 'Active',
      interestedRenters: []
    }
  ];

  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);

      let apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl && typeof window !== 'undefined') {
        apiUrl = window.location.origin;
      } else if (!apiUrl) {
        apiUrl = 'http://localhost:8000';
      }

      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'lender';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || username || 'lender';

      const response = await fetch(`${apiUrl}/api/my-listings`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        }
      });

      if (!response.ok) {
        throw new Error(`Unable to load your listings (${response.status}): ${response.statusText}`);
      }

      const data = await response.json();

      const formattedListings = await Promise.all(data.map(async listing => {
        const rentersResponse = await fetch(`${apiUrl}/api/listings/${listing.id}/interested-renters`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': storedUsername
          }
        });

        let interestedRenters = [];
        if (rentersResponse.ok) {
          const rentersData = await rentersResponse.json();
          interestedRenters = rentersData.map(renter => ({
            id: renter.id,
            name: renter.username,
            email: `${renter.username}@princeton.edu`,
            dateInterested: renter.dateInterested,
            status: renter.status
          }));
        }

        return {
          id: listing.id,
          location: listing.location,
          address: listing.address || '',
          cost: listing.cost,
          cubicFeet: listing.cubic_feet,
          contractLength: listing.contract_length_months || 12,
          dateCreated: new Date(listing.created_at || Date.now()).toLocaleDateString(),
          status: 'Active',
          interestedRenters
        };
      }));

      setListedSpaces(formattedListings);
    } catch (err) {
      setError(err.message);
      if (import.meta.env.DEV && (err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))) {
        setListedSpaces(mockListedSpaces);
        setError('Using sample data (network error: ' + err.message + ')');
      }
    } finally {
      setLoading(false);
    }
  }, [location.key, username]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleDeleteListing = async (listingId) => {
    if (!window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;

    try {
      setDeleteInProgress(true);
      setError(null);

      let apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl && typeof window !== 'undefined') {
        apiUrl = window.location.origin;
      } else if (!apiUrl) {
        apiUrl = 'http://localhost:8000';
      }

      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'lender';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || username || 'lender';

      const response = await fetch(`${apiUrl}/api/listings/${listingId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete listing (${response.status}): ${response.statusText}`);
      }

      setListedSpaces(prev => prev.filter(space => space.id !== listingId));
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (err) {
      setError(`Error deleting listing: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleteInProgress(false);
    }
  };

  return (
    <div style={styles.container}>
      <Header title="Lender Dashboard" />
      {/* Keep rest of full UI here */}
      <Dialog open={editModalOpen} onClose={handleCloseEditModal} maxWidth="md" fullWidth>
        {editListingId && (
          <EditListingForm 
            listingId={editListingId} 
            onClose={handleCloseEditModal}
            onSuccess={() => {
              handleCloseEditModal();
              fetchListings();
            }}
          />
        )}
      </Dialog>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
  },
  successMessage: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '12px 20px',
    margin: '0 20px 20px',
    borderRadius: '4px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    animation: 'fadeIn 0.3s ease-out',
    position: 'relative',
    overflow: 'hidden',
  },
  successIcon: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginRight: '12px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: '16px',
    fontWeight: '500',
  },
  content: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcome: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#333',
  },
  dashboardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    margin: 0,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  loadingMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
  },
  errorMessage: {
    padding: '20px',
    textAlign: 'center',
    color: '#d32f2f',
    backgroundColor: '#ffebee',
    borderRadius: '4px',
  },
  retryButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    margin: '10px 5px 0 0',
  },
  loginButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    margin: '10px 0 0 5px',
  },
  errorActions: {
    display: 'flex',
    justifyContent: 'center',
  },
  listingsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  spaceCard: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#fff',
  },
  spaceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px',
  },
  spaceTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
    color: '#333',
  },
  spaceAddress: {
    fontSize: '14px',
    margin: '0 0 5px 0',
    color: '#666',
    fontStyle: 'italic',
  },
  spaceDetails: {
    margin: 0,
    color: '#666',
    fontSize: '14px',
  },
  spaceBadge: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  spaceStats: {
    display: 'flex',
    gap: '20px',
    marginBottom: '15px',
    padding: '10px 0',
    borderTop: '1px solid #eee',
    borderBottom: '1px solid #eee',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
  },
  statLabel: {
    fontSize: '12px',
    color: '#666',
    marginBottom: '3px',
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#333',
  },
  rentersList: {
    marginBottom: '15px',
  },
  rentersTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: '0 0 10px 0',
    color: '#333',
  },
  renterItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '10px',
    borderBottom: '1px solid #eee',
  },
  renterInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  renterName: {
    fontWeight: 'bold',
    fontSize: '14px',
    color: '#333',
  },
  renterEmail: {
    fontSize: '12px',
    color: '#666',
  },
  renterStatus: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  renterDate: {
    fontSize: '12px',
    color: '#666',
  },
  renterStatusBadge: {
    backgroundColor: '#2196f3',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
    marginTop: '3px',
  },
  spaceActions: {
    display: 'flex',
    gap: '10px',
  },
  editButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    flex: 1,
  },
  viewButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '15px',
  },
  placeholder: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  emptyState: {
    padding: '20px',
    textAlign: 'center',
    color: '#666',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
  },
  createButton: {
    backgroundColor: '#4caf50',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
  },
  debugButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    margin: '10px 0 0 5px',
  },
};

export default LenderDashboard;
