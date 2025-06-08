import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const CorrosionRiskAssessment = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [simulationLoading, setSimulationLoading] = useState(false);
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
      const response = await fetch(`${BACKEND_URL}/predict-corrosion`);
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
    setSimulationLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/simulate-corrosion`, {
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
    } finally {
      setSimulationLoading(false);
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
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Corrosion Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col justify-center items-center min-h-[400px] space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-600 border-t-cyan-400"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-pulse rounded-full h-8 w-8 bg-cyan-400 opacity-75"></div>
              </div>
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-slate-100">Evaluating Corrosion Risk</h3>
              <p className="text-slate-400 max-w-md">
                Analyzing water chemistry parameters to assess potential corrosion risks for infrastructure and equipment...
              </p>
              <div className="flex items-center justify-center space-x-1 text-cyan-400">
                <div className="animate-bounce">⚡</div>
                <span className="text-sm">Running corrosion models</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <p className="text-cyan-600 font-semibold">{error}</p>
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
          <div className="space-y-8">
            {/* Row 1: LSTM Architecture (Full Width) */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">LSTM Architecture</h3>
              <div className="flex items-center justify-center min-h-[500px]">
                <img 
                  src="/corrosion_architecture.png" 
                  alt="Corrosion LSTM Architecture Diagram" 
                  className="max-w-full max-h-[500px] object-contain rounded-lg"
                  style={{ filter: 'brightness(0.9)' }}
                />
              </div>
            </div>

            {/* Row 2: Confusion Matrix (Full Width) */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Confusion Matrix</h3>
              <div className="flex items-center justify-center min-h-[500px]">
                <img 
                  src="/corrosion_confusion_matrix.png" 
                  alt="Corrosion Model Confusion Matrix" 
                  className="max-w-full max-h-[500px] object-contain rounded-lg"
                  style={{ filter: 'brightness(0.9)' }}
                />
              </div>
            </div>

            {/* Row 3: Two Columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Row 3, Column 1: Forecasting Process */}
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
                      3. LSTM Processing
                    </p>
                  </div>
                  <div className="w-0.5 h-4 bg-cyan-500"></div>
                  <div className="w-full bg-slate-700/50 rounded-lg border-2 border-cyan-500 p-4">
                    <p className="text-xs text-center text-slate-100">
                      4. Generate Corrosion Risk
                    </p>
                  </div>
                </div>
              </div>

              {/* Row 3, Column 2: Sliding Window Approach */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
                <h3 className="text-lg font-semibold text-slate-100 mb-4">Sliding Window Approach</h3>
                <div className="space-y-2">
                  {/* Input sequence rows */}
                  <div className="grid grid-cols-6 gap-1">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="h-10 bg-slate-700/50 rounded-lg border-2 border-cyan-500 flex items-center justify-center">
                        <span className="text-xs text-slate-100">R{i + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i + 6} className="h-10 bg-slate-700/50 rounded-lg border-2 border-cyan-500 flex items-center justify-center">
                        <span className="text-xs text-slate-100">R{i + 7}</span>
                      </div>
                    ))}
                    {/* Prediction box */}
                    <div className="h-10 bg-slate-600/70 rounded-lg border-2 border-yellow-500 flex items-center justify-center">
                      <span className="text-xs text-slate-100 font-semibold">Risk</span>
                    </div>
                    {/* Empty cell for layout */}
                    <div></div>
                  </div>
                  {/* Arrow showing flow */}
                  <div className="flex items-center justify-center py-2">
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <span className="text-xs">Sliding Window</span>
                      <span className="text-lg">→</span>
                      <span className="text-xs">Corrosion Risk</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-4">
                  Analyzes 10 consecutive readings to predict corrosion risk level
                </p>
              </div>
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
                  className="w-full mt-4 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  onClick={simulateCorrosion}
                  disabled={simulationLoading}
                >
                  {simulationLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Running Simulation...</span>
                    </>
                  ) : (
                    'Simulate Corrosion Risk'
                  )}
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
                        <span className={factor.severity === 'high' ? 'text-cyan-500' : 'text-yellow-500'}>
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