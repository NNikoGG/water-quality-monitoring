import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const CorrosionRiskAssessment = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulatedParams, setSimulatedParams] = useState({
    ph: 7,
    turbidity: 1,
    tds: 300,
    temperature: 27,
    conductivity: 500
  });
  const [simulatedRisk, setSimulatedRisk] = useState(null);
  const [sequence, setSequence] = useState(Array(10).fill({
    ph: 7,
    turbidity: 1,
    tds: 300,
    temperature: 27,
    conductivity: 500,
    timestamp: new Date().toISOString()
  }));
  const [selectedTimeStep, setSelectedTimeStep] = useState(9); // Latest reading

  const fetchCorrosionRisk = async () => {
    try {
      const response = await fetch('http://localhost:8000/predict-corrosion');
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setRiskData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrosionRisk();
    const interval = setInterval(fetchCorrosionRisk, 30000);
    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (level) => {
    switch (level) {
      case 'Low':
        return 'text-green-600';
      case 'Medium':
        return 'text-yellow-600';
      case 'High':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getRiskIcon = (level) => {
    switch (level) {
      case 'Low':
        return '✓';
      case 'Medium':
        return '⚠';
      case 'High':
        return '⚡';
      default:
        return null;
    }
  };

  const handleParameterChange = (param, value) => {
    // Update both simulatedParams and the selected sequence step
    setSimulatedParams(prev => ({ ...prev, [param]: parseFloat(value) }));
    setSequence(prev => {
      const newSequence = [...prev];
      newSequence[selectedTimeStep] = {
        ...newSequence[selectedTimeStep],
        [param]: parseFloat(value),
        timestamp: new Date().toISOString()
      };
      return newSequence;
    });
  };

  const simulateCorrosion = async () => {
    try {
      const response = await fetch('http://localhost:8000/simulate-corrosion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sequence)
      });
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSimulatedRisk(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTimeStepChange = (step) => {
    setSelectedTimeStep(step);
    setSimulatedParams(sequence[step]);
  };

  const getRiskFactors = (params) => {
    const factors = [];
    
    // pH analysis
    if (params.ph < 6.5) {
      factors.push({
        message: 'Severe pH drop - High corrosion risk',
        severity: 'high'
      });
    } else if (params.ph < 6.8) {
      factors.push({
        message: 'Moderate pH drop - Increased corrosion risk',
        severity: 'medium'
      });
    }

    // TDS analysis
    if (params.tds > 450) {
      factors.push({
        message: 'Very high TDS level - High mineral content',
        severity: 'high'
      });
    } else if (params.tds > 350) {
      factors.push({
        message: 'Elevated TDS level - Moderate risk',
        severity: 'medium'
      });
    }

    // Conductivity analysis
    if (params.conductivity > 800) {
      factors.push({
        message: 'Very high conductivity - High corrosion risk',
        severity: 'high'
      });
    } else if (params.conductivity > 700) {
      factors.push({
        message: 'High conductivity - Moderate risk',
        severity: 'medium'
      });
    }

    // Temperature analysis
    const tempDiff = Math.abs(params.temperature - 27.5);
    if (tempDiff > 3) {
      factors.push({
        message: 'Temperature far from optimal range',
        severity: 'high'
      });
    } else if (tempDiff > 1.5) {
      factors.push({
        message: 'Temperature deviation from optimal',
        severity: 'medium'
      });
    }

    return factors;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-red-600 font-semibold">{error}</p>
      </div>
    );
  }

  const riskPercentage = riskData ? riskData.risk_probability * 100 : 0;

  return (
    <div className="space-y-8">
      {/* Current Risk Assessment */}
      <Card className="bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-black">Corrosion Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">{riskData && getRiskIcon(riskData.risk_level)}</span>
              <div>
                <h3 className="text-xl font-semibold text-black">Risk Level</h3>
                <p className={`text-2xl font-bold ${getRiskColor(riskData?.risk_level)}`}>
                  {riskData?.risk_level}
                </p>
              </div>
            </div>

            {/* Risk Scale */}
            <div className="mb-4">
              <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full transition-all duration-500 rounded-full"
                  style={{
                    width: `${riskPercentage}%`,
                    background: `${
                      riskPercentage > 70 ? '#ef4444' :
                      riskPercentage > 30 ? '#eab308' :
                      '#22c55e'
                    }`
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-sm text-black">0%</span>
                <span className="text-sm text-black">50%</span>
                <span className="text-sm text-black">100%</span>
              </div>
            </div>

            <p className="text-sm text-black/80 mt-4">
              Last updated: {new Date(riskData?.timestamp).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Information */}
      <Card className="bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-black">Model Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Architecture Visualization */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Neural Network Architecture</h3>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-indigo-100 rounded-lg flex items-center justify-center border-2 border-indigo-500">
                      <span className="text-xs text-black text-center">Input Layer<br/>(10 timesteps)</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-2xl text-black">→</div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-purple-100 rounded-lg flex items-center justify-center border-2 border-purple-500">
                      <span className="text-xs text-black text-center">LSTM Layer<br/>(64 units)</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-2xl text-black">→</div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-lg flex items-center justify-center border-2 border-blue-500">
                      <span className="text-xs text-black text-center">LSTM Layer<br/>(32 units)</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-2xl text-black">→</div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-green-100 rounded-lg flex items-center justify-center border-2 border-green-500">
                      <span className="text-xs text-black text-center">Dense Layer<br/>(1 unit)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sliding Window Visualization */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Sliding Window Approach</h3>
              <div className="relative overflow-x-auto">
                <div className="flex items-center space-x-1 mb-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex-1 h-12 bg-blue-100 rounded-lg border-2 border-blue-500 flex items-center justify-center">
                      <span className="text-xs text-black">R{i + 1}</span>
                    </div>
                  ))}
                  <div className="flex-1 h-12 bg-green-100 rounded-lg border-2 border-green-500 flex items-center justify-center">
                    <span className="text-xs text-black">Pred</span>
                  </div>
                </div>
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                  <div className="relative h-full">
                    <div className="absolute top-0 left-0 w-[91%] h-full border-2 border-blue-500 rounded-lg border-dashed"></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-black/80 mt-2">
                Analyzes 10 consecutive readings to predict the next risk level
              </p>
            </div>

            {/* Parameters Visualization */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Input Parameters</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { symbol: 'pH', name: 'Acidity', color: 'red' },
                  { symbol: 'T', name: 'Temperature', color: 'yellow' },
                  { symbol: 'Tb', name: 'Turbidity', color: 'blue' },
                  { symbol: 'TDS', name: 'Total Dissolved Solids', color: 'green' },
                  { symbol: 'C', name: 'Conductivity', color: 'purple' }
                ].map((param) => (
                  <div key={param.symbol} className="flex flex-col items-center p-2 bg-white/20 rounded-lg">
                    <div className={`w-10 h-10 bg-${param.color}-100 rounded-full flex items-center justify-center mb-1`}>
                      <span className="text-sm">{param.symbol}</span>
                    </div>
                    <span className="text-xs text-black text-center">{param.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Frequency */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Real-time Updates</h3>
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-blue-100 border-4 border-blue-500 flex items-center justify-center relative">
                  <div className="absolute w-full h-full rounded-full border-4 border-transparent border-t-blue-500 animate-spin"></div>
                  <span className="text-black text-center text-sm">30s<br/>Interval</span>
                </div>
              </div>
              <p className="text-xs text-black/80 mt-2 text-center">
                Predictions update every 30 seconds
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What If Analysis */}
      <Card className="bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-black">What If Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Parameter Controls */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-black">Sequence Simulation</h3>
              
              {/* Time Step Selection */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-black">Select Time Step</h4>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {sequence.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleTimeStepChange(index)}
                      className={`px-3 py-1 rounded ${
                        selectedTimeStep === index
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/20 text-black hover:bg-blue-100'
                      }`}
                    >
                      T{index + 1}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-black/60">
                  Editing reading at time step T{selectedTimeStep + 1}
                </p>
              </div>

              {/* Parameter Sliders */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-black">pH Level</label>
                    <span className="text-sm text-black/60">0 - 14</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="14" 
                    step="0.1"
                    value={simulatedParams.ph}
                    className="w-full"
                    onChange={(e) => handleParameterChange('ph', e.target.value)}
                  />
                  <div className="text-center text-sm font-medium text-black">
                    {simulatedParams.ph}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-black">Turbidity (NTU)</label>
                    <span className="text-sm text-black/60">0 - 10</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.1"
                    value={simulatedParams.turbidity}
                    className="w-full"
                    onChange={(e) => handleParameterChange('turbidity', e.target.value)}
                  />
                  <div className="text-center text-sm font-medium text-black">
                    {simulatedParams.turbidity}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-black">TDS (ppm)</label>
                    <span className="text-sm text-black/60">0 - 1000</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1000" 
                    step="10"
                    value={simulatedParams.tds}
                    className="w-full"
                    onChange={(e) => handleParameterChange('tds', e.target.value)}
                  />
                  <div className="text-center text-sm font-medium text-black">
                    {simulatedParams.tds}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-black">Temperature (°C)</label>
                    <span className="text-sm text-black/60">0 - 100</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    value={simulatedParams.temperature}
                    className="w-full"
                    onChange={(e) => handleParameterChange('temperature', e.target.value)}
                  />
                  <div className="text-center text-sm font-medium text-black">
                    {simulatedParams.temperature}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-black">Conductivity (μS/cm)</label>
                    <span className="text-sm text-black/60">0 - 1500</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="1500" 
                    step="10"
                    value={simulatedParams.conductivity}
                    className="w-full"
                    onChange={(e) => handleParameterChange('conductivity', e.target.value)}
                  />
                  <div className="text-center text-sm font-medium text-black">
                    {simulatedParams.conductivity}
                  </div>
                </div>

                <button
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  onClick={simulateCorrosion}
                >
                  Simulate Corrosion Risk
                </button>
              </div>
            </div>

            {/* Simulation Results */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-black">Simulation Results</h3>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
                {/* Sequence Visualization */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-black mb-2">Sequence Overview</h4>
                  <div className="flex items-center space-x-1">
                    {sequence.map((reading, index) => (
                      <div
                        key={index}
                        className={`flex-1 h-20 ${
                          selectedTimeStep === index
                            ? 'bg-blue-100 border-2 border-blue-500'
                            : 'bg-white/20'
                        } rounded-lg p-1 text-xs text-center`}
                      >
                        <div className="font-medium">T{index + 1}</div>
                        <div>pH: {reading.ph.toFixed(1)}</div>
                        <div>TDS: {reading.tds}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">{simulatedRisk && getRiskIcon(simulatedRisk.risk_level)}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-black">Predicted Risk Level</h3>
                    <p className={`text-2xl font-bold ${getRiskColor(simulatedRisk?.risk_level)}`}>
                      {simulatedRisk?.risk_level || 'No Risk'}
                    </p>
                  </div>
                </div>

                {/* Risk Scale */}
                <div className="mb-4">
                  <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full transition-all duration-500 rounded-full"
                      style={{
                        width: `${(simulatedRisk?.risk_probability || 0) * 100}%`,
                        background: `${
                          (simulatedRisk?.risk_probability || 0) > 0.7 ? '#ef4444' :
                          (simulatedRisk?.risk_probability || 0) > 0.3 ? '#eab308' :
                          '#22c55e'
                        }`
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-black">0%</span>
                    <span className="text-sm text-black">50%</span>
                    <span className="text-sm text-black">100%</span>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <h4 className="font-semibold text-black">Risk Factors</h4>
                  <ul className="space-y-2 text-sm text-black/80">
                    {getRiskFactors(simulatedParams).map((factor, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <span className={factor.severity === 'high' ? 'text-red-500' : 'text-yellow-500'}>
                          {factor.severity === 'high' ? '⚠' : '⚡'}
                        </span>
                        {factor.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorrosionRiskAssessment; 