import React, { useState, useEffect } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';
import boxes from '../assets/boxes.jpg';

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

const RenterDashboard = ({ username }) => {
  const navigate = useNavigate();
  const [interestedSpaces, setInterestedSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const openMap = () => {
    navigate('/map');
  };

  useEffect(() => {
    const fetchInterestedSpaces = async () => {
      try {
        // Use the API URL from environment variable with a fallback
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        console.log(`Fetching interested spaces from: ${apiUrl}/api/my-interested-listings`);
        
        // Get user information to include in headers
        const userType = sessionStorage.getItem('userType') || 'renter';
        console.log('Using username:', username, 'User type:', userType);
        
        const response = await fetch(`${apiUrl}/api/my-interested-listings`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'X-User-Type': userType,
            'X-Username': username || ''
          }
        });
        
        console.log('Interested spaces response status:', response.status);
        
        if (!response.ok) {
          // Try to read response text for better error message
          const errorText = await response.text();
          console.error('Error details:', errorText);
          throw new Error(`Failed to fetch interested spaces: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Fetched interested spaces:', data);
        setInterestedSpaces(data);
      } catch (err) {
        console.error('Error fetching interested spaces:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInterestedSpaces();
  }, [username]);

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
            <button style={styles.actionButton} onClick={() => navigate('/view-listings')}>
              View Storage Listings
            </button>
            <button style={styles.actionButton} onClick={openMap}>
              View Map
            </button>
          </div>
        </div>

        <div style={styles.section}>
          <h2>My Approved Spaces</h2>
          {loading ? (
            <div style={styles.placeholder}>Loading...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : interestedSpaces.filter(space => space.approval_type === 'approved_full' || space.approval_type === 'approved_partial').length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Cost/Month</th>
                    <th style={styles.th}>Lender</th>
                    <th style={styles.th}>Requested Space</th>
                    <th style={styles.th}>Approved Space</th>
                    <th style={styles.th}>Approval Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interestedSpaces.filter(space => space.approval_type === 'approved_full' || space.approval_type === 'approved_partial').map(space => (
                    <tr key={space.id}>
                      <td style={styles.td}>{space.title}</td>
                      <td style={styles.td}>${space.cost}</td>
                      <td style={styles.td}>{space.lender}</td>
                      <td style={styles.td}>{space.requested_space ? `${space.requested_space} sq ft` : '-'}</td>
                      <td style={styles.td}>{space.approved_space ? `${space.approved_space} sq ft` : '-'}</td>
                      <td style={styles.td}>{getStatusLabel(space.approval_type)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.status,
                          backgroundColor: getStatusColor(space.status)
                        }}>
                          {getStatusLabel(space.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button 
                          style={styles.viewButton}
                          onClick={() => navigate(`/listing/${space.id}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.placeholder}>
              You have no approved spaces yet.
            </div>
          )}
        </div>
        <div style={styles.section}>
          <h2>My Interested Spaces</h2>
          {loading ? (
            <div style={styles.placeholder}>Loading...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : interestedSpaces.filter(space => space.approval_type === 'pending').length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Title</th>
                    <th style={styles.th}>Cost/Month</th>
                    <th style={styles.th}>Lender</th>
                    <th style={styles.th}>Requested Space</th>
                    <th style={styles.th}>Approved Space</th>
                    <th style={styles.th}>Approval Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interestedSpaces.filter(space => space.approval_type === 'pending').map(space => (
                    <tr key={space.id}>
                      <td style={styles.td}>{space.title}</td>
                      <td style={styles.td}>${space.cost}</td>
                      <td style={styles.td}>{space.lender}</td>
                      <td style={styles.td}>{space.requested_space ? `${space.requested_space} sq ft` : '-'}</td>
                      <td style={styles.td}>{space.approved_space ? `${space.approved_space} sq ft` : '-'}</td>
                      <td style={styles.td}>{getStatusLabel(space.approval_type)}</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.status,
                          backgroundColor: getStatusColor(space.status)
                        }}>
                          {getStatusLabel(space.status)}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button 
                          style={styles.viewButton}
                          onClick={() => navigate(`/listing/${space.id}`)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={styles.placeholder}>
              You haven't shown interest in any storage spaces yet.
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
  viewButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  error: {
    color: 'red',
    marginBottom: '1rem',
  },
};

export default RenterDashboard;
