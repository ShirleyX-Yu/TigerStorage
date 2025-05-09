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
import StarIcon from '@mui/icons-material/Star';
import dorm_image from '../assets/dorm_image.jpg';
import { axiosInstance } from '../utils/auth';
import Alert from '@mui/material/Alert';

// Modal wrapper for CreateListing to allow passing onClose/onSuccess
const CreateListingModal = ({ onClose, onSuccess }) => {
  return (
    <div style={{padding: 0, minWidth: 320, maxWidth: 520}}>
      <CreateListing onClose={onClose} onSuccess={onSuccess} modalMode={true} />
    </div>
  );
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'approved_full':
      return 'Approved (Full)';
    case 'approved_partial':
      return 'Approved (Partial)';
    case 'pending':
      return 'Pending';
    case 'rejected':
      return 'Rejected';
    case 'cancelled_by_renter':
      return 'Cancelled by Renter';
    case 'expired':
      return 'Expired';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

// Helper to format YYYY-MM-DD as MM/DD/YYYY
function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${month}/${day}/${year}`;
}

const LenderDashboard = ({ username }) => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editListingId, setEditListingId] = useState(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [reservationRequests, setReservationRequests] = useState({});
  const [requestsLoading, setRequestsLoading] = useState({});
  const [lenderActionLoading, setLenderActionLoading] = useState({});
  const [lenderActionError, setLenderActionError] = useState({});
  const [lenderActionSuccess, setLenderActionSuccess] = useState({});
  const [partialModal, setPartialModal] = useState({ open: false, request: null, listingId: null });
  const [partialVolume, setPartialVolume] = useState('');
  const [partialError, setPartialError] = useState('');
  const [lenderReviews, setLenderReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

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

      const response = await axiosInstance.get('/api/my-listings', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        }
      });

      const data = response.data;

      const formattedListings = await Promise.all(data.map(async listing => {
        let interestedRenters = [];
        try {
          const rentersResponse = await axiosInstance.get(`/api/listings/${listing.id}/reservation-requests`, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'X-User-Type': userType,
              'X-Username': storedUsername
            }
          });
          
          const pendingRequests = rentersResponse.data.filter(req => req.status === 'pending');
          
          interestedRenters = pendingRequests.map(req => ({
            id: req.request_id,
            name: req.renter_username,
            email: `${req.renter_username}@princeton.edu`,
            dateInterested: req.created_at,
            status: 'pending',
            requested_space: req.requested_space
          }));
        } catch (e) {
          // ignore
        }

        return {
          id: listing.id,
          title: listing.title,
          address: listing.address || '',
          cost: listing.cost,
          sq_ft: listing.sq_ft,
          contractLength: listing.contract_length_months || 12,
          dateCreated: listing.created_at ? formatDate(listing.created_at.split('T')[0]) : '',
          startDate: listing.start_date ? formatDate(listing.start_date) : '',
          endDate: listing.end_date ? formatDate(listing.end_date) : '',
          status: 'Active',
          interestedRenters,
          remaining_space: listing.remaining_space,
          hall_name: listing.hall_name
        };
      }));

      setListedSpaces(formattedListings);
    } catch (err) {
      setError("We couldn't load your listings right now. Please try again later.");
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
      const resp = await axiosInstance.get(`/api/listings/${listingId}/reservation-requests`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        }
      });
      const data = resp.data;
      setReservationRequests(r => ({ ...r, [listingId]: data }));
    } catch (err) {
      // ignore
    } finally {
      setRequestsLoading(l => ({ ...l, [listingId]: false }));
    }
  };

  const handleLenderAction = async (requestId, action, approvedVolume, listingId) => {
    setLenderActionLoading(l => ({ ...l, [requestId]: true }));
    setLenderActionError(e => ({ ...e, [requestId]: null }));
    setLenderActionSuccess(s => ({ ...s, [requestId]: null }));
    try {
      const userType = sessionStorage.getItem('userType') || 'lender';
      const storedUsername = sessionStorage.getItem('username') || localStorage.getItem('username') || username || 'lender';
      const reqObj = reservationRequests[listingId]?.find(r => r.request_id === requestId);
      let finalApprovedVolume = approvedVolume;
      if (action === 'approved_full' && reqObj) {
        finalApprovedVolume = reqObj.requested_space;
      }
      const body = action === 'approved_partial' || action === 'approved_full'
        ? { status: action, approved_space: finalApprovedVolume }
        : { status: action };
      const resp = await axiosInstance.patch(`/api/reservation-requests/${requestId}`, body, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        }
      });
      // If no error thrown, success
      fetchReservationRequests(listingId);
      fetchListings();
      // Set success message
      let msg = '';
      if (action === 'approved_full' || action === 'approved_partial') msg = 'Approved successfully!';
      else if (action === 'rejected') msg = 'Rejected successfully!';
      if (msg) {
        setLenderActionSuccess(s => ({ ...s, [requestId]: msg }));
        setTimeout(() => setLenderActionSuccess(s => ({ ...s, [requestId]: null })), 3000);
      }
    } catch (err) {
      let errorMessage = "We couldn't process this action. Please try again.";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error.replace(/Error:\s*/, '');
      }
      setLenderActionError(e => ({ ...e, [requestId]: errorMessage }));
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

      const response = await axiosInstance.delete(`/api/listings/${listingId}`, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': userType,
          'X-Username': storedUsername
        }
      });

      // If no error thrown, success
      setListedSpaces(prev => prev.filter(space => space.id !== listingId));
      setDeleteSuccess(true);
      setTimeout(() => setDeleteSuccess(false), 3000);
    } catch (err) {
      let errorMessage = "We couldn't delete this listing.";
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error.replace(/Error:\s*/, '');
      }
      setError(errorMessage);
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeleteInProgress(false);
    }
  };

  // Fetch reviews for this lender
  useEffect(() => {
    const fetchReviews = async () => {
      if (!username) return;
      setReviewsLoading(true);
      try {
        const resp = await axiosInstance.get('/api/lender-reviews/' + username);
        const data = resp.data;
        setLenderReviews(data);
      } catch (err) {
        setLenderReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [username]);

  return (
    <div style={styles.container}>
      <div style={styles.backgroundImage} />
      <Header title="Lender Dashboard" />
      {deleteSuccess && (
        <div style={styles.successMessage}>
          <div style={styles.successIcon}>✓</div>
          <div style={styles.successText}>Listing deleted successfully!</div>
        </div>
      )}
      {editSuccess && (
        <div style={styles.successMessage}>
          <div style={styles.successIcon}>✓</div>
          <div style={styles.successText}>Listing updated successfully!</div>
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
                        const redirectUri = encodeURIComponent('/lender-dashboard');
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
                        <h3 style={styles.spaceTitle}>{space.title || 'No Title Provided'}</h3>
                        {space.hall_name && (
                          <div style={{ fontSize: '0.98rem', color: '#FF8F00', fontWeight: 500, marginBottom: 4 }}>
                            Residential Hall: {space.hall_name}
                          </div>
                        )}
                        <p style={styles.spaceDetails}>
                          ${space.cost}/month · {space.sq_ft} sq ft
                        </p>
                        <p style={styles.spaceDetails}>
                          Start: {space.startDate || 'N/A'} | End: {space.endDate || 'N/A'}
                        </p>
                        <div style={{ marginBottom: 8, color: '#4caf50', fontWeight: 600 }}>
                          Remaining Volume: {space.remaining_space} sq ft
                        </div>
                      </div>
                      <div style={styles.spaceBadge}>
                        {getStatusLabel(space.status)}
                      </div>
                    </div>
                    <div style={styles.spaceStats}>
                      <div style={styles.statItem}>
                        <span style={styles.statLabel}>Listed</span>
                        <span style={styles.statValue}>{space.dateCreated}</span>
                      </div>
                      <div style={styles.statItem}>
                        <span style={styles.statLabel}>Reservation Requests</span>
                        <span style={styles.statValue}>{space.interestedRenters.length}</span>
                      </div>
                    </div>
                    {reservationRequests[space.id] && reservationRequests[space.id].length > 0 && (
                      <div style={styles.rentersList}>
                        <h4 style={styles.rentersTitle}>Reservation Requests</h4>
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
                                <span style={styles.renterStatusBadge}>{getStatusLabel(req.status)}</span>
                              </div>
                              <div style={{ marginTop: 4 }}>
                                <b>Requested:</b> {req.requested_space} sq ft
                                {req.approved_space && (
                                  <span style={{ marginLeft: 8 }}><b>Approved:</b> {req.approved_space} sq ft</span>
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
                                  {lenderActionSuccess[req.request_id] && (
                                    <span style={{ color: 'green', marginLeft: 8 }}>{lenderActionSuccess[req.request_id]}</span>
                                  )}
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

          <div style={styles.section}>
            <h2 style={{ marginBottom: 16, fontSize: '20px', fontWeight: 'bold', color: '#333' }}>Your Reviews</h2>
            {reviewsLoading ? <div style={{ fontSize: '16px', color: '#666' }}>Loading reviews...</div> : (
              lenderReviews.length === 0 ? <div style={{ fontSize: '16px', color: '#666' }}>No reviews yet.</div> : (
                <>
                  <div style={{ marginBottom: 16, fontSize: '16px' }}>
                    <b>Average Rating: </b>
                    {(
                      lenderReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / lenderReviews.length
                    ).toFixed(1)}
                    <span style={{ color: '#fbc02d', marginLeft: 8 }}>
                      {[...Array(Math.round(lenderReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / lenderReviews.length))].map((_, i) => <StarIcon key={i} fontSize="small" />)}
                    </span>
                  </div>
                  <div>
                    {lenderReviews.map((r, i) => (
                      <div key={i} style={{ background: '#f8f8f8', borderRadius: 6, padding: 16, marginBottom: 14, fontSize: '15px', color: '#333' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ color: '#fbc02d' }}>{[...Array(r.rating)].map((_, j) => <StarIcon key={j} fontSize="small" />)}</span>
                          <span style={{ fontWeight: 600 }}>{r.renter_username}</span>
                          <span style={{ color: '#888', fontSize: 13 }}>{new Date(r.created_at).toLocaleDateString()}</span>
                          {r.listing_id && (
                            <span style={{ marginLeft: 12, fontSize: 13, color: '#333' }}>
                              for listing:
                              <a href={`/lender-dashboard/listing/${r.listing_id}`} style={{ color: '#1976d2', textDecoration: 'underline', marginLeft: 4 }}>
                                {r.title || `Listing #${r.listing_id}`}
                              </a>
                            </span>
                          )}
                        </div>
                        <div style={{ marginTop: 4 }}>{r.review_text}</div>
                      </div>
                    ))}
                  </div>
                </>
              )
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
                setEditSuccess(true);
                setTimeout(() => setEditSuccess(false), 3000);
                handleCloseEditModal();
                fetchListings();
              }}
            />
          )}
        </div>
      </Dialog>
      <Dialog 
        open={partialModal.open} 
        onClose={() => setPartialModal({ open: false, request: null, listingId: null })} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          style: { boxShadow: '0 8px 32px rgba(0,0,0,0.18)', borderRadius: 16, background: '#fff8f1' }
        }}
        BackdropProps={{ style: { backgroundColor: 'transparent' } }}
      >
        <DialogTitle style={{ background: '#FF6B00', color: 'white', fontWeight: 700, letterSpacing: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: '16px 24px', position: 'relative' }}>
          Approve Partial Reservation
          <button
            onClick={() => setPartialModal({ open: false, request: null, listingId: null })}
            style={{
              position: 'absolute',
              top: 12,
              right: 16,
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: 22,
              cursor: 'pointer',
              fontWeight: 700,
              lineHeight: 1
            }}
            aria-label="Close"
          >
            &times;
          </button>
        </DialogTitle>
        <DialogContent style={{ padding: 24, background: '#fff8f1' }}>
          <div style={{ marginBottom: 16 }}>
            <b>Renter:</b> {partialModal.request?.renter_username}<br />
            <b>Requested Volume:</b> {partialModal.request?.requested_space} sq ft<br />
            <b>Remaining Volume:</b> {listedSpaces.find(s => s.id === partialModal.listingId)?.remaining_space ?? 0} sq ft
          </div>
          <TextField
            label="Approved Volume (sq ft)"
            type="number"
            fullWidth
            variant="outlined"
            value={partialVolume}
            onChange={e => setPartialVolume(e.target.value)}
            inputProps={{ min: 0.1, max: Math.min(partialModal.request?.requested_space || 1000, listedSpaces.find(s => s.id === partialModal.listingId)?.remaining_space ?? 0), step: 0.1 }}
            style={{ marginBottom: 12, background: 'white', borderRadius: 6 }}
          />
          {partialError && <Alert severity="error" style={{ marginBottom: 8 }}>{partialError}</Alert>}
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px', background: '#fff8f1', borderBottomLeftRadius: 16, borderBottomRightRadius: 16 }}>
          <Button 
            onClick={() => setPartialModal({ open: false, request: null, listingId: null })} 
            style={{ color: '#888', fontWeight: 600 }}
            variant="text"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              const vol = Number(partialVolume);
              const maxAllowed = Math.min(partialModal.request?.requested_space || 0, listedSpaces.find(s => s.id === partialModal.listingId)?.remaining_space ?? 0);
              if (!partialVolume || isNaN(vol) || vol <= 0 || vol > maxAllowed) {
                setPartialError(`Enter a valid volume (0 < volume ≤ ${maxAllowed})`);
                return;
              }
              setPartialError('');
              await handleLenderAction(partialModal.request.request_id, 'approved_partial', vol, partialModal.listingId);
              setPartialModal({ open: false, request: null, listingId: null });
            }}
            style={{ background: '#FF6B00', color: 'white', fontWeight: 700 }}
            variant="contained"
          >
            Approve
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#fff',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundImage: `url(${dorm_image})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    opacity: 0.15,
    zIndex: 0,
  },
  content: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
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
  welcome: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#333',
  },
  dashboardContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3rem',
    width: '100%',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '8px',
    padding: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'relative',
    zIndex: 1,
    width: '100%',
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
