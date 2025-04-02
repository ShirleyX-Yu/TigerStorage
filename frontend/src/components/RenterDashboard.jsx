import React, { useState, useEffect } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';

const RenterDashboard = ({ username }) => {
  const navigate = useNavigate();
  const [currentRentals, setCurrentRentals] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const openMap = () => {
    document.cookie = `returnTo=${encodeURIComponent('/renter')}; path=/`;
    window.location.href = '/ptonMap.html';
  };

  useEffect(() => {
    const fetchRentals = async () => {
      try {
        // First try to fetch current rentals
        const currentResponse = await fetch('http://localhost:8000/api/rentals/current', {
          credentials: 'include'
        });
        console.log('Current rentals response:', currentResponse);
        
        // Check the content type
        const contentType = currentResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const currentData = await currentResponse.json();
          if (!currentResponse.ok) {
            throw new Error(currentData.error || 'Failed to fetch current rentals');
          }
          setCurrentRentals(currentData);
        } else {
          console.error('Received non-JSON response:', await currentResponse.text());
          throw new Error('Server returned an invalid response');
        }

        // Then fetch rental history
        const historyResponse = await fetch('http://localhost:8000/api/rentals/history', {
          credentials: 'include'
        });
        console.log('History response:', historyResponse);
        
        // Check the content type
        const historyContentType = historyResponse.headers.get('content-type');
        if (historyContentType && historyContentType.includes('application/json')) {
          const historyData = await historyResponse.json();
          if (!historyResponse.ok) {
            throw new Error(historyData.error || 'Failed to fetch rental history');
          }
          setRentalHistory(historyData);
        } else {
          console.error('Received non-JSON response:', await historyResponse.text());
          throw new Error('Server returned an invalid response');
        }

        setError(null);
      } catch (err) {
        console.error('Error fetching rentals:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRentals();
  }, []);

  const RentalTable = ({ rentals }) => (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Location</th>
            <th style={styles.th}>Cost/Month</th>
            <th style={styles.th}>Space</th>
            <th style={styles.th}>Start Date</th>
            <th style={styles.th}>Lender</th>
            <th style={styles.th}>Status</th>
            <th style={styles.th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rentals.map(rental => (
            <tr key={rental.id}>
              <td style={styles.td}>{rental.location}</td>
              <td style={styles.td}>${rental.cost}</td>
              <td style={styles.td}>{rental.sq_ft} ft²</td>
              <td style={styles.td}>{rental.start_date}</td>
              <td style={styles.td}>{rental.lender}</td>
              <td style={styles.td}>
                <span style={{
                  ...styles.status,
                  backgroundColor: rental.status === 'active' ? '#4caf50' : '#9e9e9e'
                }}>
                  {rental.status}
                </span>
              </td>
              <td style={styles.td}>
                <button 
                  style={styles.viewButton}
                  onClick={() => navigate(`/listing/${rental.id}`)}
                >
                  View Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={styles.container}>
      <Header title="Renter Dashboard" />
      <div style={styles.content}>
        <div style={styles.welcome}>
          Welcome back, {username}!
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
          <h2>My Current Rentals</h2>
          {loading ? (
            <div style={styles.placeholder}>Loading current rentals...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : currentRentals.length > 0 ? (
            <RentalTable rentals={currentRentals} />
          ) : (
            <div style={styles.placeholder}>No active rentals</div>
          )}
        </div>

        <div style={styles.section}>
          <h2>Rental History</h2>
          {loading ? (
            <div style={styles.placeholder}>Loading rental history...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : rentalHistory.length > 0 ? (
            <RentalTable rentals={rentalHistory} />
          ) : (
            <div style={styles.placeholder}>No rental history</div>
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
    width: '100%'
  },
  content: {
    padding: '2rem',
    maxWidth: '1400px',
    margin: '0 auto',
    width: '100%'
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
  error: {
    color: '#f44336',
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
};

export default RenterDashboard;
