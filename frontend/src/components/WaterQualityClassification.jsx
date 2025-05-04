import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

const WaterQualityClassification = () => {
  const [qualityData, setQualityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [simulatedParams, setSimulatedParams] = useState({
    ph: 7,
    turbidity: 1,
    tds: 300,
    temperature: 27,
    conductivity: 500
  });
  const [simulatedQuality, setSimulatedQuality] = useState(null);

  const fetchQualityData = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/predict-quality`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setQualityData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQualityData();
    const interval = setInterval(fetchQualityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A':
        return 'text-green-600';
      case 'B':
        return 'text-blue-600';
      case 'C':
        return 'text-yellow-600';
      case 'D':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getGradeDescription = (grade) => {
    switch (grade) {
      case 'A':
        return 'Excellent Quality - Meets all quality standards with optimal parameters';
      case 'B':
        return 'Good Quality - Parameters within acceptable ranges';
      case 'C':
        return 'Fair Quality - Some parameters need attention';
      case 'D':
        return 'Poor Quality - Immediate attention required';
      default:
        return 'Unknown Quality';
    }
  };

  const handleParameterChange = (parameter, value) => {
    setSimulatedParams(prevParams => ({
      ...prevParams,
      [parameter]: parseFloat(value)
    }));
  };

  const simulateQuality = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/simulate-quality`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...simulatedParams,
          timestamp: new Date().toISOString()
        })
      });
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      setSimulatedQuality(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const getParameterAnalysis = (params) => {
    const analysis = [];
    if (params.ph < 6.8 || params.ph > 7.5) {
      analysis.push({
        parameter: 'pH',
        message: params.ph < 6.8 ? 'Below acceptable range' : 'Above acceptable range',
        status: params.ph < 6.8 || params.ph > 7.5 ? 'concerning' : 'acceptable'
      });
    }
    if (params.turbidity > 1.0) {
      analysis.push({
        parameter: 'Turbidity',
        message: 'Above acceptable range',
        status: 'concerning'
      });
    }
    if (params.tds > 300) {
      analysis.push({
        parameter: 'TDS',
        message: 'Above acceptable range',
        status: 'concerning'
      });
    }
    if (params.temperature < 25 || params.temperature > 28) {
      analysis.push({
        parameter: 'Temperature',
        message: params.temperature < 25 ? 'Below acceptable range' : 'Above acceptable range',
        status: params.temperature < 25 || params.temperature > 28 ? 'concerning' : 'acceptable'
      });
    }
    if (params.conductivity > 500) {
      analysis.push({
        parameter: 'Conductivity',
        message: 'Above acceptable range',
        status: 'concerning'
      });
    }
    return analysis;
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

  return (
    <div className="space-y-8">
      {/* Current Quality Grade */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Water Quality Grade</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2 text-slate-100">Current Grade</h3>
              <p className={`text-6xl font-bold ${getGradeColor(qualityData?.grade)}`}>
                {qualityData?.grade}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg text-slate-100">
                {getGradeDescription(qualityData?.grade)}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Last updated: {new Date(qualityData?.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Grade Probabilities */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-slate-100">Grade Probabilities</h4>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(qualityData?.grade_probabilities || {}).map(([grade, probability]) => (
                <div key={grade} className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                  <div className={`text-2xl font-bold ${getGradeColor(grade)} mb-2`}>
                    {grade}
                  </div>
                  <div className="text-lg text-slate-100">
                    {(probability * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
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
            {/* Random Forest Architecture */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Random Forest Architecture</h3>
              <div className="flex flex-col items-center space-y-4">
                <div className="grid grid-cols-3 gap-4 w-full">
                  {/* Sample Decision Trees */}
                  {[1, 2, 3].map((tree) => (
                    <div key={tree} className="relative">
                      <div className="w-full aspect-square bg-slate-700/50 rounded-lg border-2 border-cyan-500 flex items-center justify-center p-2">
                        <div className="text-xs text-center text-slate-100">
                          Decision<br/>Tree {tree}
                        </div>
                      </div>
                      {/* Tree Branches */}
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="w-0.5 h-4 bg-cyan-500"></div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Voting Mechanism */}
                <div className="w-full bg-slate-700/50 rounded-lg border-2 border-cyan-500 p-4 mt-6">
                  <p className="text-xs text-center text-slate-100">
                    Majority Voting System<br/>
                    (100 Trees Total)
                  </p>
                </div>
              </div>
            </div>

            {/* Classification Process */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Classification Process</h3>
              <div className="flex flex-col justify-center min-h-[200px]">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-cyan-500">
                    <span className="text-sm text-slate-100 text-center">Input<br/>Parameters</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-cyan-500"></div>
                  <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-cyan-500">
                    <span className="text-sm text-slate-100 text-center">Feature<br/>Analysis</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-cyan-500"></div>
                  <div className="w-20 h-20 bg-slate-700/50 rounded-full flex items-center justify-center border-2 border-cyan-500">
                    <span className="text-sm text-slate-100 text-center">Grade<br/>Decision</span>
                  </div>
                </div>
                <div className="text-xs text-slate-400 text-center mt-4">
                  Real-time classification every 30 seconds
                </div>
              </div>
            </div>

            {/* Feature Importance Visualization */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Feature Importance</h3>
              <div className="space-y-3">
                {Object.entries(qualityData?.feature_importance || {}).map(([feature, importance]) => (
                  <div key={feature} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-100">{feature}</span>
                      <span className="text-sm text-slate-100">{(importance * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{ width: `${importance * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Performance */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Model Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-100 mb-2">Training Data</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-100">Samples:</span>
                      <span className="text-xs text-slate-100">15,000+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-100">Features:</span>
                      <span className="text-xs text-slate-100">5</span>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-slate-100 mb-2">Model Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-100">Trees:</span>
                      <span className="text-xs text-slate-100">100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-slate-100">Max Depth:</span>
                      <span className="text-xs text-slate-100">10</span>
                    </div>
                  </div>
                </div>
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
              <h3 className="text-lg font-semibold text-slate-100">Adjust Parameters</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <label className="text-sm font-medium text-slate-100">pH Level</label>
                    <span className="text-sm text-slate-400">6.0 - 8.5</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="14" 
                    step="0.1"
                    defaultValue="7"
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
                    defaultValue="1"
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
                    defaultValue="300"
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
                    <span className="text-sm text-slate-400">15 - 35</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="0.1"
                    defaultValue="27"
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
                    defaultValue="500"
                    className="w-full"
                    onChange={(e) => handleParameterChange('conductivity', e.target.value)}
                  />
                  <div className="text-center text-sm font-medium text-slate-100">
                    {simulatedParams.conductivity}
                  </div>
                </div>

                <button
                  className="w-full mt-4 px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors"
                  onClick={simulateQuality}
                >
                  Simulate Quality Grade
                </button>
              </div>
            </div>

            {/* Simulation Results */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-100">Simulation Results</h3>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2 text-slate-100">Predicted Grade</h3>
                    <p className={`text-6xl font-bold ${getGradeColor(simulatedQuality?.grade)}`}>
                      {simulatedQuality?.grade || '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg text-slate-100">
                      {simulatedQuality?.grade ? getGradeDescription(simulatedQuality.grade) : 'Adjust parameters to simulate'}
                    </p>
                  </div>
                </div>

                {/* Grade Probabilities */}
                {simulatedQuality && (
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-slate-100">Predicted Probabilities</h4>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(simulatedQuality.grade_probabilities || {}).map(([grade, probability]) => (
                        <div key={grade} className="bg-slate-700/50 backdrop-blur-sm rounded-lg p-4">
                          <div className={`text-2xl font-bold ${getGradeColor(grade)} mb-2`}>
                            {grade}
                          </div>
                          <div className="text-lg text-slate-100">
                            {(probability * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Parameter Analysis */}
                <div className="space-y-4 mt-6">
                  <h4 className="font-semibold text-slate-100">Parameter Analysis</h4>
                  <div className="space-y-2">
                    {getParameterAnalysis(simulatedParams).map((analysis, index) => (
                      <div 
                        key={index}
                        className={`p-2 rounded-lg ${
                          analysis.status === 'optimal' ? 'bg-slate-700/50 border border-green-500' :
                          analysis.status === 'acceptable' ? 'bg-slate-700/50 border border-cyan-500' :
                          analysis.status === 'concerning' ? 'bg-slate-700/50 border border-yellow-500' :
                          'bg-slate-700/50 border border-red-500'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-slate-100">{analysis.parameter}</span>
                          <span className={
                            analysis.status === 'optimal' ? 'text-green-400' :
                            analysis.status === 'acceptable' ? 'text-cyan-400' :
                            analysis.status === 'concerning' ? 'text-yellow-400' :
                            'text-red-400'
                          }>
                            {analysis.message}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Criteria */}
      <Card className="bg-slate-900/50 border-slate-700/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-slate-100">Grade Criteria</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-green-400 mb-2">Grade A - Excellent</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-100">
                  <li>pH: 6.8 - 7.5</li>
                  <li>Turbidity: {'<'} 1.0 NTU</li>
                  <li>TDS: {'<'} 300 ppm</li>
                  <li>Temperature: 25 - 28°C</li>
                  <li>Conductivity: {'<'} 500 μS/cm</li>
                </ul>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-cyan-400 mb-2">Grade B - Good</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-100">
                  <li>pH: 6.5 - 8.0</li>
                  <li>Turbidity: {'<'} 3.0 NTU</li>
                  <li>TDS: {'<'} 500 ppm</li>
                  <li>Temperature: 20 - 30°C</li>
                  <li>Conductivity: {'<'} 700 μS/cm</li>
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-yellow-400 mb-2">Grade C - Fair</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-100">
                  <li>pH: 6.0 - 8.5</li>
                  <li>Turbidity: {'<'} 5.0 NTU</li>
                  <li>TDS: {'<'} 800 ppm</li>
                  <li>Temperature: 15 - 35°C</li>
                  <li>Conductivity: {'<'} 1000 μS/cm</li>
                </ul>
              </div>
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-red-400 mb-2">Grade D - Poor</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-100">
                  <li>pH: Outside acceptable range</li>
                  <li>Turbidity: {'>='} 5.0 NTU</li>
                  <li>TDS: {'>='} 800 ppm</li>
                  <li>Temperature: Outside acceptable range</li>
                  <li>Conductivity: {'>='} 1000 μS/cm</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WaterQualityClassification; 