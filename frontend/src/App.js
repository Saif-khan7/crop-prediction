import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Bar, Line } from 'react-chartjs-2';

// Import this for auto-registration of Chart.js components (avoids "category not found" errors)
import 'chart.js/auto';

function App() {
  const [bestSellers, setBestSellers] = useState([]);
  const [worstSellers, setWorstSellers] = useState([]);
  const [allCrops, setAllCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('Rice');
  const [forecastData, setForecastData] = useState(null);

  // Fetch top/bottom 3 sellers on initial load
  useEffect(() => {
    axios.get('http://localhost:5000/best_worst_sellers')
      .then(res => {
        const { best_sellers, worst_sellers } = res.data;
        setBestSellers(best_sellers);
        setWorstSellers(worst_sellers);

        // Combine top/bottom crops into a single array for the dropdown
        const bestNames = best_sellers.map(bs => bs.Crop);
        const worstNames = worst_sellers.map(ws => ws.Crop);
        const uniqueCrops = Array.from(new Set([...bestNames, ...worstNames]));
        setAllCrops(uniqueCrops);
      })
      .catch(err => console.error('Best/Worst error:', err));
  }, []);

  // Fetch forecast data for selected crop
  useEffect(() => {
    axios.get(`http://localhost:5000/forecast?crop=${selectedCrop}&periods=7`)
      .then(res => setForecastData(res.data))
      .catch(err => console.error('Forecast error:', err));
  }, [selectedCrop]);

  // Prepare data for Best Sellers bar chart
  const bestSellersData = {
    labels: bestSellers.map(item => item.Crop),
    datasets: [
      {
        label: 'Best Sellers (kg)',
        data: bestSellers.map(item => item.TotalSales),
        backgroundColor: 'rgba(54,162,235,0.6)',
        barPercentage: 0.6, // Adjust bar width
        categoryPercentage: 0.8 // Adjust spacing between bars
      }
    ]
  };

  // Prepare data for Worst Sellers bar chart
  const worstSellersData = {
    labels: worstSellers.map(item => item.Crop),
    datasets: [
      {
        label: 'Worst Sellers (kg)',
        data: worstSellers.map(item => item.TotalSales),
        backgroundColor: 'rgba(255,99,132,0.6)',
        barPercentage: 0.6,
        categoryPercentage: 0.8
      }
    ]
  };

  // When user selects a crop from dropdown
  const handleCropChange = e => {
    setSelectedCrop(e.target.value);
  };

  // Prepare line chart data for Historical + Forecast
  let lineLabels = [];
  let historicalValues = [];
  let forecastLabels = [];
  let forecastValues = [];

  if (forecastData) {
    historicalValues = forecastData.historical.map(d => d.Actual);
    forecastValues = forecastData.forecast.map(d => d.Forecast);

    const histDates = forecastData.historical.map(d => d.Date);
    const foreDates = forecastData.forecast.map(d => d.Date);

    // Combine into a single label array
    lineLabels = [...histDates, ...foreDates];

    forecastLabels = foreDates;
  }

  const lineChartData = {
    labels: lineLabels,
    datasets: [
      {
        label: 'Historical Sales (kg)',
        data: [
          ...historicalValues,
          // Fill the forecast range with null so the lines don’t overlap
          ...Array(forecastLabels.length).fill(null)
        ],
        borderColor: 'blue',
        backgroundColor: 'rgba(0,0,255,0.2)',
        tension: 0.1
      },
      {
        label: 'Forecast (kg)',
        data: [
          // Fill the historical range with null
          ...Array(historicalValues.length).fill(null),
          ...forecastValues
        ],
        borderColor: 'orange',
        backgroundColor: 'rgba(255,165,0,0.2)',
        tension: 0.1
      }
    ]
  };

  return (
    <div style={{ margin: '20px' }}>
      <h1>Crop Sales Dashboard</h1>

      {/* Best & Worst Sellers */}
      <div style={{ display: 'flex', gap: '50px' }}>
        <div style={{ width: '400px' }}>
          <h2>Top 3 Best-sellers</h2>
          <Bar data={bestSellersData} options={{ maintainAspectRatio: false, responsive: true }} />
        </div>
        <div style={{ width: '400px' }}>
          <h2>Top 3 Worst-sellers</h2>
          <Bar data={worstSellersData} options={{ maintainAspectRatio: false, responsive: true }} />
        </div>
      </div>

      {/* Forecast */}
      <div style={{ marginTop: '40px' }}>
        <h2>Future Trend Forecast</h2>
        <label>Select Crop: </label>
        <select value={selectedCrop} onChange={handleCropChange}>
          {allCrops.map(crop => (
            <option key={crop} value={crop}>{crop}</option>
          ))}
        </select>

        {forecastData && (
          <div style={{ width: '800px', marginTop: '20px' }}>
            <Line data={lineChartData} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
