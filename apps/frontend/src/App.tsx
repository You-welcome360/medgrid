import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState('Loading...');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response1 = await fetch('http://localhost:4000/health');
        const response2 = await fetch('http://localhost:4000/health');
        const response3 = await fetch('http://localhost:4000/health');

        const data1 = await response1.json();
        const data2 = await response2.json();
        const data3 = await response3.json();

        setStatus(data1.data.status);
        setStatus(data2.data.status);
        setStatus(data3.data.status);
      } catch {
        setStatus('Unavailable');
      }
    };

    void fetchHealth();
  }, []);

  return (
    <div>
      <h1>MEDGRID Frontend</h1>

      <p>
        Gateway Status: {status} <br />
        Coordination Status: {status} <br />
        Facility Status: {status}
      </p>
    </div>
  );
}

export default App;
