import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import Dialog from '@mui/material/Dialog';
import EditListingForm from './EditListingForm';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import StarIcon from '@mui/icons-material/Star';

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

const LenderListingDetails = () => {
  const [editModalOpen, setEditModalOpen] = useState(false);
  const fetchListingDetailsRef = useRef(null);
  const [actionLoading, setActionLoading] = useState({});
  const [actionError, setActionError] = useState({});
  const [partialModal, setPartialModal] = useState({ open: false, request: null });
  const [partialVolume, setPartialVolume] = useState('');
  const [partialError, setPartialError] = useState('');
  const [lenderReviews, setLenderReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  const handleOpenEditModal = () => setEditModalOpen(true);
  const handleCloseEditModal = (shouldRefresh = false) => {
    setEditModalOpen(false);
    if (shouldRefresh && fetchListingDetailsRef.current) {
      fetchListingDetailsRef.current();
    }
  };

  const navigate = useNavigate();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reservationRequests, setReservationRequests] = useState([]);

  useEffect(() => {
    const fetchListingDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!id) throw new Error('Invalid listing ID');

        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}`;
        const response = await fetch(apiUrl, { credentials: 'include' });
        if (!response.ok) throw new Error(await response.text());
        const data = await response.json();

        // Fetch reservation requests for this listing
        const requestsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/listings/${id}/reservation-requests`, {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
          }
        });
        if (!requestsResponse.ok) throw new Error('Failed to fetch reservation requests');
        const requestsData = await requestsResponse.json();
        setReservationRequests(requestsData);

        setListing({
          id: data.id,
          title: data.title,
          cost: data.cost,
          sq_ft: data.sq_ft,
          description: data.description,
          contractLength: data.contract_length_months,
          images: Array.isArray(data.images) && data.images.length > 0
            ? data.images
            : [data.image_url || '/assets/placeholder.jpg'],
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchListingDetailsRef.current = fetchListingDetails;
    fetchListingDetails();
    return () => console.log('Component unmounted');
  }, [id]);

  useEffect(() => {
    if (!listing || !listing.owner_id) return;
    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/lender-reviews/${listing.owner_id}`);
        if (resp.ok) {
          setLenderReviews(await resp.json());
        }
      } catch (err) {
        setLenderReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [listing]);

  const refreshRequests = async () => {
    try {
      const requestsResponse = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/listings/${id}/reservation-requests`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        }
      });
      if (!requestsResponse.ok) throw new Error('Failed to fetch reservation requests');
      const requestsData = await requestsResponse.json();
      setReservationRequests(requestsData);
    } catch (err) {
      // ignore
    }
  };

  const handleAction = async (requestId, action, approvedVolume) => {
    setActionLoading(l => ({ ...l, [requestId]: true }));
    setActionError(e => ({ ...e, [requestId]: null }));
    try {
      const reqObj = reservationRequests.find(r => r.request_id === requestId);
      const approvedVolume = (action === 'approved_full' && reqObj) ? reqObj.requested_space : approvedVolume;
      const body = action === 'approved_partial' || action === 'approved_full'
        ? { status: action, approved_space: approvedVolume }
        : { status: action };
      const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/reservation-requests/${requestId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(body)
      });
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update request');
      }
      await refreshRequests();
      if (fetchListingDetailsRef.current) fetchListingDetailsRef.current();

      // Show notification based on action type
      let notificationConfig = {
        show: true,
        message: '',
        type: ''
      };
      switch (action) {
        case 'approved_full':
          notificationConfig.message = 'Request fully approved successfully!';
          notificationConfig.type = 'success';
          break;
        case 'approved_partial':
          notificationConfig.message = 'Request partially approved successfully!';
          notificationConfig.type = 'partial';
          break;
        case 'rejected':
          notificationConfig.message = 'Request rejected successfully!';
          notificationConfig.type = 'error';
          break;
      }
      setNotification(notificationConfig);

      // Hide notification after 3 seconds
      setTimeout(() => {
        setNotification({ show: false, message: '', type: '' });
      }, 3000);

    } catch (err) {
      setActionError(e => ({ ...e, [requestId]: err.message }));
    } finally {
      setActionLoading(l => ({ ...l, [requestId]: false }));
    }
  };

  const openPartialModal = (request) => {
    setPartialModal({ open: true, request });
    setPartialVolume('');
    setPartialError('');
  };
  const closePartialModal = () => {
    setPartialModal({ open: false, request: null });
    setPartialVolume('');
    setPartialError('');
  };
  const handlePartialApprove = async () => {
    const req = partialModal.request;
    const max = Math.min(req.requested_space, listing.sq_ft);
    const vol = Number(partialVolume);
    if (!vol || isNaN(vol) || vol <= 0 || vol > max) {
      setPartialError(`Enter a valid volume (0 < volume ≤ ${max})`);
      return;
    }
    setPartialError('');
    await handleAction(req.request_id, 'approved_partial', vol);
    closePartialModal();
  };

  const renderError = () => (
    <div style={styles.errorContainer}>
      <h2>Error</h2>
      <p>{error}</p>
      <button style={styles.backButton} onClick={() => navigate('/lender-dashboard')}>
        &larr; Back to Dashboard
      </button>
    </div>
  );

  const renderLoading = () => (
    <div style={styles.loadingContainer}>
      <p>Loading listing details...</p>
    </div>
  );

  const renderNotFound = () => (
    <div style={styles.errorContainer}>
      <h2>Listing Not Found</h2>
      <p>Sorry, we couldn't find this listing.</p>
      <button style={styles.backButton} onClick={() => navigate('/lender-dashboard')}>
        &larr; Back to Dashboard
      </button>
    </div>
  );

  return (
    <div style={styles.container}>
      <Header title="Storage Space Details" />
      {notification.show && (
        <div style={{
          ...styles.notification,
          backgroundColor: notification.type === 'success' ? '#4caf50' : 
                          notification.type === 'partial' ? '#ff9800' : 
                          '#f44336',
        }}>
          {notification.message}
        </div>
      )}
      <div style={styles.content}>
        <button style={styles.backButton} onClick={() => navigate('/lender-dashboard')}>
          &larr; Back to Dashboard
        </button>
        {loading ? renderLoading() : error ? renderError() : !listing ? renderNotFound() : (
          <div style={styles.detailsContainer}>
            <div style={styles.imageSection}>
              <img
                src={listing.images[0]}
                alt={listing.title}
                style={styles.mainImage}
                onError={(e) => { e.target.src = '/assets/placeholder.jpg'; }}
              />
            </div>
            <div style={styles.infoSection}>
              <h2 style={styles.location}>{listing.title}</h2>
              <div style={styles.specs}>
                <div style={styles.specItem}><span style={styles.specLabel}>Cost:</span><span style={styles.specValue}>${listing.cost}/month</span></div>
                <div style={styles.specItem}><span style={styles.specLabel}>Size:</span><span style={styles.specValue}>{listing.sq_ft} sq ft</span></div>
              </div>
              <div style={styles.descriptionSection}>
                <h3>Description</h3>
                <p style={styles.description}>{listing.description}</p>
              </div>
              <div style={styles.interestedRenters}>
                <h3>Reservation Requests</h3>
                {reservationRequests.length === 0 ? <p>No reservation requests yet.</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8f8f8' }}>
                        <th style={{ padding: 8, border: '1px solid #eee' }}>Renter</th>
                        <th style={{ padding: 8, border: '1px solid #eee' }}>Status</th>
                        <th style={{ padding: 8, border: '1px solid #eee' }}>Requested Volume</th>
                        <th style={{ padding: 8, border: '1px solid #eee' }}>Approved Volume</th>
                        <th style={{ padding: 8, border: '1px solid #eee' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reservationRequests.map(req => (
                        <tr key={req.request_id}>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>{req.renter_username}</td>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>{getStatusLabel(req.status)}</td>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>{req.requested_space} sq ft</td>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>{req.approved_space ? `${req.approved_space} sq ft` : '-'}</td>
                          <td style={{ padding: 8, border: '1px solid #eee' }}>
                            {req.status === 'pending' && (
                              <>
                                <Button size="small" variant="contained" style={{ background: '#388e3c', color: 'white', marginRight: 6 }} disabled={actionLoading[req.request_id]} onClick={() => handleAction(req.request_id, 'approved_full')}>Approve Full</Button>
                                <Button size="small" variant="contained" style={{ background: '#1976d2', color: 'white', marginRight: 6 }} disabled={actionLoading[req.request_id]} onClick={() => openPartialModal(req)}>Approve Partial</Button>
                                <Button size="small" variant="contained" style={{ background: '#d32f2f', color: 'white' }} disabled={actionLoading[req.request_id]} onClick={() => handleAction(req.request_id, 'rejected')}>Reject</Button>
                                {actionError[req.request_id] && <div style={{ color: 'red', marginTop: 4 }}>{actionError[req.request_id]}</div>}
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {/* --- Lender Reviews Section --- */}
              <div style={{ marginTop: 32 }}>
                <h3>Lender Reviews</h3>
                {reviewsLoading ? <div>Loading reviews...</div> : (
                  lenderReviews.length === 0 ? <div>No reviews yet.</div> : (
                    <>
                      <div style={{ marginBottom: 16 }}>
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
                          <div key={i} style={{ background: '#f8f8f8', borderRadius: 6, padding: 12, marginBottom: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: '#fbc02d' }}>{[...Array(r.rating)].map((_, j) => <StarIcon key={j} fontSize="small" />)}</span>
                              <span style={{ fontWeight: 600 }}>{r.renter_username}</span>
                              <span style={{ color: '#888', fontSize: 12 }}>{new Date(r.created_at).toLocaleDateString()}</span>
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
        )}
        <Dialog open={editModalOpen} onClose={() => handleCloseEditModal(false)} maxWidth="md" fullWidth>
          {listing && (
            <EditListingForm
              listingId={listing.id}
              onClose={() => handleCloseEditModal(false)}
              onSuccess={() => handleCloseEditModal(true)}
            />
          )}
        </Dialog>
        {/* Partial Approval Modal */}
        <Dialog open={partialModal.open} onClose={closePartialModal} maxWidth="xs" fullWidth>
          <DialogTitle>Approve Partial Reservation</DialogTitle>
          <DialogContent>
            <div style={{ marginBottom: 12 }}>
              <b>Renter:</b> {partialModal.request?.renter_username}<br />
              <b>Requested Volume:</b> {partialModal.request?.requested_space} sq ft<br />
              <b>Max Allowed:</b> {partialModal.request ? Math.min(partialModal.request.requested_space, listing.sq_ft) : 0} sq ft
            </div>
            <TextField
              label="Approved Volume (sq ft)"
              type="number"
              fullWidth
              variant="outlined"
              value={partialVolume}
              onChange={e => setPartialVolume(e.target.value)}
              inputProps={{ min: 0.1, max: partialModal.request ? Math.min(partialModal.request.requested_space, listing.sq_ft) : 0, step: 0.1 }}
              style={{ marginBottom: 12 }}
            />
            {partialError && <div style={{ color: 'red', marginBottom: 8 }}>{partialError}</div>}
          </DialogContent>
          <DialogActions>
            <Button onClick={closePartialModal} color="secondary">Cancel</Button>
            <Button onClick={handlePartialApprove} variant="contained" color="primary">Approve</Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '300px',
  },
  loadingMessage: {
    fontSize: '1.2rem',
    color: '#666',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    minHeight: '300px',
    gap: '1rem',
  },
  errorMessage: {
    fontSize: '1.2rem',
    color: '#f44336',
  },
  retryButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
  descriptionSection: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  description: {
    margin: 0,
    lineHeight: '1.5',
    color: '#555',
  },
  container: {
    minHeight: '100vh',
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  backButton: {
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginBottom: '2rem',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '1rem',
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '2rem',
  },
  imageSection: {
    borderRadius: '8px',
    overflow: 'hidden',
  },
  mainImage: {
    width: '100%',
    height: 'auto',
    objectFit: 'cover',
  },
  infoSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
  },
  location: {
    margin: 0,
    fontSize: '1.8rem',
    color: '#333',
  },
  specs: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  specItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  specLabel: {
    color: '#666',
    fontSize: '0.9rem',
  },
  specValue: {
    fontSize: '1.1rem',
    fontWeight: '500',
  },
  lenderInfo: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
  },
  interestedRenters: {
    marginTop: '1rem',
  },
  rentersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  renterItem: {
    padding: '1rem',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  renterHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  renterName: {
    margin: 0,
    fontSize: '1.1rem',
  },
  renterStatus: {
    backgroundColor: '#4caf50',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  renterContact: {
    fontSize: '0.9rem',
    color: '#666',
    margin: 0,
  },
  renterDate: {
    fontSize: '0.9em',
    color: '#888',
    marginBottom: '6px'
  },
  actionSection: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1rem',
  },
  editButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '10px 15px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: '1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '40px',
  },
  renterEmail: {
    color: '#333',
    textDecoration: 'none',
  },
  notification: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    padding: '16px',
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
    zIndex: 1000,
    transition: 'all 0.3s ease',
  },
};

export default LenderListingDetails;
