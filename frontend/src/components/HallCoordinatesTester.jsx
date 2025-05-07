import React, { useState } from 'react';
import { HALL_COORDINATES } from '../utils/hallCoordinates';
import { testHallCoordinate, testAllHallCoordinates } from '../utils/testHallCoordinates';

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '20px',
    color: '#FF6B00',
  },
  form: {
    marginBottom: '30px',
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
  },
  select: {
    padding: '10px',
    fontSize: '16px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    flex: '1',
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#FF6B00',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  secondaryButton: {
    padding: '10px 20px',
    backgroundColor: '#666',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  results: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f8f8',
    borderRadius: '4px',
    border: '1px solid #eee',
  },
  resultItem: {
    marginBottom: '15px',
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '4px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  label: {
    fontWeight: 'bold',
    marginRight: '10px',
  },
  success: {
    color: 'green',
  },
  error: {
    color: 'red',
  },
  warning: {
    color: 'orange',
  },
  progress: {
    margin: '20px 0',
    height: '8px',
    backgroundColor: '#eee',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B00',
    transition: 'width 0.3s ease',
  }
};

const HallCoordinatesTester = () => {
  const [selectedHall, setSelectedHall] = useState('');
  const [results, setResults] = useState(null);
  const [allResults, setAllResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const handleSelectChange = (e) => {
    setSelectedHall(e.target.value);
  };
  
  const handleTestSingle = async () => {
    if (!selectedHall) return;
    
    setLoading(true);
    setResults(null);
    
    try {
      const result = await testHallCoordinate(selectedHall);
      setResults({ [selectedHall]: result });
    } catch (error) {
      console.error('Error testing hall:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestAll = async () => {
    setLoading(true);
    setAllResults(null);
    
    const hallNames = Object.keys(HALL_COORDINATES);
    const total = hallNames.length;
    let completed = 0;
    const results = {};
    
    try {
      for (const hallName of hallNames) {
        results[hallName] = await testHallCoordinate(hallName);
        completed++;
        setProgress((completed / total) * 100);
        setAllResults({...results});
        // Add a delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1200));
      }
    } catch (error) {
      console.error('Error testing all halls:', error);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };
  
  const renderSingleResult = (hallName, result) => {
    if (!result) return null;
    
    return (
      <div style={styles.resultItem} key={hallName}>
        <h3>{hallName}</h3>
        {result.success ? (
          <>
            <div>
              <span style={styles.label}>Geocoded Address:</span> 
              {result.display_name}
            </div>
            <div>
              <span style={styles.label}>Hard-coded Coordinates:</span> 
              ({result.hardcoded.lat}, {result.hardcoded.lng})
            </div>
            <div>
              <span style={styles.label}>Geocoded Coordinates:</span> 
              ({result.geocoded.lat}, {result.geocoded.lng})
            </div>
            <div>
              <span style={styles.label}>Distance:</span> 
              <span style={
                result.distance < 50 ? styles.success : 
                result.distance < 200 ? styles.warning : 
                styles.error
              }>
                {result.distance.toFixed(2)} meters
              </span>
            </div>
          </>
        ) : (
          <div style={styles.error}>
            {result.message}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Hall Coordinates Tester</h1>
      <p>Test whether geocoding works correctly for Princeton residence halls.</p>
      
      <div style={styles.form}>
        <select 
          style={styles.select} 
          value={selectedHall} 
          onChange={handleSelectChange}
        >
          <option value="">Select a hall...</option>
          {Object.keys(HALL_COORDINATES).map(hall => (
            <option key={hall} value={hall}>{hall}</option>
          ))}
        </select>
        <button 
          style={styles.button} 
          onClick={handleTestSingle} 
          disabled={!selectedHall || loading}
        >
          Test Selected Hall
        </button>
        <button 
          style={styles.secondaryButton} 
          onClick={handleTestAll} 
          disabled={loading}
        >
          Test All Halls
        </button>
      </div>
      
      {loading && (
        <div>
          <p>Testing in progress... {progress > 0 ? `${Math.round(progress)}%` : ''}</p>
          {progress > 0 && (
            <div style={styles.progress}>
              <div style={{...styles.progressBar, width: `${progress}%`}} />
            </div>
          )}
        </div>
      )}
      
      {results && Object.keys(results).length > 0 && (
        <div style={styles.results}>
          <h2>Results:</h2>
          {Object.entries(results).map(([hallName, result]) => 
            renderSingleResult(hallName, result)
          )}
        </div>
      )}
      
      {allResults && Object.keys(allResults).length > 0 && (
        <div style={styles.results}>
          <h2>All Results:</h2>
          <p>
            Tested {Object.keys(allResults).length} halls. 
            Success: {Object.values(allResults).filter(r => r.success).length}, 
            Failed: {Object.values(allResults).filter(r => !r.success).length}
          </p>
          {Object.entries(allResults).map(([hallName, result]) => 
            renderSingleResult(hallName, result)
          )}
        </div>
      )}
    </div>
  );
};

export default HallCoordinatesTester; 