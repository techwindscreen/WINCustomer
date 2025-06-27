import React, { useState } from 'react';

interface CarData {
  Brand: string;
  Model: string;
  Year: string;
  CompetitorPrice?: string;
  WinCNewPrice?: string;
  BasicPrice?: string;
  FastestPrice?: string;
}

const CarSelectionComponent: React.FC = () => {
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [carData, setCarData] = useState<CarData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch(`/api/loadCsvData?brand=${brand}&model=${model}&year=${year}`);
      const data = await response.json();
      setCarData(data[0] || null);
      setError(data[0] ? null : 'No matching data found.');
    } catch (error) {
      setError('Error fetching data');
      setCarData(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">Car Selection</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input 
          value={brand} 
          onChange={(e) => setBrand(e.target.value)} 
          placeholder="Brand"
          className="w-full sm:w-1/3 p-2 sm:p-3 border rounded-lg text-sm sm:text-base"
        />
        <input 
          value={model} 
          onChange={(e) => setModel(e.target.value)} 
          placeholder="Model"
          className="w-full sm:w-1/3 p-2 sm:p-3 border rounded-lg text-sm sm:text-base"
        />
        <input 
          value={year} 
          onChange={(e) => setYear(e.target.value)} 
          placeholder="Year"
          className="w-full sm:w-1/3 p-2 sm:p-3 border rounded-lg text-sm sm:text-base"
        />
      </div>

      <button 
        onClick={fetchData}
        className="w-full sm:w-auto px-6 py-3 bg-[#0FB8C1] text-white rounded-lg hover:bg-[#0CA7AF] 
                 transition-colors text-sm sm:text-base"
      >
        Get Price
      </button>

      {error && <p className="text-red-500 mt-4">{error}</p>}
      
      {carData && (
        <div className="mt-8 bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Price Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-sm">Competitor Price</p>
              <p className="text-lg font-semibold">{carData.CompetitorPrice}</p>
            </div>
            {/* Similar styling for other price information */}
          </div>
        </div>
      )}
    </div>
  );
};

export default CarSelectionComponent;
