import React, { useState } from 'react';
import Header from './Header';
import { useNavigate } from 'react-router-dom';

const LenderDashboard = ({ username }) => {
  const navigate = useNavigate();

  // This will be replaced with actual API data
  const [listedSpaces] = useState([
    {
      id: 1,
      location: 'Princeton University Campus',
      cost: 50,
      cubicFeet: 100,
      contractLength: 3,
      dateCreated: '2025-03-20',
      status: 'Active',
      interestedRenters: [
        {
          id: 1,
          name: 'Alice Johnson',
          email: 'alicej@princeton.edu',
          dateInterested: '2025-03-22',
          status: 'Interested'
        },
        {
          id: 2,
          name: 'Bob Wilson',
          email: 'bwilson@princeton.edu',
          dateInterested: '2025-03-23',
          status: 'In Discussion'
        }
      ]
    },
    {
      id: 2,
      location: 'Nassau Street',
      cost: 75,
      cubicFeet: 150,
      contractLength: 4,
      dateCreated: '2025-03-21',
      status: 'Active',
      interestedRenters: []
    }
  ]);
  
  return (
    <div style={styles.container}>
      <Header title="Lender Dashboard" />
      <div style={styles.content}>
        <div style={styles.welcome}>
          Welcome back, {username}!
        </div>
        
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <h2>My Listed Spaces</h2>
            <button style={styles.actionButton} onClick={() => navigate('/create-listing')}>
              Add Storage Space
            </button>
          </div>
          {listedSpaces.length > 0 ? (
            <div>
              {listedSpaces.map(space => (
                <div key={space.id} style={styles.spaceCard}>
                  <div style={styles.spaceHeader}>
                    <div>
                      <h3 style={styles.spaceTitle}>{space.location}</h3>
                      <p style={styles.spaceDetails}>
                        ${space.cost}/month · {space.cubicFeet} cubic feet · {space.contractLength} months
                      </p>
                    </div>
                    <span style={styles.listingDate}>
                      Listed on: {new Date(space.dateCreated).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={styles.interestedSection}>
                    <h4 style={styles.interestedTitle}>
                      Interested Renters ({space.interestedRenters.length})
                    </h4>
                    {space.interestedRenters.length > 0 ? (
                      <div style={styles.tableContainer}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Name</th>
                              <th style={styles.th}>Email</th>
                              <th style={styles.th}>Date</th>
                              <th style={styles.th}>Status</th>
                              <th style={styles.th}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {space.interestedRenters.map(renter => (
                              <tr key={renter.id}>
                                <td style={styles.td}>{renter.name}</td>
                                <td style={styles.td}>{renter.email}</td>
                                <td style={styles.td}>
                                  {new Date(renter.dateInterested).toLocaleDateString()}
                                </td>
                                <td style={styles.td}>
                                  <span style={{
                                    ...styles.status,
                                    backgroundColor: renter.status === 'In Discussion' ? '#4caf50' : '#ff9800'
                                  }}>
                                    {renter.status}
                                  </span>
                                </td>
                                <td style={styles.td}>
                                  <button style={styles.contactButton}>
                                    Contact
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p style={styles.noInterest}>
                        No interested renters yet
                      </p>
                    )}
                  </div>

                  <div style={styles.spaceActions}>
                    <button 
                      style={styles.editButton}
                      onClick={() => navigate(`/edit-listing/${space.id}`)}
                    >
                      Edit Listing
                    </button>
                    <button style={styles.deleteButton}>
                      Delete Listing
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.placeholder}>
              No spaces listed yet. Start by adding your first storage space!
            </div>
          )}
        </div>

        <div style={styles.section}>
          <h2>Current Rentals</h2>
          <div style={styles.placeholder}>
            No active rentals
          </div>
        </div>

        <div style={styles.section}>
          <h2>Earnings Overview</h2>
          <div style={styles.placeholder}>
            No earnings yet
          </div>
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  placeholder: {
    color: '#666',
    marginBottom: '1rem',
  },
  actionButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
  },
  spaceCard: {
    border: '1px solid #eee',
    borderRadius: '4px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  spaceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  spaceTitle: {
    margin: '0 0 0.5rem 0',
    fontSize: '1.2rem',
    color: '#333',
  },
  spaceDetails: {
    margin: 0,
    color: '#666',
  },
  listingDate: {
    color: '#666',
    fontSize: '0.9rem',
  },
  interestedSection: {
    marginBottom: '1.5rem',
  },
  interestedTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.1rem',
    color: '#333',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: '0.75rem',
    backgroundColor: '#f5f5f5',
    borderBottom: '2px solid #eee',
    fontWeight: '500',
    color: '#333',
  },
  td: {
    padding: '0.75rem',
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
  contactButton: {
    backgroundColor: '#f57c00',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  spaceActions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid #eee',
  },
  editButton: {
    backgroundColor: '#2196f3',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#f44336',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500',
  },
  noInterest: {
    color: '#666',
    fontStyle: 'italic',
  },
};

export default LenderDashboard;
