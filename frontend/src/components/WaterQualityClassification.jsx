import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

const WaterQualityClassification = () => {
  const [qualityData, setQualityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQualityData = async () => {
    try {
      const response = await fetch('http://localhost:8000/predict-quality');
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
      <Card className="bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-black">Water Quality Grade</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Current Grade</h3>
              <p className={`text-6xl font-bold ${getGradeColor(qualityData?.grade)}`}>
                {qualityData?.grade}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg text-black/80">
                {getGradeDescription(qualityData?.grade)}
              </p>
              <p className="text-sm text-black/60 mt-2">
                Last updated: {new Date(qualityData?.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Grade Probabilities */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">Grade Probabilities</h4>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(qualityData?.grade_probabilities || {}).map(([grade, probability]) => (
                <div key={grade} className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                  <div className={`text-2xl font-bold ${getGradeColor(grade)} mb-2`}>
                    {grade}
                  </div>
                  <div className="text-lg">
                    {(probability * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
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
            {/* Random Forest Architecture */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Random Forest Architecture</h3>
              <div className="flex flex-col items-center space-y-4">
                <div className="grid grid-cols-3 gap-4 w-full">
                  {/* Sample Decision Trees */}
                  {[1, 2, 3].map((tree) => (
                    <div key={tree} className="relative">
                      <div className="w-full aspect-square bg-green-100 rounded-lg border-2 border-green-500 flex items-center justify-center p-2">
                        <div className="text-xs text-center text-black">
                          Decision<br/>Tree {tree}
                        </div>
                      </div>
                      {/* Tree Branches */}
                      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
                        <div className="w-0.5 h-4 bg-green-500"></div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Voting Mechanism */}
                <div className="w-full bg-blue-100 rounded-lg border-2 border-blue-500 p-4 mt-6">
                  <p className="text-xs text-center text-black">
                    Majority Voting System<br/>
                    (100 Trees Total)
                  </p>
                </div>
              </div>
            </div>

            {/* Classification Process */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Classification Process</h3>
              <div className="flex flex-col justify-center min-h-[200px]">
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center border-2 border-indigo-500">
                    <span className="text-sm text-black text-center">Input<br/>Parameters</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-indigo-500"></div>
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center border-2 border-purple-500">
                    <span className="text-sm text-black text-center">Feature<br/>Analysis</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-purple-500"></div>
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center border-2 border-green-500">
                    <span className="text-sm text-black text-center">Grade<br/>Decision</span>
                  </div>
                </div>
                <div className="text-xs text-black/80 text-center mt-4">
                  Real-time classification every 30 seconds
                </div>
              </div>
            </div>

            {/* Feature Importance Visualization */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Feature Importance</h3>
              <div className="space-y-3">
                {Object.entries(qualityData?.feature_importance || {}).map(([feature, importance]) => (
                  <div key={feature} className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-black">{feature}</span>
                      <span className="text-sm text-black">{(importance * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${importance * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Performance */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <h3 className="text-lg font-semibold text-black mb-4">Model Performance</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/20 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-black mb-2">Training Data</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-black">Samples:</span>
                      <span className="text-xs text-black">15,000+</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-black">Features:</span>
                      <span className="text-xs text-black">5</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white/20 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-black mb-2">Model Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-black">Trees:</span>
                      <span className="text-xs text-black">100</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-black">Max Depth:</span>
                      <span className="text-xs text-black">10</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grade Criteria */}
      <Card className="bg-white/40 border border-black/20 rounded-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-black">Grade Criteria</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-green-600 mb-2">Grade A - Excellent</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>pH: 6.8 - 7.5</li>
                  <li>Turbidity: {'<'} 1.0 NTU</li>
                  <li>TDS: {'<'} 300 ppm</li>
                  <li>Temperature: 25 - 28°C</li>
                  <li>Conductivity: {'<'} 500 μS/cm</li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-blue-600 mb-2">Grade B - Good</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>pH: 6.5 - 8.0</li>
                  <li>Turbidity: {'<'} 3.0 NTU</li>
                  <li>TDS: {'<'} 500 ppm</li>
                  <li>Temperature: 20 - 30°C</li>
                  <li>Conductivity: {'<'} 700 μS/cm</li>
                </ul>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-yellow-600 mb-2">Grade C - Fair</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>pH: 6.0 - 8.5</li>
                  <li>Turbidity: {'<'} 5.0 NTU</li>
                  <li>TDS: {'<'} 800 ppm</li>
                  <li>Temperature: 15 - 35°C</li>
                  <li>Conductivity: {'<'} 1000 μS/cm</li>
                </ul>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
                <h3 className="text-xl font-bold text-red-600 mb-2">Grade D - Poor</h3>
                <ul className="list-disc list-inside space-y-1 text-sm">
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