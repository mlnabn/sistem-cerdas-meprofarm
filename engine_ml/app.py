import joblib
import pandas as pd
import numpy as np
import os
import traceback
from flask import Flask, request, jsonify

app = Flask(__name__)

# ==============================================================================
# 1. INISIALISASI MESIN INFERENSI (LOAD MODEL & SCALER)
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Pastikan nama file model dan scaler sesuai dengan yang kita buat di Jupyter
MODEL_PATH = os.path.join(BASE_DIR, 'xgboost_fsm_normalized.joblib')
SCALER_PATH = os.path.join(BASE_DIR, 'scaler_fsm.joblib')

try:
    xgb_model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("✅ Model XGBoost dan Scaler berhasil dimuat dan siap digunakan.")
except Exception as e:
    print(f"❌ Gagal memuat model/scaler. Pastikan file ada di direktori yang sama: {e}")

DECODE_MAP = {
    0: 'Fast Moving',
    1: 'Medium Moving',
    2: 'Slow Moving'
}

@app.route('/api/predict', methods=['POST'])
def predict():
    # Endpoint untuk input manual (single prediction)
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Tidak ada data JSON yang dikirim'}), 400
        
        # Ekstraksi input manual
        total_qty = float(data.get('total_qty', 0))
        trx_frequency = float(data.get('trx_frequency', 0))
        avg_qty_per_trx = float(data.get('avg_qty_per_trx', 0))
        std_qty = float(data.get('std_qty', 0))
        recency_absolut = float(data.get('recency', 0))

        # Asumsi periode default untuk kalkulasi kecepatan input manual (30 hari)
        total_days = 30
        
        # Konversi ke rasio kecepatan (Time-Scale Invariant)
        qty_velocity = total_qty / total_days
        trx_velocity = trx_frequency / total_days
        recency_ratio = recency_absolut / total_days

        # Susun fitur (Sesuai urutan saat training)
        X_new = np.array([[qty_velocity, trx_velocity, avg_qty_per_trx, std_qty, recency_ratio]])
        
        # Z-Score Scaling & Prediksi
        X_scaled = scaler.transform(X_new)
        pred_class = int(xgb_model.predict(X_scaled)[0])
        
        return jsonify({
            'success': True,
            'class_id': pred_class,
            'label': DECODE_MAP[pred_class]
        })

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/predict/batch', methods=['POST'])
def predict_batch():
    # Endpoint untuk ETL Pipeline massal
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'Tidak ada file diunggah.'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'Nama file kosong.'}), 400

    try:
        # 1. PEMBACAAN DATA TANGGUH (TARGET SHEET: MASTER)
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, header=8)
        else:
            # Memaksa pandas membaca sheet bernama 'MASTER' secara spesifik
            df = pd.read_excel(file, sheet_name='MASTER', header=8)

        # Fallback jika metadata memiliki 9 baris kop surat
        if 'Trx Date' not in df.columns:
            file.seek(0)
            if file.filename.endswith('.csv'):
                df = pd.read_csv(file, header=9)
            else:
                df = pd.read_excel(file, sheet_name='MASTER', header=9)

        if 'Trx Date' not in df.columns:
             return jsonify({'success': False, 'message': 'Format tidak valid. Kolom Trx Date tidak ditemukan.'}), 400

        # Standarisasi kolom tanggal
        df['Trx Date'] = pd.to_datetime(df['Trx Date'], dayfirst=True, errors='coerce')
        df = df.dropna(subset=['Trx Date'])
        
        # 2. EKSTRAKSI PERIODE (YYYY-MM)
        df['Period_YM'] = df['Trx Date'].dt.strftime('%Y-%m')

        # 3. AGREGASI DATA DUA DIMENSI (PER ITEM & PER BULAN)
        agg = df.groupby(['Product Code MEPRO', 'Period_YM']).agg(
            Product_Name    = ('Product Name MEPRO', 'first'),
            Total_Qty       = ('Qty User', 'sum'),
            Trx_Frequency   = ('Trx Date', 'count'),
            Avg_Qty_Per_Trx = ('Qty User', 'mean'),
            Std_Qty         = ('Qty User', 'std'),
            Last_Trx        = ('Trx Date', 'max'),
        ).reset_index()

        # Kalkulasi hari kalender riil untuk akurasi pembagi kecepatan
        agg['Days_In_Period'] = pd.to_datetime(agg['Period_YM'] + '-01').dt.daysinmonth
        agg['Period_End'] = pd.to_datetime(agg['Period_YM'] + '-01') + pd.offsets.MonthEnd(0)
        agg['Recency_Absolut'] = (agg['Period_End'] - agg['Last_Trx']).dt.days
        agg['Recency_Absolut'] = agg['Recency_Absolut'].clip(lower=0)
        agg['Std_Qty'] = agg['Std_Qty'].fillna(0)

        # 4. NORMALISASI KECEPATAN WAKTU
        agg['Qty_Velocity'] = agg['Total_Qty'] / agg['Days_In_Period']
        agg['Trx_Velocity'] = agg['Trx_Frequency'] / agg['Days_In_Period']
        agg['Recency_Ratio'] = agg['Recency_Absolut'] / agg['Days_In_Period']

        # 5. STANDARISASI & PREDIKSI
        FEAT_COLS = ['Qty_Velocity', 'Trx_Velocity', 'Avg_Qty_Per_Trx', 'Std_Qty', 'Recency_Ratio']
        X_new = agg[FEAT_COLS].values
        X_scaled = scaler.transform(X_new)
        predictions = xgb_model.predict(X_scaled)

        # 6. PENYUSUNAN PAYLOAD JSON 
        results = []
        for i, row in agg.iterrows():
            pred_class = int(predictions[i])
            results.append({
                'item_code': str(row['Product Code MEPRO']),
                'item_name': str(row['Product_Name']),
                'total_qty': int(row['Total_Qty']), 
                'trx_frequency': int(row['Trx_Frequency']),
                'avg_qty_per_trx': float(row['Avg_Qty_Per_Trx']),
                'std_qty': float(row['Std_Qty']),
                'recency': int(row['Recency_Absolut']), 
                'class_id': pred_class,
                'label': DECODE_MAP[pred_class],
                'period': str(row['Period_YM']) # PERIODE DINAMIS
            })

        return jsonify({'success': True, 'total_processed': len(results), 'data': results})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error ETL Python: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', debug=True, port=5000)