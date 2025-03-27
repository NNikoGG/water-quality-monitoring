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
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Corrosion Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="p-2 md:p-6">
          <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-lg">
            <div className="flex items-center gap-4 mb-6">
              <span className="text-4xl">{riskData && getRiskIcon(riskData.risk_level)}</span>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">Risk Level</h3>
                <p className={`text-2xl font-bold ${getRiskColor(riskData?.risk_level)}`}>
                  {riskData?.risk_level}
                </p>
              </div>
            </div>

            {/* Risk Scale */}
            <div className="mb-4">
              <div className="relative w-full h-4 bg-slate-700 rounded-full overflow-hidden">
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
                <span className="text-sm text-slate-100">0%</span>
                <span className="text-sm text-slate-100">50%</span>
                <span className="text-sm text-slate-100">100%</span>
              </div>
            </div>

            <p className="text-sm text-slate-400 mt-4">
              Last updated: {new Date(riskData?.timestamp).toLocaleString()}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Model Information */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Model Information</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Architecture Visualization */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Neural Network Architecture</h3>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                      <span className="text-xs text-slate-100 text-center">Input Layer<br/>(10 timesteps)</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-2xl text-slate-100">→</div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                      <span className="text-xs text-slate-100 text-center">LSTM Layer<br/>(64 units)</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-2xl text-slate-100">→</div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                      <span className="text-xs text-slate-100 text-center">LSTM Layer<br/>(32 units)</span>
                    </div>
                  </div>
                  <div className="hidden md:block text-2xl text-slate-100">→</div>
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 bg-slate-700/50 rounded-lg flex items-center justify-center border-2 border-cyan-500">
                      <span className="text-xs text-slate-100 text-center">Dense Layer<br/>(1 unit)</span>
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

            {/* Parameters Visualization */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Input Parameters</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {[
                  { symbol: 'pH', name: 'Acidity', color: 'red' },
                  { symbol: 'T', name: 'Temperature', color: 'yellow' },
                  { symbol: 'Tb', name: 'Turbidity', color: 'blue' },
                  { symbol: 'TDS', name: 'Total Dissolved Solids', color: 'green' },
                  { symbol: 'C', name: 'Conductivity', color: 'purple' }
                ].map((param) => (
                  <div key={param.symbol} className="flex flex-col items-center p-2 bg-slate-700/50 rounded-lg">
                    <div className="w-10 h-10 bg-slate-600/50 rounded-full flex items-center justify-center mb-1 border border-cyan-500">
                      <span className="text-sm text-slate-100">{param.symbol}</span>
                    </div>
                    <span className="text-xs text-slate-100 text-center">{param.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Update Frequency */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Real-time Updates</h3>
              <div className="flex items-center justify-center">
                <div className="w-20 h-20 rounded-full bg-slate-700/50 border-4 border-cyan-500 flex items-center justify-center relative">
                  <div className="absolute w-full h-full rounded-full border-4 border-transparent border-t-cyan-500 animate-spin"></div>
                  <span className="text-slate-100 text-center text-sm">30s<br/>Interval</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2 text-center">
                Predictions update every 30 seconds
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What If Analysis */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">What If Analysis</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Parameter Controls */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-100">Sequence Simulation</h3>
              
              {/* Time Step Selection */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-slate-100">Select Time Step</h4>
                <div className="flex space-x-2 overflow-x-auto pb-2">
                  {sequence.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => handleTimeStepChange(index)}
                      className={`px-3 py-1 rounded ${
                        selectedTimeStep === index
                          ? 'bg-cyan-600 text-white'
                          : 'bg-slate-700/50 text-slate-100 hover:bg-slate-600/50'
                      }`}
                    >
                      T{index + 1}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-slate-400">
                  Editing reading at time step T{selectedTimeStep + 1}
                </p>
              </div>

              {/* Parameter Sliders */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-100">pH Level</label>
                    <span className="text-sm text-slate-400">0 - 14</span>
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
                  <div className="text-center text-sm font-medium text-slate-100">
                    {simulatedParams.ph}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-100">Turbidity (NTU)</label>
                    <span className="text-sm text-slate-400">0 - 10</span>
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
                  <div className="text-center text-sm font-medium text-slate-100">
                    {simulatedParams.turbidity}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-100">TDS (ppm)</label>
                    <span className="text-sm text-slate-400">0 - 1000</span>
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
                  <div className="text-center text-sm font-medium text-slate-100">
                    {simulatedParams.tds}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-100">Temperature (°C)</label>
                    <span className="text-sm text-slate-400">0 - 100</span>
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
                  <div className="text-center text-sm font-medium text-slate-100">
                    {simulatedParams.temperature}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-100">Conductivity (μS/cm)</label>
                    <span className="text-sm text-slate-400">0 - 1500</span>
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
                  <div className="text-center text-sm font-medium text-slate-100">
                    {simulatedParams.conductivity}
                  </div>
                </div>

                <button
                  className="w-full mt-4 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                  onClick={simulateCorrosion}
                >
                  Simulate Corrosion Risk
                </button>
              </div>
            </div>

            {/* Simulation Results */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-100">Simulation Results</h3>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
                {/* Sequence Visualization */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-slate-100 mb-2">Sequence Overview</h4>
                  <div className="flex items-center space-x-1">
                    {sequence.map((reading, index) => (
                      <div
                        key={index}
                        className={`flex-1 h-20 ${
                          selectedTimeStep === index
                            ? 'bg-slate-600/50 border-2 border-cyan-500'
                            : 'bg-slate-700/50'
                        } rounded-lg p-1 text-xs text-center`}
                      >
                        <div className="font-medium text-slate-100">T{index + 1}</div>
                        <div className="text-slate-100">pH: {reading.ph.toFixed(1)}</div>
                        <div className="text-slate-100">TDS: {reading.tds}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl">{simulatedRisk && getRiskIcon(simulatedRisk.risk_level)}</span>
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">Predicted Risk Level</h3>
                    <p className={`text-2xl font-bold ${getRiskColor(simulatedRisk?.risk_level)}`}>
                      {simulatedRisk?.risk_level || 'No Risk'}
                    </p>
                  </div>
                </div>

                {/* Risk Scale */}
                <div className="mb-4">
                  <div className="relative w-full h-4 bg-slate-700 rounded-full overflow-hidden">
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
                    <span className="text-sm text-slate-100">0%</span>
                    <span className="text-sm text-slate-100">50%</span>
                    <span className="text-sm text-slate-100">100%</span>
                  </div>
                </div>

                <div className="space-y-4 mt-6">
                  <h4 className="font-semibold text-slate-100">Risk Factors</h4>
                  <ul className="space-y-2 text-sm text-slate-400">
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

      {/* Risk Criteria */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Risk Criteria</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-green-500 mb-2">Low Risk</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                  <li>pH: 6.8 - 7.5</li>
                  <li>TDS: {'<'} 350 ppm</li>
                  <li>Temperature: 26 - 29°C</li>
                  <li>Conductivity: {'<'} 700 μS/cm</li>
                  <li>No severe conditions present</li>
                </ul>
                <p className="mt-2 text-sm text-slate-400">
                  Optimal conditions with minimal corrosion potential
                </p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-yellow-500 mb-2">Medium Risk</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                  <li>pH: 6.5 - 6.8 or 7.5 - 8.0</li>
                  <li>TDS: 350 - 450 ppm</li>
                  <li>Temperature: Deviation of 1.5 - 3°C from optimal</li>
                  <li>Conductivity: 700 - 800 μS/cm</li>
                  <li>One severe or two moderate conditions</li>
                </ul>
                <p className="mt-2 text-sm text-slate-400">
                  Conditions require monitoring and potential intervention
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-red-500 mb-2">High Risk</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                  <li>pH: {'<'} 6.5</li>
                  <li>TDS: {'>'} 450 ppm</li>
                  <li>Temperature: Deviation {'>'} 3°C from optimal</li>
                  <li>Conductivity: {'>'} 800 μS/cm</li>
                  <li>Multiple severe conditions present</li>
                </ul>
                <p className="mt-2 text-sm text-slate-400">
                  Immediate attention required to prevent corrosion damage
                </p>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-slate-100 mb-2">Risk Factors</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-400">
                  <li>Severe pH drop ({'<'} 6.5)</li>
                  <li>High mineral content (TDS {'>'} 450)</li>
                  <li>Temperature instability</li>
                  <li>High conductivity ({'>'} 800 μS/cm)</li>
                  <li>Multiple parameter deviations</li>
                </ul>
                <p className="mt-2 text-sm text-slate-400">
                  Combinations of these factors increase corrosion probability
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CorrosionRiskAssessment; 