import { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast, get } from 'firebase/database';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from "./components/ui/card";
import PropTypes from 'prop-types';
import GaugeComponent from 'react-gauge-component';
import CorrosionRiskAssessment from './components/CorrosionRiskAssessment';
import WaterQualityClassification from './components/WaterQualityClassification';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

// Add backend URL environment variable
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);

const Dial = ({ value, min, max, unit, title, getStatus }) => {
  const status = getStatus(value);

  // Get colors based on parameter type
  const getColors = () => {
    switch (title) {
      case "pH Level":
        return ['#ef4444', '#22c55e', '#a855f7'];
      case "Turbidity":
        return ['#22c55e', '#3b82f6', '#ef4444'];
      case "TDS":
        return ['#22c55e', '#3b82f6', '#ef4444'];
      case "Temperature":
        return ['#3b82f6', '#ffff67', '#ef4444'];
      case "Conductivity":
        return ['#3b82f6', '#22c55e', '#ef4444'];
      default:
        return ['#64748b', '#64748b', '#64748b'];
    }
  };

  const colors = getColors();

  return (
    <div className="flex flex-col items-center p-4">
      <h3 className="text-xl font-semibold mb-4 text-slate-100">{title}</h3>
      <div className="w-64 h-30">
        <GaugeComponent
          type="semicircle"
          arc={{
            width: 0.2,
            padding: 0.005,
            cornerRadius: 1,
            subArcs: [
              {
                limit: min + ((max - min) * 0.33),
                color: colors[0],
                showTick: true
              },
              {
                limit: min + ((max - min) * 0.66),
                color: colors[1],
                showTick: true
              },
              {
                limit: max,
                color: colors[2],
                showTick: true
              }
            ]
          }}
          pointer={{
            color: '#94a3b8',
            length: 0.8,
            width: 15,
            elastic: true
          }}
          labels={{
            valueLabel: {
              formatTextValue: value => "",
              style: { fill: '#f1f5f9' }
            },
            tickLabels: {
              type: "outer",
              ticks: [
                { value: min },
                { value: (max + min) / 2 },
                { value: max }
              ],
              style: { fill: '#94a3b8' }
            }
          }}
          value={value}
          minValue={min}
          maxValue={max}
        />
      </div>
      <div className="text-center mt-4">
        <p className="text-2xl font-bold text-slate-100">{value.toFixed(2)} {unit}</p>
        <p className={`text-lg mt-2 ${status.color}`}>
          {status.status}
        </p>
      </div>
    </div>
  );
};

Dial.propTypes = {
  value: PropTypes.number.isRequired,
  min: PropTypes.number.isRequired,
  max: PropTypes.number.isRequired,
  unit: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  getStatus: PropTypes.func.isRequired
};

const App = () => {
  const [sensorData, setSensorData] = useState([]);
  const [latestData, setLatestData] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [activeTab, setActiveTab] = useState('realtime'); 
  const [error, setError] = useState(null);
  const canvasRef = useRef(null);

  // Particle effect
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const particles = [];
    const particleCount = 100;

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.color = `rgba(${Math.floor(Math.random() * 100) + 100}, ${Math.floor(Math.random() * 100) + 150}, ${Math.floor(Math.random() * 55) + 200}, ${Math.random() * 0.5 + 0.2})`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const particle of particles) {
        particle.update();
        particle.draw();
      }

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

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
      setLatestData(data[0]);
    });

    return () => unsubscribe();
  }, []);

    const fetchPredictions = async () => {
      try {
      const response = await fetch(`${BACKEND_URL}/predict`);
        const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
        setPredictions(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Failed to fetch predictions. Please try again later.');
    }
  };

  useEffect(() => {
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
      <Card className="mb-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Real-time Sensor Data</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <DateTime latestData={latestData} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            {latestData && (
              <>
                <Dial
                  value={latestData.ph}
                  min={0}
                  max={14}
                  unit="pH"
                  title="pH Level"
                  getStatus={getPhStatus}
                />
                <Dial
                  value={latestData.turbidity}
                  min={0}
                  max={20}
                  unit="NTU"
                  title="Turbidity"
                  getStatus={getTurbidityStatus}
                />
                <Dial
                  value={latestData.tds}
                  min={0}
                  max={1200}
                  unit="ppm"
                  title="TDS"
                  getStatus={getTdsStatus}
                />
                <Dial
                  value={latestData.temperature}
                  min={0}
                  max={50}
                  unit="°C"
                  title="Temperature"
                  getStatus={getTemperatureStatus}
                />
                <Dial
                  value={latestData.conductivity}
                  min={0}
                  max={1500}
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
      <Card className="mb-8 bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex flex-row justify-between items-center">
            <CardTitle className="text-slate-100">Historical Data</CardTitle>
            <button
              onClick={downloadData}
              className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
            >
              Download Data
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="overflow-x-auto">
            <table className="min-w-full text-center border border-slate-700/50 rounded-lg">
              <thead>
                <tr className="bg-slate-800/50 backdrop-blur-sm">
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
                  <tr key={reading.id} className="border-b border-slate-700/50">
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
    if (error) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <p className="text-red-600 font-semibold">{error}</p>
        </div>
      );
    }

    if (!predictions) {
      return (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
        </div>
      );
    }

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
    const realData = [...sensorData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const predictedData = cleanPredictions ? cleanPredictions.timestamps.map((timestamp, i) => ({
      timestamp,
      ph: cleanPredictions.predictions.ph[i],
      turbidity: cleanPredictions.predictions.turbidity[i],
      tds: cleanPredictions.predictions.tds[i],
      temperature: cleanPredictions.predictions.temperature[i],
      conductivity: cleanPredictions.predictions.conductivity[i]
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : [];

    return (
      <>
        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm rounded-lg mb-8">
        <CardHeader>
            <CardTitle className="text-slate-100">Time Series Forecasting</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Column Headers */}
            <h2 className="hidden md:block text-xl font-bold mb-6 md:col-span-1">Real-time Data</h2>
            <h2 className="hidden md:block text-xl font-bold mb-6 md:col-span-1">Predicted Data</h2>

            {/* pH Charts */}
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">pH Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ph" 
                    stroke="#4338ca"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">pH Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Temperature Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#15803d"
                    strokeWidth={3}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Temperature Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">TDS Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">TDS Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Turbidity Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Turbidity Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Conductivity Trends</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={realData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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
            <div className="h-[250px] md:h-[300px]">
              <h3 className="text-lg font-semibold mb-4">Conductivity Predictions</h3>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" />
                  <XAxis 
                    dataKey="timestamp" 
                      tick={{ fontSize: 12, fill: "#94a3b8" }}
                    angle={-45}
                    textAnchor="end"
                      stroke="#94a3b8"
                  />
                  <YAxis 
                      tick={{ fill: "#94a3b8" }}
                      stroke="#94a3b8"
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
                  />
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

        <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-slate-100">Model Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* LSTM Architecture */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">LSTM Architecture</h3>
                <div className="flex flex-col items-center justify-center gap-4 min-h-[200px]">
                  <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                        <span className="text-xs text-slate-100 text-center">Input Layer<br/>(10 timesteps,<br/>5 features)</span>
        </div>
      </div>
                    <div className="hidden md:flex items-center justify-center text-2xl text-slate-100">→</div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                        <span className="text-xs text-slate-100 text-center">LSTM Layer<br/>(50 units)</span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center justify-center text-2xl text-slate-100">→</div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                        <span className="text-xs text-slate-100 text-center">Dense Layer<br/>(25 units)</span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center justify-center text-2xl text-slate-100">→</div>
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                        <span className="text-xs text-slate-100 text-center">Output Layer<br/>(5 features)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            {/* Sliding Window Visualization */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Sliding Window Approach</h3>
              <div className="relative overflow-x-auto">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex-1 h-12 bg-slate-700/50 rounded-lg border-2 border-cyan-500 flex items-center justify-center">
                      <span className="text-xs text-slate-100">R{i + 1}</span>
                    </div>
                  ))}
                  <div className="flex-1 h-12 bg-slate-700/50 rounded-lg border-2 border-cyan-500 flex items-center justify-center">
                    <span className="text-xs text-slate-100">Pred</span>
                  </div>
                </div>
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  <div className="relative h-full">
                    <div className="absolute top-0 left-0 w-[91%] h-full border-2 border-cyan-500 rounded-lg border-dashed"></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Analyzes 10 consecutive readings to predict the next risk level
              </p>
            </div>

              {/* Forecasting Process */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Forecasting Process</h3>
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-full bg-slate-700/50 rounded-lg border-2 border-cyan-500 p-4">
                    <p className="text-xs text-center text-slate-100">
                      1. Input Sequence (10 timesteps)
                    </p>
                  </div>
                  <div className="w-0.5 h-4 bg-cyan-500"></div>
                  <div className="w-full bg-slate-700/50 rounded-lg border-2 border-cyan-500 p-4">
                    <p className="text-xs text-center text-slate-100">
                      2. Feature Scaling & Normalization
                    </p>
                  </div>
                  <div className="w-0.5 h-4 bg-cyan-500"></div>
                  <div className="w-full bg-slate-700/50 rounded-lg border-2 border-cyan-500 p-4">
                    <p className="text-xs text-center text-slate-100">
                      3. Generate 24-hour Predictions
                    </p>
                  </div>
                </div>
              </div>

              {/* Model Performance */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Model Performance</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-100 mb-2">Training Metrics</h4>
                    <ul className="list-disc list-inside text-sm text-slate-400">
                      <li>Mean Squared Error: 0.0432</li>
                      <li>Root Mean Squared Error: 0.208</li>
                      <li>Mean Absolute Error: 0.187</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-100 mb-2">Model Capabilities</h4>
                    <ul className="list-disc list-inside text-sm text-slate-400">
                      <li>24-hour ahead predictions</li>
                      <li>Multi-parameter forecasting</li>
                      <li>Real-time updates</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Feature Analysis */}
              {/* <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Feature Analysis</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-100">pH Level</span>
                      <span className="text-sm text-slate-400">92%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-100">Temperature</span>
                      <span className="text-sm text-slate-400">88%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '88%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-100">TDS</span>
                      <span className="text-sm text-slate-400">85%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-100">Conductivity</span>
                      <span className="text-sm text-slate-400">82%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '82%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-100">Turbidity</span>
                      <span className="text-sm text-slate-400">78%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                </div>
              </div> */}
            </div>
          </CardContent>
        </Card>
      </>
    );
  };

  const Footer = () => (
    <footer className="bg-slate-900/50 backdrop-blur-sm shadow-lg mt-8 py-8 border border-slate-700/50 rounded-lg">
      <div className="container mx-auto px-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-4 text-slate-100">Created By</h3>
          <p className="text-sm md:text-base text-slate-400 mb-4">
            Nitish Gogoi, Abhijit Das, Arnall Saikia, Rajarshi Dutta
          </p>
          <h3 className="text-lg font-semibold mb-4 text-slate-100">Under the Guidance of</h3>
          <p className="text-sm md:text-base text-slate-400">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow">
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
        <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Time</h3>
          <p className="text-2xl">
            {currentDateTime.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </p>
        </div>
        <div className="p-4 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow">
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
    <div className="min-h-screen bg-gradient-to-br from-black to-slate-900 text-slate-100 relative overflow-hidden">
      {/* Background particle effect */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-30" />

      <div className="container mx-auto p-4 relative z-10">
        <h1 className="text-3xl md:text-6xl font-['Bebas_Neue'] mb-4 md:mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-wider font-bold">Water Quality Monitoring Dashboard</h1>
        
        <nav className="bg-slate-900/50 backdrop-blur-sm shadow-lg mb-8 border border-slate-700/50 rounded-lg overflow-x-auto">
          <div className="container mx-auto px-2 md:px-4">
            <div className="flex space-x-2 md:space-x-4">
              <button
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium whitespace-nowrap ${
                  activeTab === 'realtime' 
                    ? 'text-cyan-400 border-b-2 border-cyan-500' 
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('realtime')}
              >
                Real-time Data
              </button>
              <button
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium whitespace-nowrap ${
                  activeTab === 'table' 
                    ? 'text-cyan-400 border-b-2 border-cyan-500' 
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('table')}
              >
                Data Table
              </button>
              <button
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium whitespace-nowrap ${
                  activeTab === 'visualizations' 
                    ? 'text-cyan-400 border-b-2 border-cyan-500' 
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('visualizations')}
              >
                Time Series Forecasting
              </button>
              <button
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium whitespace-nowrap ${
                  activeTab === 'corrosion' 
                    ? 'text-cyan-400 border-b-2 border-cyan-500' 
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('corrosion')}
              >
                Corrosion Risk
              </button>
              <button
                className={`px-2 md:px-4 py-3 text-xs md:text-sm font-medium whitespace-nowrap ${
                  activeTab === 'quality' 
                    ? 'text-cyan-400 border-b-2 border-cyan-500' 
                    : 'text-slate-400 hover:text-slate-100'
                }`}
                onClick={() => setActiveTab('quality')}
              >
                Quality Grade
              </button>
            </div>
          </div>
        </nav>
        
        {activeTab === 'realtime' && (
          <>
            <RealtimeData />
          </>
        )}
        {activeTab === 'table' && <DataTable />}
        {activeTab === 'visualizations' && <DataVisualizations />}
        {activeTab === 'corrosion' && <CorrosionRiskAssessment />}
        {activeTab === 'quality' && <WaterQualityClassification />}
        
        <Footer />
      </div>
    </div>
  );
};

export default App;