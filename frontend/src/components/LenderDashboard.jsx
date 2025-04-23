import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import CreateListing from './CreateListing';
import { useNavigate, useLocation } from 'react-router-dom';
import EditListingForm from './EditListingForm';

// Modal wrapper for CreateListing to allow passing onClose/onSuccess
const CreateListingModal = ({ onClose, onSuccess }) => {
  return (
    <div style={{padding: 0, minWidth: 320, maxWidth: 520}}>
      <CreateListing onClose={onClose} onSuccess={onSuccess} modalMode={true} />
    </div>
  );
};

const LenderDashboard = ({ username }) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editListingId, setEditListingId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reservationRequests, setReservationRequests] = useState({});
  const [requestsLoading, setRequestsLoading] = useState({});
  const [lenderActionLoading, setLenderActionLoading] = useState({});
  const [lenderActionError, setLenderActionError] = useState({});
  const [partialModal, setPartialModal] = useState({ open: false, request: null, listingId: null });
  const [partialVolume, setPartialVolume] = useState('');
  const [partialError, setPartialError] = useState('');

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
          startDate: listing.start_date ? new Date(listing.start_date).toLocaleDateString() : '',
          endDate: listing.end_date ? new Date(listing.end_date).toLocaleDateString() : '',
          status: 'Active',
          interestedRenters,
          remaining_volume: listing.remaining_volume
        };
      }));

      setListedSpaces(formattedListings);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [location.key, username]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (!listedSpaces.length) return;
    listedSpaces.forEach(space => {
      fetchReservationRequests(space.id);
    });
    // eslint-disable-next-line
  }, [listedSpaces.length]);

  const fetchReservationRequests = async (listingId) => {
    setRequestsLoading(l => ({ ...l, [listingId]: true }));
    try {
      let apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl && typeof window !== 'undefined') {
        apiUrl = window.location.origin;
      } else if (!apiUrl) {
        apiUrl = 'http://localhost:8000';
      }
      const userType = sessionStorage.getItem('userType') || localStorage.getItem('userType') || 'lender';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || username || 'lender';
      const resp = await fetch(`${apiUrl}/api/listings/${listingId}/reservation-requests`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        }
      });
      if (resp.ok) {
        const data = await resp.json();
        setReservationRequests(r => ({ ...r, [listingId]: data }));
        fetchListings();
      }
    } catch (err) {
      // ignore
    } finally {
      setRequestsLoading(l => ({ ...l, [listingId]: false }));
    }
  };

  const handleLenderAction = async (requestId, action, approvedVolume, listingId) => {
    setLenderActionLoading(l => ({ ...l, [requestId]: true }));
    setLenderActionError(e => ({ ...e, [requestId]: null }));
    try {
      const userType = sessionStorage.getItem('userType') || 'lender';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || username || 'lender';
      const reqObj = reservationRequests[listingId]?.find(r => r.request_id === requestId);
      let finalApprovedVolume = approvedVolume;
      if (action === 'approved_full' && reqObj) {
        finalApprovedVolume = reqObj.requested_volume;
      }
      const body = action === 'approved_partial' || action === 'approved_full'
        ? { status: action, approved_volume: finalApprovedVolume }
        : { status: action };
      const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/reservation-requests/${requestId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update request');
      }
      fetchReservationRequests(listingId);
      fetchListings();
    } catch (err) {
      setLenderActionError(e => ({ ...e, [requestId]: err.message }));
    } finally {
      setLenderActionLoading(l => ({ ...l, [requestId]: false }));
    }
  };

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
      {deleteSuccess && (
        <div style={styles.successMessage}>
          <div style={styles.successIcon}>✓</div>
          <div style={styles.successText}>Listing deleted successfully!</div>
        </div>
      )}
      <div style={styles.content}>
        <div style={styles.welcome}>
          Welcome back, {username && username !== 'Unknown' ? username : 'Lender'}!
        </div>
        <div style={styles.dashboardContent}>
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Your Listed Spaces</h2>
              <button 
                style={styles.actionButton} 
                onClick={() => setCreateModalOpen(true)}
              >
                Add Storage Space
              </button>
            </div>
            {loading ? (
              <div style={styles.loadingMessage}>Loading your listings...</div>
            ) : error && !(error.includes('Network') || error.includes('sample data')) ? (
              <div style={styles.errorMessage}>
                <p>{error}</p>
                <div style={styles.errorActions}>
                  <button 
                    style={styles.retryButton}
                    onClick={() => window.location.reload()}
                  >
                    Retry
                  </button>
                  {error.includes('Authentication') && (
                    <button 
                      style={styles.loginButton}
                      onClick={() => {
                        sessionStorage.setItem('returnTo', '/lender-dashboard');
                        sessionStorage.setItem('userType', 'lender');
                        localStorage.setItem('userType', 'lender');
                        const frontendUrl = window.location.origin;
                        const redirectUri = encodeURIComponent(`${frontendUrl}/lender-dashboard`);
                        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                        const loginUrl = `${apiUrl}/api/auth/login?userType=lender&redirectUri=${redirectUri}`;
                        window.location.href = loginUrl;
                      }}
                    >
                      Login
                    </button>
                  )}
                  <button 
                    style={styles.createButton}
                    onClick={() => navigate('/create-listing')}
                  >
                    Create New Listing
                  </button>
                  <button 
                    style={styles.debugButton}
                    onClick={() => navigate('/auth-debug')}
                  >
                    Debug Auth
                  </button>
                </div>
              </div>
            ) : listedSpaces.length > 0 ? (
              <div style={{
  ...styles.listingsContainer,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '24px',
}}>

                {listedSpaces.map(space => (
                  <div key={space.id} style={styles.spaceCard}>
                    <div style={styles.spaceHeader}>
                      <div>
                        <h3 style={styles.spaceTitle}>{space.location || space.address || 'No Location Provided'}</h3>
                        {space.address && (
                          <p style={{ ...styles.spaceAddress, fontStyle: 'italic', color: '#666', margin: '0 0 6px 0' }}>{space.address}</p>
                        )}
                        <p style={styles.spaceDetails}>
                          ${space.cost}/month · {space.cubicFeet} cubic feet · {space.contractLength} months
                        </p>
                        <p style={styles.spaceDetails}>
                          Start: {space.startDate || 'N/A'} | End: {space.endDate || 'N/A'}
                        </p>
                        <div style={{ marginBottom: 8, color: '#4caf50', fontWeight: 600 }}>
                          Remaining Volume: {space.remaining_volume} cu ft
                        </div>
                      </div>
                      <div style={styles.spaceBadge}>
                        {space.status}
                      </div>
                    </div>
                    <div style={styles.spaceStats}>
                      <div style={styles.statItem}>
                        <span style={styles.statLabel}>Listed</span>
                        <span style={styles.statValue}>{space.dateCreated}</span>
                      </div>
                      <div style={styles.statItem}>
                        <span style={styles.statLabel}>Interested Renters</span>
                        <span style={styles.statValue}>{space.interestedRenters.length}</span>
                      </div>
                    </div>
                    {reservationRequests[space.id] && reservationRequests[space.id].length > 0 && (
                      <div style={styles.rentersList}>
                        <h4 style={styles.rentersTitle}>Interested Renters</h4>
                        {reservationRequests[space.id].map(req => {
                          let formattedDate = '';
                          let formattedTime = '';
                          if (req.created_at) {
                            const dateObj = new Date(req.created_at);
                            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                            const dd = String(dateObj.getDate()).padStart(2, '0');
                            const yy = String(dateObj.getFullYear()).slice(-2);
                            formattedDate = `${mm}/${dd}/${yy}`;
                            const hours = String(dateObj.getHours()).padStart(2, '0');
                            const minutes = String(dateObj.getMinutes()).padStart(2, '0');
                            formattedTime = `${hours}:${minutes}`;
                          }
                          return (
                            <div key={req.request_id} style={styles.renterItem}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={styles.renterName}>{req.renter_username}</span>
                                <span style={{ ...styles.renterDate, marginLeft: 8 }}>{formattedDate} {formattedTime}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                                <span style={styles.renterEmail}>{req.renter_username}@princeton.edu</span>
                                <span style={styles.renterStatusBadge}>{req.status.replace('_', ' ')}</span>
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <b>Requested:</b> {req.requested_volume} cu ft
                                {req.approved_volume && (
                                  <span style={{ marginLeft: 8 }}><b>Approved:</b> {req.approved_volume} cu ft</span>
                                )}
                              </div>
                              {req.status === 'pending' && (
                                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                                  <button
                                    style={{ ...styles.interestButton, backgroundColor: '#388e3c', minWidth: 80 }}
                                    disabled={lenderActionLoading[req.request_id]}
                                    onClick={() => handleLenderAction(req.request_id, 'approved_full', null, space.id)}
                                  >Approve Full</button>
                                  <button
                                    style={{ ...styles.interestButton, backgroundColor: '#fbc02d', minWidth: 80 }}
                                    disabled={lenderActionLoading[req.request_id]}
                                    onClick={() => {
                                      setPartialModal({ open: true, request: req, listingId: space.id });
                                      setPartialVolume('');
                                      setPartialError('');
                                    }}
                                  >Approve Partial</button>
                                  <button
                                    style={{ ...styles.interestButton, backgroundColor: '#d32f2f', minWidth: 80 }}
                                    disabled={lenderActionLoading[req.request_id]}
                                    onClick={() => handleLenderAction(req.request_id, 'rejected', null, space.id)}
                                  >Reject</button>
                                </div>
                              )}
                              {lenderActionError[req.request_id] && (
                                <span style={{ color: 'red', marginLeft: 8 }}>{lenderActionError[req.request_id]}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div style={styles.spaceActions}>
                      <button 
                        style={styles.editButton}
                        onClick={() => handleOpenEditModal(space.id)}
                      >
                        Edit Listing
                      </button>
                      <button 
                        style={styles.viewButton}
                        onClick={() => navigate(`/lender-dashboard/listing/${space.id}`)}
                      >
                        View Details
                      </button>
                      <button 
                        style={styles.deleteButton}
                        onClick={() => handleDeleteListing(space.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={styles.emptyState}>
                <p>You haven't listed any storage spaces yet.</p>
                <button 
                  style={styles.createButton}
                  onClick={() => setCreateModalOpen(true)}
                >
                  Create Your First Listing
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <Dialog 
        open={createModalOpen} 
        onClose={() => setCreateModalOpen(false)} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: { borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '18px 24px 10px 24px', background: '#fafbfc', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 20 }}>Add Storage Space</span>
          <button onClick={() => setCreateModalOpen(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
        </div>
        <div style={{ padding: 24 }}>
          {createModalOpen && (
            <CreateListingModal 
              onClose={() => setCreateModalOpen(false)}
              onSuccess={() => { setCreateModalOpen(false); fetchListings(); }}
            />
          )}
        </div>
      </Dialog>
      <Dialog 
        open={editModalOpen} 
        onClose={handleCloseEditModal} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          style: { borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #eee', padding: '18px 24px 10px 24px', background: '#fafbfc', borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 20 }}>Edit Listing</span>
          <button onClick={handleCloseEditModal} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>&times;</button>
        </div>
        <div style={{ padding: 24 }}>
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
        </div>
      </Dialog>
      <Dialog open={partialModal.open} onClose={() => setPartialModal({ open: false, request: null, listingId: null })} maxWidth="xs" fullWidth>
        <DialogTitle>Approve Partial Reservation</DialogTitle>
        <DialogContent>
          <div style={{ marginBottom: 12 }}>
            <b>Renter:</b> {partialModal.request?.renter_username}<br />
            <b>Requested Volume:</b> {partialModal.request?.requested_volume} cu ft<br />
            <b>Remaining Volume:</b> {listedSpaces.find(s => s.id === partialModal.listingId)?.remaining_volume ?? 0} cu ft
          </div>
          <TextField
            label="Approved Volume (cu ft)"
            type="number"
            fullWidth
            variant="outlined"
            value={partialVolume}
            onChange={e => setPartialVolume(e.target.value)}
            inputProps={{ min: 0.1, max: Math.min(partialModal.request?.requested_volume || 1000, listedSpaces.find(s => s.id === partialModal.listingId)?.remaining_volume ?? 0), step: 0.1 }}
            style={{ marginBottom: 12 }}
          />
          {partialError && <div style={{ color: 'red', marginBottom: 8 }}>{partialError}</div>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPartialModal({ open: false, request: null, listingId: null })} color="secondary">Cancel</Button>
          <Button
            onClick={async () => {
              const vol = Number(partialVolume);
              const maxAllowed = Math.min(partialModal.request?.requested_volume || 0, listedSpaces.find(s => s.id === partialModal.listingId)?.remaining_volume ?? 0);
              if (!partialVolume || isNaN(vol) || vol <= 0 || vol > maxAllowed) {
                setPartialError(`Enter a valid volume (0 < volume ≤ ${maxAllowed})`);
                return;
              }
              setPartialError('');
              await handleLenderAction(partialModal.request.request_id, 'approved_partial', vol, partialModal.listingId);
              setPartialModal({ open: false, request: null, listingId: null });
            }}
            variant="contained"
            style={{ background: '#388e3c', color: 'white', fontWeight: 700 }}
          >Approve</Button>
        </DialogActions>
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
  renterItem: {
    border: '1px solid #e6e6e6',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '10px',
    background: '#fcfcfc',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'flex-start',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
  interestButton: {
    backgroundColor: '#388e3c',
    color: 'white',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    flex: 1,
  },
};

export default LenderDashboard;
