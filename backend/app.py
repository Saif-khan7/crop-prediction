from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX
from datetime import timedelta

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes and all domains
# 1) Load Data
df = pd.read_csv('../data/crop_sales_data.csv', parse_dates=['Date'])

# 2) Pre-calculate best and worst sellers
crop_sums = df.groupby('Crop')['Quantity Sold (kg)'].sum().sort_values(ascending=False)
top_3_crops = crop_sums.head(3)
bottom_3_crops = crop_sums.tail(3)

@app.route('/best_worst_sellers', methods=['GET'])
def best_worst_sellers():
    """
    Returns the top 3 and bottom 3 crops by total quantity sold.
    """
    best_sellers_df = top_3_crops.reset_index().rename(columns={'Quantity Sold (kg)': 'TotalSales'})
    worst_sellers_df = bottom_3_crops.reset_index().rename(columns={'Quantity Sold (kg)': 'TotalSales'})
    
    response = {
        'best_sellers': best_sellers_df.to_dict(orient='records'),
        'worst_sellers': worst_sellers_df.to_dict(orient='records')
    }
    return jsonify(response)

@app.route('/forecast', methods=['GET'])
def forecast():
    """
    Generate future forecast for a selected crop using SARIMAX.
    Query params: /forecast?crop=Rice&periods=7
    """
    crop_name = request.args.get('crop', 'Rice')
    periods = request.args.get('periods', 7, type=int)
    
    # Filter data for selected crop
    crop_data = df[df['Crop'] == crop_name].copy()
    crop_data.sort_values(by='Date', inplace=True)
    crop_data.set_index('Date', inplace=True)

    if len(crop_data) < 5:
        return jsonify({'error': 'Not enough data to forecast for this crop.'}), 400

    y = crop_data['Quantity Sold (kg)']
    
    # A simple, placeholder SARIMAX configuration
    model = SARIMAX(y, 
                    order=(1,1,1),
                    seasonal_order=(1,1,1,7),
                    enforce_stationarity=False,
                    enforce_invertibility=False)
    results = model.fit(disp=False)
    
    # Forecast for given periods
    forecast_values = results.predict(start=len(y), end=len(y)+periods-1, typ='levels').tolist()
    
    # Generate future dates
    last_date = crop_data.index[-1]
    future_dates = [last_date + timedelta(days=i) for i in range(1, periods+1)]
    
    forecast_output = []
    for date, val in zip(future_dates, forecast_values):
        forecast_output.append({
            'Date': date.strftime('%Y-%m-%d'),
            'Forecast': round(val, 2)
        })

    # Return last 7 days of actual data + forecast for easier charting
    historical_df = crop_data.tail(7).reset_index()
    historical_df['Date'] = historical_df['Date'].dt.strftime('%Y-%m-%d')
    historical_output = historical_df[['Date', 'Quantity Sold (kg)']]\
                                     .rename(columns={'Quantity Sold (kg)': 'Actual'})

    response = {
        'crop': crop_name,
        'historical': historical_output.to_dict(orient='records'),
        'forecast': forecast_output
    }
    return jsonify(response)

if __name__ == '__main__':
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
