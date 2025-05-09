import React, { useState, useEffect } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import boxes from '../assets/boxes.jpg';
import { axiosInstance } from '../utils/auth';
import { getCSRFToken } from '../utils/csrf';

const getStatusLabel = (status) => {
  if (!status) return '';
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
    case 'in_discussion':
      return 'In Discussion';
    default:
      return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'In Discussion':
      return '#4caf50'; // green
    case 'pending':
      return '#ff9800'; // orange
    case 'approved_full':
      return '#388e3c'; // green (darker)
    case 'approved_partial':
      return '#81c784'; // light green
    case 'rejected':
      return '#e53935'; // red
    case 'cancelled_by_renter':
      return '#757575'; // grey
    case 'expired':
      return '#9e9e9e'; // light grey
    default:
      return '#bdbdbd'; // default grey
  }
};

// Helper to format dates, handling multiple formats
function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  
  try {
    // Log date for debugging
    // console.log('Formatting date:', dateStr, 'Type:', typeof dateStr);
    
    // Handle date objects directly
    if (dateStr instanceof Date) {
      return dateStr.toLocaleDateString();
    }
    
    // If it's an object with a string representation
    if (typeof dateStr === 'object' && dateStr !== null) {
      if (dateStr.toString) {
        // console.log('Converting object to string:', dateStr.toString());
        dateStr = dateStr.toString();
      } else {
        // Try to extract properties that might contain the date
        for (const key of ['date', 'value', 'timestamp']) {
          if (dateStr[key]) {
            // console.log(`Found date in object property '${key}':`, dateStr[key]);
            return formatDate(dateStr[key]);
          }
        }
      }
    }
    
    // Handle ISO format dates (YYYY-MM-DD)
    if (typeof dateStr === 'string') {
      // First try parsing as ISO format
      if (dateStr.includes('-')) {
        const parts = dateStr.split('T')[0].split('-');
        if (parts.length === 3) {
          const [year, month, day] = parts;
          if (year && month && day) {
            return `${month}/${day}/${year}`;
          }
        }
      }
      
      // Also try direct date parsing
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString();
      }
    }
    
    // Handle timestamp numbers
    if (typeof dateStr === 'number' || (typeof dateStr === 'string' && !isNaN(Number(dateStr)))) {
      const timestamp = Number(dateStr);
      // Check if it looks like a reasonable timestamp
      if (timestamp > 1000000000000) { // Milliseconds timestamp
        const date = new Date(timestamp);
        return date.toLocaleDateString();
      } else if (timestamp > 1000000000) { // Seconds timestamp
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString();
      }
    }
    
    // Fallback - return as is
    // console.log('Using fallback date format');
    return String(dateStr);
  } catch (e) {
    // console.error('Error formatting date:', e, dateStr);
    return 'Invalid date';
  }
}

const RenterDashboard = ({ username }) => {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Fetch all reservation requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        // console.log('Fetching reservation requests...');
        
        // Make sure we have the API URL
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        // console.log('Using API URL:', apiUrl);
        
        const response = await axiosInstance.get(`${apiUrl}/api/my-reservation-requests`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        });
        
        if (response.data && Array.isArray(response.data)) {
          // console.log('Received reservation requests:', response.data);
          
          // Check for dates structure before processing
          if (response.data.length > 0) {
            const firstItem = response.data[0];
            // console.log('First item in API response:', firstItem);
            // console.log('Date properties in first item:', {
            //   directStartDate: firstItem.start_date,
            //   directEndDate: firstItem.end_date,
            //   nestedStartDate: firstItem.listing?.start_date,
            //   nestedEndDate: firstItem.listing?.end_date,
            //   hasListingProperty: 'listing' in firstItem,
            //   hasDirectStartDate: 'start_date' in firstItem,
            //   hasDirectEndDate: 'end_date' in firstItem
            // });
          }
          
          // Process the data to ensure all fields are properly converted
          const processedRequests = response.data.map(req => {
            // Make a copy of the entire object first to avoid mutation
            const processed = { ...req };
            
            // Handle numeric fields
            processed.cost = typeof req.cost === 'string' ? parseFloat(req.cost) : req.cost || 0;
            processed.requested_space = typeof req.requested_space === 'string' 
              ? parseFloat(req.requested_space) 
              : req.requested_space || 0;
            processed.approved_space = typeof req.approved_space === 'string' 
              ? parseFloat(req.approved_space) 
              : req.approved_space || 0;
            
            // Handle different date formats and locations in API response
            // 1. Direct dates from request
            if (req.start_date) {
              processed.start_date = req.start_date;
            }
            if (req.end_date) {
              processed.end_date = req.end_date;
            }
            
            // 2. Dates might be in the listing object
            if ((!processed.start_date || processed.start_date === null) && req.listing && req.listing.start_date) {
              processed.start_date = req.listing.start_date;
            }
            if ((!processed.end_date || processed.end_date === null) && req.listing && req.listing.end_date) {
              processed.end_date = req.listing.end_date;
            }
            
            // 3. Using date directly from the object in any location
            if (!processed.start_date) {
              // Try to find start_date anywhere in the object
              for (const key in req) {
                if (key.includes('start_date') && req[key]) {
                  processed.start_date = req[key];
                  break;
                }
              }
            }
            if (!processed.end_date) {
              // Try to find end_date anywhere in the object
              for (const key in req) {
                if (key.includes('end_date') && req[key]) {
                  processed.end_date = req[key];
                  break;
                }
              }
            }
            
            // Ensure these string fields exist
            processed.title = req.title || 'Unnamed Space';
            processed.lender_username = req.lender_username || req.owner_id || 'Unknown Lender';
            processed.status = req.status || 'unknown';
            
            // Debug the date values
            // console.log(`Request ${processed.request_id} dates:`, { 
            //   start_date: processed.start_date, 
            //   end_date: processed.end_date,
            //   original_start: req.start_date,
            //   original_end: req.end_date,
            //   listing_start: req.listing?.start_date,
            //   listing_end: req.listing?.end_date
            // });
            
            return processed;
          });
          
          // Log the first processed item
          // console.log('First processed request:', processedRequests[0]);
          
          setMyRequests(processedRequests);
        } else {
          setError('Unexpected response format from server');
        }
      } catch (err) {
        console.error('Error fetching reservation requests:', err);
        setError(err.message || 'Failed to load your spaces');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRequests();
  }, []);
  
  const openMap = () => {
    navigate('/map');
  };

  const removeRequest = async (listingId) => {
    try {
      setRemoving(true);
      // First find the pending reservation request for this listing
      const response = await axiosInstance.get('/api/my-reservation-requests', {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        const pendingRequest = response.data.find(req => 
          String(req.listing_id) === String(listingId) && req.status === 'pending');
        
        if (pendingRequest) {
          // Cancel the pending request
          await axiosInstance.patch(`/api/reservation-requests/${pendingRequest.request_id}`, {
            status: 'cancelled_by_renter'
          }, {
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCSRFToken()
            }
          });
          
          // Refresh the list after cancellation
          const updatedResponse = await axiosInstance.get('/api/my-reservation-requests', {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            }
          });
          
          if (updatedResponse.data && Array.isArray(updatedResponse.data)) {
            setMyRequests(updatedResponse.data);
          }
        } else {
          console.warn(`No pending reservation request found for listing ${listingId}`);
        }
      }
    } catch (err) {
      console.error('Error removing request:', err);
    } finally {
      setRemoving(false);
    }
  };

  // Filter requests by status
  const approvedRequests = myRequests.filter(req => 
    req.status === 'approved_full' || req.status === 'approved_partial');
  
  const pendingRequests = myRequests.filter(req => 
    req.status === 'pending');

  // Add debug logging for approved requests
  useEffect(() => {
    // (console.log commented out)
  }, [approvedRequests]);

  return (
    <div style={styles.container}>
      <div style={styles.backgroundImage} />
      <Header title="Renter Dashboard" />
      <div style={styles.content}>
        <div style={styles.welcome}>
          Welcome back, {username && username !== 'Unknown' ? username : 'Renter'}!
        </div>
        
        <div style={styles.section}>
          <h2>Available Storage Spaces</h2>
          <div style={styles.placeholder}>
            Browse available storage spaces near you!
          </div>
          <div style={styles.buttonContainer}>
            <button style={styles.actionButton} onClick={openMap}>
              Go to Map View <span style={{fontSize: '1.2em', marginLeft: 6}}>&rarr;</span>
            </button>
            <button style={styles.actionButton} onClick={() => navigate('/view-listings')}>
              Go to Grid View <span style={{fontSize: '1.2em', marginLeft: 6}}>&rarr;</span>
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h2>My Approved Spaces</h2>
          {loading ? (
            <div style={styles.placeholder}>
              Loading...
            </div>
          ) : error ? (
            <div style={styles.error}>
              Error loading approved spaces: {error}
            </div>
          ) : approvedRequests.length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Space</th>
                    <th style={styles.th}>Lender</th>
                    <th style={styles.th}>Cost</th>
                    <th style={styles.th}>Size</th>
                    <th style={styles.th}>Dates</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedRequests.map(request => (
                    <tr key={request.request_id}>
                      <td style={styles.td}>{request.title || 'Unnamed Listing'}</td>
                      <td style={styles.td}>{request.lender_username}</td>
                      <td style={styles.td}>${request.cost || 0}/month</td>
                      <td style={styles.td}>
                        {request.status === 'approved_partial' 
                          ? `${request.approved_space || 0}/${request.requested_space || 0} sq ft` 
                          : `${request.requested_space || 0} sq ft`}
                      </td>
                      <td style={styles.td}>
                        {(request.start_date || request.end_date) ? (
                          <div>
                            {request.start_date && 
                              <div>{`Start: ${formatDate(request.start_date)}`}</div>
                            }
                            {request.end_date && 
                              <div>{`End: ${formatDate(request.end_date)}`}</div>
                            }
                          </div>
                        ) : (
                          <span style={{ color: '#888', fontStyle: 'italic' }}>Dates not specified</span>
                        )}
                      </td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.status,
                          backgroundColor: getStatusColor(request.status)
                        }}>
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button 
                            style={styles.viewButton}
                            onClick={() => navigate(`/listing/${request.listing_id}`)}
                          >
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.placeholder}>
              You don't have any approved spaces yet.
            </div>
          )}
        </div>
        
        <div style={styles.section}>
          <h2>My Requested Spaces</h2>
          {loading ? (
            <div style={styles.placeholder}>
              Loading...
            </div>
          ) : error ? (
            <div style={styles.error}>
              Error loading requested spaces: {error}
            </div>
          ) : pendingRequests.length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Space</th>
                    <th style={styles.th}>Lender</th>
                    <th style={styles.th}>Cost</th>
                    <th style={styles.th}>Requested Size</th>
                    <th style={styles.th}>Date Requested</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingRequests.map(request => (
                    <tr key={request.request_id}>
                      <td style={styles.td}>{request.title || 'Unnamed Listing'}</td>
                      <td style={styles.td}>{request.lender_username}</td>
                      <td style={styles.td}>${request.cost || 0}/month</td>
                      <td style={styles.td}>{request.requested_space || 0} sq ft</td>
                      <td style={styles.td}>{new Date(request.created_at).toLocaleDateString()}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.status,
                          backgroundColor: getStatusColor(request.status)
                        }}>
                          {getStatusLabel(request.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={styles.actionButtons}>
                          <button 
                            style={styles.viewButton}
                            onClick={() => navigate(`/listing/${request.listing_id}`)}
                          >
                            View Details
                          </button>
                          <button 
                            style={styles.removeButton}
                            onClick={() => removeRequest(request.listing_id)}
                            disabled={removing}
                          >
                            {removing ? 'Cancelling...' : 'Cancel Request'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.placeholder}>
              You don't have any pending space requests.
            </div>
          )}
        </div>
      </div>
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
    backgroundImage: `url(${boxes})`,
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
  welcome: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
    color: '#333',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: '8px',
    padding: '30px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    position: 'relative',
    zIndex: 1,
    marginBottom: '3rem',
  },
  placeholder: {
    color: '#666',
    marginBottom: '1rem',
  },
  buttonContainer: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem'
  },
  actionButton: {
    padding: '0.75rem 1.5rem',
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    ':hover': {
      backgroundColor: '#e65100',
      transform: 'scale(1.05)',
      boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    }
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
  },
  th: {
    textAlign: 'left',
    padding: '1rem',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #eee',
    fontWeight: '500',
    color: '#333',
  },
  td: {
    padding: '1rem',
    borderBottom: '1px solid #eee',
    color: '#666',
  },
  status: {
    display: 'inline-block',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  viewButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    width: '100%',
  },
  removeButton: {
    backgroundColor: '#d32f2f',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
    width: '100%',
    '&:disabled': {
      backgroundColor: '#ccc',
      cursor: 'not-allowed',
    },
  },
  error: {
    color: 'red',
    marginBottom: '1rem',
  },
};

export default RenterDashboard;
