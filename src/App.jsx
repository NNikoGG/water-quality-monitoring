// App.jsx
import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  };
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

const App = () => {
  const [sensorData, setSensorData] = useState([]);
  const [latestData, setLatestData] = useState(null);

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
      data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
      
      setSensorData(data);
      setLatestData(data[data.length - 1]);
    });

    return () => unsubscribe();
  }, []);

  const RealtimeData = () => (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Real-time Sensor Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {latestData && (
            <>
              <div className="p-4 bg-blue-100 rounded-lg">
                <h3 className="text-lg font-semibold">pH Level</h3>
                <p className="text-2xl">{latestData.ph.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-green-100 rounded-lg">
                <h3 className="text-lg font-semibold">Turbidity</h3>
                <p className="text-2xl">{latestData.turbidity.toFixed(2)} NTU</p>
              </div>
              <div className="p-4 bg-yellow-100 rounded-lg">
                <h3 className="text-lg font-semibold">TDS</h3>
                <p className="text-2xl">{latestData.tds.toFixed(2)} ppm</p>
              </div>
              <div className="p-4 bg-red-100 rounded-lg">
                <h3 className="text-lg font-semibold">Temperature</h3>
                <p className="text-2xl">{latestData.temperature.toFixed(2)} °C</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const DataTable = () => (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Historical Data</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2">Timestamp</th>
                <th className="p-2">pH</th>
                <th className="p-2">Turbidity (NTU)</th>
                <th className="p-2">TDS (ppm)</th>
                <th className="p-2">Temperature (°C)</th>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );

  const DataVisualizations = () => (
    <Card>
      <CardHeader>
        <CardTitle>Data Visualizations</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* pH Chart */}
          <div className="h-[300px]">
            <h3 className="text-lg font-semibold mb-4">pH Trends</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ph" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Temperature Chart */}
          <div className="h-[300px]">
            <h3 className="text-lg font-semibold mb-4">Temperature Trends</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="temperature" stroke="#82ca9d" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* TDS Chart */}
          <div className="h-[300px]">
            <h3 className="text-lg font-semibold mb-4">TDS Trends</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="tds" stroke="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Turbidity Chart */}
          <div className="h-[300px]">
            <h3 className="text-lg font-semibold mb-4">Turbidity Trends</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sensorData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="turbidity" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Water Quality Monitoring Dashboard</h1>
      <RealtimeData />
      <DataTable />
      <DataVisualizations />
    </div>
  );
};

export default App;