import React, { useState, useEffect, useCallback } from 'react';
import EditListingForm from './EditListingForm';
import CreateListing from './CreateListing';
import { logout } from '../utils/auth';

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #181818 0%, #232526 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
  },
  card: {
    background: 'rgba(24, 24, 24, 0.98)',
    borderRadius: '14px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.7)',
    padding: '2.5rem 2.5rem 2rem 2.5rem',
    maxWidth: '420px',
    width: '100%',
    textAlign: 'center',
    color: 'white',
    margin: '2rem 0',
  },
  gearIcon: {
    width: '42px',
    height: '42px',
    marginBottom: '0.5rem',
    color: '#b0b0b0',
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: 700,
    letterSpacing: '0.5px',
    marginBottom: '1rem',
    color: '#fff',
    textShadow: '0 2px 8px rgba(0,0,0,0.24)',
  },
  subtitle: {
    fontSize: '1.1rem',
    fontWeight: 400,
    color: '#e0e0e0',
    marginBottom: '0.5rem',
  },
};





const AdminPlatform = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editListingId, setEditListingId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingReportId, setLoadingReportId] = useState(null);
  const [actionType, setActionType] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ open: false, reportId: null, listingId: null, action: null, listingName: '' });
  const [completedActions, setCompletedActions] = useState({});

  const handleAccept = async (reportId, listingId) => {
    setLoadingReportId(reportId);
    setActionType('accept');
    try {
      let apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl && typeof window !== 'undefined') {
        apiUrl = window.location.origin;
      } else if (!apiUrl) {
        apiUrl = 'http://localhost:8000';
      }
      const response = await fetch(`${apiUrl}/api/listings/${listingId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': 'admin',
          'X-Username': 'admin',
        },
        body: JSON.stringify({ admin_action: 'accept', report_id: reportId })
      });
      if (!response.ok) {
        throw new Error(`Failed to accept listing (${response.status}): ${response.statusText}`);
      }
      // Refresh listings
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReportId(null);
      setActionType(null);
    }
  };

  const handleReject = async (reportId, listingId) => {
    setLoadingReportId(reportId);
    setActionType('reject');
    try {
      let apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl && typeof window !== 'undefined') {
        apiUrl = window.location.origin;
      } else if (!apiUrl) {
        apiUrl = 'http://localhost:8000';
      }
      const response = await fetch(`${apiUrl}/api/listings/${listingId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': 'admin',
          'X-Username': 'admin',
        },
        body: JSON.stringify({ admin_action: 'reject', report_id: reportId })
      });
      if (!response.ok) {
        throw new Error(`Failed to reject listing (${response.status}): ${response.statusText}`);
      }
      // Refresh listings
      setRefreshKey(k => k + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingReportId(null);
      setActionType(null);
    }
  };


  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      let apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl && typeof window !== 'undefined') {
        apiUrl = window.location.origin;
      } else if (!apiUrl) {
        apiUrl = 'http://localhost:8000';
      }
      const response = await fetch(`${apiUrl}/api/reported-listings`, {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache',
          'X-User-Type': 'admin',
          'X-Username': 'admin',
        },
      });
      if (!response.ok) {
        throw new Error(`Unable to load reported listings (${response.status}): ${response.statusText}`);
      }
      const data = await response.json();
      setListings(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refreshKey]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const handleOpenEditModal = (listingId) => {
    setEditListingId(listingId);
    setEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditListingId(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <>
      <div style={{ ...styles.container, alignItems: 'flex-start', justifyContent: 'flex-start', padding: '2rem 0' }}>
        <div style={{ ...styles.card, maxWidth: 1200, width: '98%', margin: '2rem auto', textAlign: 'left', background: 'rgba(24,24,24,0.98)' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: 8 }}>
            <button
              style={{
                background: '#f44336',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 16,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.13)',
                transition: 'background 0.2s',
              }}
              onClick={logout}
            >Logout</button>
          </div>
          <span role="img" aria-label="hammer and wrench" style={{
            display: 'block',
            fontSize: '2.7rem',
            marginBottom: '0.3rem',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.18))',
            textAlign: 'center',
          }}>🛠️</span>
          <h1 style={{ ...styles.title, textAlign: 'center' }}>Admin Dashboard</h1>
          <p style={{ ...styles.subtitle, textAlign: 'center' }}>Approve or reject flagged listings on TigerStorage.</p>
          {loading ? (
            <div style={{ color: '#bbb', textAlign: 'center', padding: '2rem' }}>Loading listings...</div>
          ) : error ? (
            <div style={{ color: '#f44336', textAlign: 'center', padding: '2rem' }}>{error}</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
              {listings.map(listing => (
                <div key={listing.report_id || listing.listing_id || listing.id} style={{ background: '#232526', borderRadius: 12, padding: '1.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.13)', color: '#fff', minHeight: 260 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{listing.location || 'No Location'}</h2>
                    </div>

                  </div>
                  <div style={{ fontSize: 15, margin: '0.5rem 0' }}>
                    ${listing.cost}/month · {listing.cubic_feet ?? listing.cubic_ft ?? 0} sq ft
                  </div>
                  <div style={{ fontSize: 14, color: '#b0b0b0', marginBottom: 10 }}>
                    Created: {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                  {/* Display report reason and status */}
                  <div style={{ fontSize: 15, color: '#ffb300', marginBottom: 8, fontWeight: 600 }}>
                    <span role="img" aria-label="flag">🚩</span> Report Reason: {listing.reason}
                  </div>
                  <div style={{ fontSize: 14, color: 
                    loadingReportId === listing.report_id
                      ? '#b0b0b0'
                      : listing.report_status === 'accepted'
                        ? '#2196f3'
                        : listing.report_status === 'rejected'
                          ? '#f44336'
                          : listing.report_status === 'pending'
                            ? '#ffd600'
                            : '#b0b0b0',
                    marginBottom: 10, fontWeight: 500 }}>
                    Report Status: {loadingReportId === listing.report_id
                      ? (actionType === 'accept'
                          ? 'Approving...'
                          : actionType === 'reject'
                            ? 'Rejecting...'
                            : 'Updating status...')
                      : listing.report_status}
                  </div>
                  {/* Interested renters section (optional, admin view) */}
                  {listing.interested_renters && listing.interested_renters.length > 0 && (
                    <div style={{ margin: '0.7rem 0 1rem 0' }}>
                      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Interested Renters</div>
                      {listing.interested_renters.map(renter => (
                        <div key={renter.id} style={{ background: '#181818', borderRadius: 6, padding: '7px 12px', marginBottom: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span style={{ fontWeight: 500 }}>{renter.username}</span>
                          <span style={{ fontSize: 13, color: '#b0b0b0' }}>{renter.email || renter.username + '@princeton.edu'}</span>
                          <span style={{ fontSize: 12, color: '#b0b0b0' }}>Status: {renter.status}</span>
                          <span style={{ fontSize: 12, color: '#b0b0b0' }}>Interested: {renter.dateInterested ? new Date(renter.dateInterested).toLocaleString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    {/* Admin approve/reject actions could go here */}
                    <button
                      style={{
                        background:
                          listing.report_status === 'accepted'
                            ? '#2196f3'
                            : listing.report_status === 'rejected'
                              ? '#888'
                              : (loadingReportId === listing.report_id && actionType === 'accept')
                                ? '#2196f3'
                                : (loadingReportId === listing.report_id && actionType === 'reject')
                                  ? '#888'
                                  : '#2196f3',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: 5,
                        cursor:
                          listing.report_status !== 'pending'
                            ? 'not-allowed'
                            : (loadingReportId === listing.report_id)
                              ? (actionType === 'accept' ? 'pointer' : 'not-allowed')
                              : 'pointer',
                        fontWeight: 600
                      }}
                      onClick={() => setConfirmModal({ open: true, reportId: listing.report_id, listingId: listing.listing_id, action: 'accept', listingName: listing.location || 'this listing' })}
                      disabled={listing.report_status !== 'pending' || listing.status === 'accepted' || listing.status === 'rejected' || loadingReportId === listing.report_id || completedActions[listing.report_id]}
                    >
                      {loadingReportId === listing.report_id && actionType === 'accept' ? 'Approving...' : (completedActions[listing.report_id] ? 'Approved' : 'Approve')}
                    </button>
                    <button
                      style={{
                        background:
                          listing.report_status === 'rejected'
                            ? '#f44336'
                            : listing.report_status === 'accepted'
                              ? '#888'
                              : (loadingReportId === listing.report_id && actionType === 'reject')
                                ? '#f44336'
                                : (loadingReportId === listing.report_id && actionType === 'accept')
                                  ? '#888'
                                  : '#f44336',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: 5,
                        cursor:
                          listing.report_status !== 'pending'
                            ? 'not-allowed'
                            : (loadingReportId === listing.report_id)
                              ? (actionType === 'reject' ? 'pointer' : 'not-allowed')
                              : 'pointer',
                        fontWeight: 600
                      }}
                      onClick={() => setConfirmModal({ open: true, reportId: listing.report_id, listingId: listing.listing_id, action: 'reject', listingName: listing.location || 'this listing' })}
                      disabled={listing.report_status !== 'pending' || listing.status === 'accepted' || listing.status === 'rejected' || loadingReportId === listing.report_id || completedActions[listing.report_id]}
                    >
                      {loadingReportId === listing.report_id && actionType === 'reject' ? 'Rejecting...' : (completedActions[listing.report_id] ? 'Rejected' : 'Reject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Edit modal */}
          {editModalOpen && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.46)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ background: '#232526', borderRadius: 14, padding: 32, minWidth: 340, maxWidth: 520, boxShadow: '0 4px 24px rgba(0,0,0,0.33)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 600, fontSize: 20, color: '#fff' }}>Edit Listing</span>
                  <button onClick={handleCloseEditModal} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#bbb' }}>&times;</button>
                </div>
                <EditListingForm listingId={editListingId} onClose={handleCloseEditModal} onSuccess={handleCloseEditModal} />
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.46)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: '#232526', borderRadius: 14, padding: 32, minWidth: 340, maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.33)' }}>
            <div style={{ fontWeight: 600, fontSize: 20, color: '#fff', marginBottom: 20 }}>
              Are you sure?
            </div>
            <div style={{ color: '#fff', marginBottom: 24, fontSize: 16 }}>
              {confirmModal.action === 'accept'
                ? <>This will mean <span style={{ color: '#ffd600', fontWeight: 700 }}>{confirmModal.listingName}</span> will be deleted off the map.</>
                : <>This will mean <span style={{ color: '#ffd600', fontWeight: 700 }}>{confirmModal.listingName}</span> will remain on the map.</>}
            </div>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'flex-end' }}>
              <button
                style={{ background: '#bbb', color: '#232526', border: 'none', padding: '8px 18px', borderRadius: 5, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => setConfirmModal({ open: false, reportId: null, listingId: null, action: null, listingName: '' })}
              >Cancel</button>
              <button
                style={{ background: confirmModal.action === 'accept' ? '#2196f3' : '#f44336', color: '#fff', border: 'none', padding: '8px 18px', borderRadius: 5, fontWeight: 600, cursor: 'pointer' }}
                onClick={() => {
                  setConfirmModal({ ...confirmModal, open: false });
                  if (confirmModal.action === 'accept') {
                    handleAccept(confirmModal.reportId, confirmModal.listingId);
                  } else {
                    handleReject(confirmModal.reportId, confirmModal.listingId);
                  }
                }}
              >Confirm</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminPlatform;
