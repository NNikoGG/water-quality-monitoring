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
    <Card className="mb-8 bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
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
  );
};

export default CorrosionRiskAssessment; 