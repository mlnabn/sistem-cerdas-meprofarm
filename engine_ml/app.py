from flask import Flask, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os

app = Flask(__name__)

# ==========================================
# 1. KONFIGURASI PATH & LOAD MODEL
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model_xgboost.pkl')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler.pkl')

try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("🚀 Model dan Scaler XGBoost berhasil dimuat!")
except Exception as e:
    print(f"❌ Gagal memuat model/scaler: {str(e)}")

# ==========================================
# ENDPOINT 1: PREDIKSI SINGLE (MANUAL VIA FORM)
# ==========================================
@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Tidak ada data JSON yang dikirim'}), 400
        
        # PERBAIKAN: Menggunakan .get() untuk toleransi huruf kecil dari Laravel atau huruf kapital
        features = [
            float(data.get('total_qty', data.get('Total_Qty', 0))),
            float(data.get('trx_frequency', data.get('Trx_Frequency', 0))),
            float(data.get('avg_qty_per_trx', data.get('Avg_Qty_Per_Trx', 0))),
            float(data.get('std_qty', data.get('Std_Qty', 0))),
            float(data.get('recency', data.get('Recency', 0)))
        ]
        
        # Eksekusi Model
        input_data = np.array([features])
        scaled_data = scaler.transform(input_data)
        predicted_class = int(model.predict(scaled_data)[0])
        
        label_mapping = {2: 'Fast Moving', 1: 'Medium Moving', 0: 'Slow Moving'}
        
        return jsonify({
            'success': True,
            'class_id': predicted_class,
            'label': label_mapping.get(predicted_class, 'Unknown')
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ==========================================
# ENDPOINT 2: PREDIKSI MASSAL (AUTOMATED ETL PIPELINE)
# ==========================================
@app.route('/api/predict/batch', methods=['POST'])
def predict_batch_raw():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "Tidak ada file"}), 400
    
    file = request.files['file']
    try:
        df_raw = pd.read_excel(file, sheet_name='MASTER', skiprows=9) if file.filename.lower().endswith(('.xls', '.xlsx')) else pd.read_csv(file, skiprows=9)
        df_raw.columns = df_raw.columns.str.strip()

        if 'Product Code MEPRO' not in df_raw.columns or 'Trx Date' not in df_raw.columns:
            return jsonify({"success": False, "message": "Format kolom Laporan SMS tidak valid."}), 400

        df = df_raw.dropna(subset=['Product Code MEPRO', 'Trx Date']).copy()
        df['Trx Date'] = pd.to_datetime(df['Trx Date'], format='%d-%b-%Y', errors='coerce')
        df = df.dropna(subset=['Trx Date'])
        df['Qty User'] = pd.to_numeric(df['Qty User'], errors='coerce').fillna(0)

        # EKSTRAKSI PERIODE: Mengonversi tanggal transaksi menjadi format YYYY-MM
        df['period'] = df['Trx Date'].dt.strftime('%Y-%m')
        reference_date = df['Trx Date'].max()

        # PERBAIKAN LOGIKA: Group-By berdasarkan Kode Produk DAN Periode Waktu
        df_grouped = df.groupby(['Product Code MEPRO', 'period']).agg(
            item_name=('Product Name MEPRO', 'first'),
            total_qty=('Qty User', 'sum'),
            trx_frequency=('Trx Date', 'count'),
            std_qty=('Qty User', lambda x: np.std(x, ddof=0) if len(x) > 1 else 0),
            last_trx_date=('Trx Date', 'max')
        ).reset_index()

        df_grouped['avg_qty_per_trx'] = df_grouped['total_qty'] / df_grouped['trx_frequency']
        df_grouped['recency'] = (reference_date - df_grouped['last_trx_date']).dt.days
        df_grouped = df_grouped.rename(columns={'Product Code MEPRO': 'item_code'})

        results = []
        for index, row in df_grouped.iterrows():
            fitur_mentah = np.array([[row['total_qty'], row['trx_frequency'], row['avg_qty_per_trx'], row['std_qty'], row['recency']]])
            fitur_scaled = scaler.transform(fitur_mentah)
            pred_class = int(model.predict(fitur_scaled)[0])
            label_map = {0: "Slow Moving", 1: "Medium Moving", 2: "Fast Moving"}

            results.append({
                "item_code": str(row['item_code']),
                "item_name": str(row['item_name']),
                "total_qty": float(row['total_qty']),
                "trx_frequency": float(row['trx_frequency']),
                "avg_qty_per_trx": float(row['avg_qty_per_trx']),
                "std_qty": float(row['std_qty']),
                "recency": float(row['recency']),
                "class_id": pred_class,
                "label": label_map.get(pred_class, "Unknown"),
                "period": str(row['period']) # Sertakan informasi periode ke Laravel
            })

        return jsonify({"success": True, "total_processed": len(results), "data": results})
    except Exception as e:
        return jsonify({"success": False, "message": f"Error ETL Python: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)