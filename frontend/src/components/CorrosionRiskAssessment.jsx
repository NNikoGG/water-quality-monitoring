import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const CorrosionRiskAssessment = () => {
  const [riskData, setRiskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      {/* Current Risk Status */}
      <Card className="bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-black">Current Risk Status</CardTitle>
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

      {/* Combined Parameter Analysis and Decision Logic */}
      <Card className="bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-black">Analysis & Decision Logic</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Parameter Analysis */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Critical Parameters</h3>
              <div className="space-y-4">
                <div className="p-4 bg-white/10 rounded-lg">
                  <h4 className="font-semibold text-black">pH Level</h4>
                  <p className="text-sm text-black/80">
                    • Severe risk: &lt; 6.5<br />
                    • Moderate risk: 6.5 - 6.8<br />
                    • Safe range: 6.8 - 8.5
                  </p>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <h4 className="font-semibold text-black">TDS (Total Dissolved Solids)</h4>
                  <p className="text-sm text-black/80">
                    • Severe risk: &gt; 450 mg/L<br />
                    • Moderate risk: 350 - 450 mg/L<br />
                    • Safe range: &lt; 350 mg/L
                  </p>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <h4 className="font-semibold text-black">Conductivity</h4>
                  <p className="text-sm text-black/80">
                    • Severe risk: &gt; 800 µS/cm<br />
                    • Moderate risk: 700 - 800 µS/cm<br />
                    • Safe range: &lt; 700 µS/cm
                  </p>
                </div>
                <div className="p-4 bg-white/10 rounded-lg">
                  <h4 className="font-semibold text-black">Temperature</h4>
                  <p className="text-sm text-black/80">
                    • Optimal: 27.5°C<br />
                    • Moderate risk: ±1.5 - 3°C from optimal<br />
                    • Severe risk: &gt; ±3°C from optimal
                  </p>
                </div>
              </div>
            </div>

            {/* Decision Logic */}
            <div>
              <h3 className="text-lg font-semibold text-black mb-4">Risk Assessment Logic</h3>
              <div className="space-y-6">
                <div className="p-4 bg-white/10 rounded-lg">
                  <h4 className="font-semibold text-black mb-2">High Risk Triggers</h4>
                  <ul className="list-disc list-inside space-y-2 text-sm text-black/80">
                    <li>Severe pH drop (below 6.5)</li>
                    <li>Moderate pH with other concerning factors</li>
                    <li>Multiple severe conditions across parameters</li>
                    <li>One severe + two moderate conditions</li>
                    <li>Three or more moderate conditions</li>
                  </ul>
                </div>

                <div className="p-4 bg-white/10 rounded-lg">
                  <h4 className="font-semibold text-black mb-2">Risk Level Classification</h4>
                  <div className="space-y-2 text-sm">
                    <p className="text-black/80">
                      <span className="text-red-600 font-semibold">High Risk ({'>'}70%):</span><br/>
                      Immediate attention required. Multiple concerning parameters.
                    </p>
                    <p className="text-black/80">
                      <span className="text-yellow-600 font-semibold">Medium Risk (30-70%):</span><br/>
                      Caution needed. Parameters near thresholds.
                    </p>
                    <p className="text-black/80">
                      <span className="text-green-600 font-semibold">Low Risk ({'<'}30%):</span><br/>
                      Normal conditions. Parameters in safe range.
                    </p>
                  </div>
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