import React, { useState, useEffect } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';

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
          <h2>My Interested Spaces</h2>
          {loading ? (
            <div style={styles.placeholder}>Loading...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : interestedSpaces.length > 0 ? (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Cost/Month</th>
                    <th style={styles.th}>Lender</th>
                    <th style={styles.th}>Requested Volume</th>
                    <th style={styles.th}>Approved Volume</th>
                    <th style={styles.th}>Approval Type</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Next Step</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {interestedSpaces.map(space => (
                    <tr key={space.id}>
                      <td style={styles.td}>{space.location}</td>
                      <td style={styles.td}>${space.cost}</td>
                      <td style={styles.td}>{space.lender}</td>
                      <td style={styles.td}>{space.requested_volume ? `${space.requested_volume} cu ft` : '-'}</td>
                      <td style={styles.td}>{space.approved_volume ? `${space.approved_volume} cu ft` : '-'}</td>
                      <td style={styles.td}>{
                        space.approval_type === 'approved_full' ? 'Full' :
                        space.approval_type === 'approved_partial' ? 'Partial' :
                        space.approval_type === 'rejected' ? 'Rejected' :
                        space.approval_type === 'pending' ? 'Pending' :
                        space.approval_type ? space.approval_type : '-'
                      }</td>
                      <td style={styles.td}>
                        <span style={{
                          ...styles.status,
                          backgroundColor: space.status === 'In Discussion' ? '#4caf50' : '#ff9800'
                        }}>
                          {space.status}
                        </span>
                      </td>
                      <td style={styles.td}>{space.nextStep}</td>
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
    backgroundColor: 'rgba(245, 124, 0, 0.1)',
  },
  content: {
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  welcome: {
    fontSize: '1.5rem',
    marginBottom: '2rem',
  },
  section: {
    backgroundColor: '#fff',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
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
