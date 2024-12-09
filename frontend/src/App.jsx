import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast, get } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import Map from './components/Map';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

const Dial = ({ value, min, max, optimal, unit, title, getStatus }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  const rotation = (percentage * 2.2) - 110;
  const status = getStatus(value);

  // Calculate color segments based on the parameter ranges
  const getSegmentGradient = () => {
    switch (title) {
      case "pH Level":
        return `conic-gradient(
          from 180deg,
          rgb(239, 68, 68) 20%, /* Red */
          rgb(34, 197, 94) 55%, /* Green */
          rgb(168, 85, 247) 80% /* Purple */
          
        )`;
      case "Turbidity":
        return `conic-gradient(
          from 180deg,
          rgb(34, 197, 94) 20%, /* Green */
          rgb(59, 130, 246) 40%, /* Blue */
          rgb(239, 68, 68) 50% /* Red */
        )`;
      case "TDS":
        return `conic-gradient(
          from 180deg,
          rgb(34, 197, 94) 20%, /* Green */
          rgb(59, 130, 246) 55%, /* Blue */
          rgb(239, 68, 68) 80% /* Red */
          )`;
      case "Temperature":
        return `conic-gradient(
          from 180deg,
          rgb(59, 130, 246) 20%, /* Blue */
          rgb(255, 255, 103) 55%, /* Yellow */
          rgb(239, 68, 68) 80% /* Red */
        )`;
      case "Conductivity":
        return `conic-gradient(
          from 180deg,
          rgb(59, 130, 246) 20%, /* Blue */
          rgb(34, 197, 94) 55%, /* Green */
          rgb(239, 68, 68) 80% /* Red */
        )`;
      default:
        return `conic-gradient(
          from 180deg,
          gray 0%,
          gray 100%
        )`;
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h3 className="text-xl font-semibold mb-4">{title}</h3>
      
      {/* Dial Container */}
      <div className="relative w-48 h-32 mb-4">
        {/* Dial Ring */}
        <div
          className="absolute w-48 h-48 rounded-full top-0 overflow-hidden"
          style={{
            background: 'transparent',
            border: 'none',
            WebkitMask: 'radial-gradient(transparent 55%, black 55%)',
            mask: 'radial-gradient(transparent 55%, black 55%)',
            clipPath: 'polygon(0 0.1%, 100% 0.1%, 100% 70%, 0 70%)',
            transform: 'rotate(0deg)',
          }}
        >
          <div
            className="w-full h-full"
            style={{
              background: getSegmentGradient(),
            }}
          />
        </div>

        {/* Pointer */}
        <div 
          className="absolute bottom-0 left-1/2 w-1.5 h-24 bg-black origin-bottom bottom-8"
          style={{ 
            transform: `translateX(-50%) rotate(${rotation}deg)`,
          }}
        />
      </div>

      {/* Value Display */}
      <div className="text-center">
        <p className="text-2xl font-bold mb-2">
          {value.toFixed(2)} {unit}
        </p>
        <p className={`text-lg ${status.color}`}>
          {status.status}
        </p>
      </div>
    </div>
  );
};

const App = () => {
  const [sensorData, setSensorData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('realtime'); 

  useEffect(() => {
    const sensorRef = ref(database, 'sensor_data');
    const recentDataQuery = query(sensorRef, orderByChild('timestamp'), limitToLast(100));

    const unsubscribe = onValue(recentDataQuery, (snapshot) => {
      const data = [];
      snapshot.forEach((childSnapshot) => {
        data.push({
          id: childSnapshot.key,
          ...childSnapshot.val()
        });
      });
      
      // Sort data by timestamp
      data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setSensorData(data);
      setLatestData(data[data.length - 1]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPredictions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('https://water-quality-ml-service.onrender.com/predict'); 
        const data = await response.json();
        setPredictions(data);
      } catch (error) {
        console.error('Error fetching predictions:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (sensorData.length > 0) {
      fetchPredictions();
    }
  }, [sensorData]);

  const RealtimeData = () => {
    // Status functions
    const getPhStatus = (ph) => {
      if (ph < 5) return { status: 'Acidic', color: 'text-red-600' };
      if (ph < 6.5 && ph > 5) return { status: 'Slightly Acidic', color: 'text-orange-500' };
      if (ph > 6.5 && ph < 7.5) return { status: 'Neutral', color: 'text-green-600' };
      if (ph < 9.0 && ph > 7.5) return { status: 'Slightly Basic', color: 'text-blue-500' };
      return { status: 'Basic', color: 'text-purple-600' };
    };

    const getTurbidityStatus = (turbidity) => {
      if (turbidity < 1) return { status: 'Excellent', color: 'text-green-600' };
      if (turbidity < 5) return { status: 'Good', color: 'text-blue-500' };
      if (turbidity < 10) return { status: 'Fair', color: 'text-orange-500' };
      return { status: 'Poor', color: 'text-red-600' };
    };

    const getTdsStatus = (tds) => {
      if (tds < 300) return { status: 'Excellent', color: 'text-green-600' };
      if (tds < 600) return { status: 'Good', color: 'text-blue-500' };
      if (tds < 900) return { status: 'Fair', color: 'text-orange-500' };
      return { status: 'Poor', color: 'text-red-600' };
    };

    const getTemperatureStatus = (temp) => {
      if (temp < 20) return { status: 'Cold', color: 'text-blue-600' };
      if (temp < 25) return { status: 'Cool', color: 'text-blue-600' };
      if (temp > 25 && temp < 30) return { status: 'Normal', color: 'text-green-600' };
      if (temp > 30 && temp < 35) return { status: 'Warm', color: 'text-orange-500' };
      return { status: 'Hot', color: 'text-red-600' };
    };

    const getConductivityStatus = (conductivity) => {
      if (conductivity < 200) return { status: 'Low', color: 'text-blue-500' };
      if (conductivity < 800) return { status: 'Normal', color: 'text-green-600' };
      return { status: 'High', color: 'text-red-600' };
    };

    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Real-time Sensor Data</CardTitle>
        </CardHeader>
        <CardContent>
          <DateTime latestData={latestData} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {latestData && (
              <>
                <Dial
                  value={latestData.ph}
                  min={0}
                  max={14}
                  optimal={7}
                  unit="pH"
                  title="pH Level"
                  getStatus={getPhStatus}
                />
                <Dial
                  value={latestData.turbidity}
                  min={0}
                  max={20}
                  optimal={2.5}
                  unit="NTU"
                  title="Turbidity"
                  getStatus={getTurbidityStatus}
                />
                <Dial
                  value={latestData.tds}
                  min={0}
                  max={1200}
                  optimal={450}
                  unit="ppm"
                  title="TDS"
                  getStatus={getTdsStatus}
                />
                <Dial
                  value={latestData.temperature}
                  min={0}
                  max={50}
                  optimal={25}
                  unit="°C"
                  title="Temperature"
                  getStatus={getTemperatureStatus}
                />
                <Dial
                  value={latestData.conductivity}
                  min={0}
                  max={1500}
                  optimal={500}
                  unit="μS/cm"
                  title="Conductivity"
                  getStatus={getConductivityStatus}
                />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const DataTable = () => {
    const downloadData = async () => {
      try {
        // Reference to the entire sensor_data node
        const sensorRef = ref(database, 'sensor_data');
        
        // Get all data once
        const snapshot = await get(sensorRef);
        const allData = [];
        
        snapshot.forEach((childSnapshot) => {
          allData.push({
            id: childSnapshot.key,
            ...childSnapshot.val()
          });
        });

        // Sort data by timestamp (newest to oldest)
        allData.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Convert to CSV format
        const headers = ['Timestamp', 'pH', 'Turbidity (NTU)', 'TDS (ppm)', 'Temperature (°C)', 'Conductivity (μS/cm)'];
        const csvData = allData.map(reading => [
          reading.timestamp,
          reading.ph.toFixed(2),
          reading.turbidity.toFixed(2),
          reading.tds.toFixed(2),
          reading.temperature.toFixed(2),
          reading.conductivity.toFixed(2)
        ]);
        
        // Create CSV content
        const csvContent = [
          headers.join(','),
          ...csvData.map(row => row.join(','))
        ].join('\n');
        
        // Create and trigger download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'complete_water_quality_data.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading data:', error);
        alert('Error downloading data. Please try again.');
      }
    };

    return (
      <Card className="mb-8">
        <CardHeader>
          <div className="flex flex-row justify-between items-center">
            <CardTitle>Historical Data</CardTitle>
            <button
              onClick={downloadData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Download Data
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-center">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">pH</th>
                  <th className="p-2">Turbidity (NTU)</th>
                  <th className="p-2">TDS (ppm)</th>
                  <th className="p-2">Temperature (°C)</th>
                  <th className="p-2">Conductivity (μS/cm)</th>
                </tr>
              </thead>
              <tbody>
                {sensorData.map((reading) => (
                  <tr key={reading.id} className="border-b">
                    <td className="p-2">{reading.timestamp}</td>
                    <td className="p-2">{reading.ph.toFixed(2)}</td>
                    <td className="p-2">{reading.turbidity.toFixed(2)}</td>
                    <td className="p-2">{reading.tds.toFixed(2)}</td>
                    <td className="p-2">{reading.temperature.toFixed(2)}</td>
                    <td className="p-2">{reading.conductivity.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const DataVisualizations = () => {
    // Clean data before combining
    const cleanPredictions = predictions ? {
        ...predictions,
        predictions: Object.fromEntries(
            Object.entries(predictions.predictions).map(([key, values]) => [
                key,
                values.map(v => v === null ? undefined : v)
            ])
        )
    } : null;

    // Separate real and predicted data
    const realData = sensorData;
    const predictedData = cleanPredictions ? cleanPredictions.timestamps.map((timestamp, i) => ({
      timestamp,
      ph: cleanPredictions.predictions.ph[i],
      turbidity: cleanPredictions.predictions.turbidity[i],
      tds: cleanPredictions.predictions.tds[i],
      temperature: cleanPredictions.predictions.temperature[i],
      conductivity: cleanPredictions.predictions.conductivity[i]
    })) : [];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Data Visualizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-8">
            {/* Column Headers */}
            <h2 className="text-xl font-bold mb-6">Real-time Data</h2>
            <h2 className="text-xl font-bold mb-6">Predicted Data</h2>

            {/* pH Charts */}
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">pH Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="ph" 
                    stroke="#8884d8"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">pH Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="ph" 
                    stroke="#ff0000"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Temperature Charts */}
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Temperature Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#82ca9d"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Temperature Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#ff0000"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* TDS Charts */}
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">TDS Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="tds" 
                    stroke="#ffc658"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">TDS Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="tds" 
                    stroke="#ff0000"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Turbidity Charts */}
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Turbidity Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="turbidity" 
                    stroke="#ff7300"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Turbidity Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="turbidity" 
                    stroke="#ff0000"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Conductivity Charts */}
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Conductivity Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="conductivity" 
                    stroke="#9c27b0"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Conductivity Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="conductivity" 
                    stroke="#ff0000"
                    strokeWidth={2}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const Navbar = () => (
    <nav className="bg-white shadow-lg mb-8">
      <div className="container mx-auto px-4">
        <div className="flex space-x-4">
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'realtime' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('realtime')}
          >
            Real-time Data
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'historical' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('historical')}
          >
            Historical Data
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium ${
              activeTab === 'visualizations' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-blue-600'
            }`}
            onClick={() => setActiveTab('visualizations')}
          >
            Data Visualizations
          </button>
        </div>
      </div>
    </nav>
  );

  const Footer = () => (
    <footer className="bg-white shadow-lg mt-8 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4">Created By</h3>
          <p className="text-gray-600 mb-4">
            Nitish Gogoi, Abhijit Das, Arnall Saikia, Rajarshi Dutta
          </p>
          <h3 className="text-lg font-semibold mb-4">Under the Guidance of</h3>
          <p className="text-gray-600">
            Prof. Dinesh Shankar Pegu
          </p>
        </div>
      </div>
    </footer>
  );

  const DateTime = () => {
    const [currentDateTime, setCurrentDateTime] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentDateTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }, []);

    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Date</h3>
          <p className="text-2xl">
            {currentDateTime.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Time</h3>
          <p className="text-2xl">
            {currentDateTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Last Updated</h3>
          <p className="text-2xl">
            {latestData ? (
              <>
                {new Date(latestData.timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
                {', '}
                {new Date(latestData.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </>
            ) : 'No data'}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-8">Water Quality Monitoring Dashboard</h1>
        <Navbar />
        
        {activeTab === 'realtime' && (
          <>
            <RealtimeData />
            <Map />
          </>
        )}
        {activeTab === 'historical' && <DataTable />}
        {activeTab === 'visualizations' && <DataVisualizations />}
        
        <Footer />
      </div>
    </div>
  );
};

export default App;
