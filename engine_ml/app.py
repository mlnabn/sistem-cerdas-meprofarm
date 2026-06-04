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

        total_days = 30
        
        qty_velocity = total_qty / total_days
        trx_velocity = trx_frequency / total_days
        recency_ratio = recency_absolut / total_days

        X_new = np.array([[qty_velocity, trx_velocity, avg_qty_per_trx, std_qty, recency_ratio]])
        
        # Z-Score Scaling & Prediksi (PERBAIKAN V2.0: Tambah Probability)
        X_scaled = scaler.transform(X_new)
        predictions = xgb_model.predict(X_scaled)
        probabilities = xgb_model.predict_proba(X_scaled)
        
        pred_class = int(predictions[0])
        confidence = float(np.max(probabilities[0])) * 100
        
        return jsonify({
            'success': True,
            'class_id': pred_class,
            'label': DECODE_MAP[pred_class],
            'confidence': round(confidence, 2) # Sekarang ini dikirim ke Laravel
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
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file, header=8)
            if 'Trx Date' not in df.columns:
                file.seek(0)
                df = pd.read_csv(file, header=9)
        else:
            xls = pd.ExcelFile(file)
            target_sheet = 'MASTER' if 'MASTER' in xls.sheet_names else 0
            df = pd.read_excel(xls, sheet_name=target_sheet, header=8)
            if 'Trx Date' not in df.columns:
                df = pd.read_excel(xls, sheet_name=target_sheet, header=9)

        if 'Trx Date' not in df.columns:
             return jsonify({
                 'success': False, 
                 'message': 'Format tidak valid. Kolom "Trx Date" tidak ditemukan. Pastikan file laporan sesuai standar Meprofarm.'
             }), 400

        df['Trx Date'] = pd.to_datetime(df['Trx Date'], dayfirst=True, errors='coerce')
        df = df.dropna(subset=['Trx Date'])
        
        df['Qty User'] = pd.to_numeric(df['Qty User'], errors='coerce')
        df = df.dropna(subset=['Qty User'])
        df = df[df['Qty User'] > 0]

        if len(df) == 0:
             return jsonify({
                 'success': False, 
                 'message': 'Validasi Gagal: Seluruh baris data memiliki kuantitas nol, negatif, atau kosong. Pemrosesan AI dibatalkan.'
             }), 400
        
        df['Period_YM'] = df['Trx Date'].dt.strftime('%Y-%m')

        agg = df.groupby(['Product Code MEPRO', 'Period_YM']).agg(
            Product_Name    = ('Product Name MEPRO', 'first'),
            Total_Qty       = ('Qty User', 'sum'),
            Trx_Frequency   = ('Trx Date', 'count'),
            Avg_Qty_Per_Trx = ('Qty User', 'mean'),
            Std_Qty         = ('Qty User', 'std'),
            Last_Trx        = ('Trx Date', 'max'),
        ).reset_index()

        agg['Days_In_Period'] = pd.to_datetime(agg['Period_YM'] + '-01').dt.daysinmonth
        agg['Period_End'] = pd.to_datetime(agg['Period_YM'] + '-01') + pd.offsets.MonthEnd(0)
        agg['Recency_Absolut'] = (agg['Period_End'] - agg['Last_Trx']).dt.days
        agg['Recency_Absolut'] = agg['Recency_Absolut'].clip(lower=0)
        agg['Std_Qty'] = agg['Std_Qty'].fillna(0)

        agg['Qty_Velocity'] = agg['Total_Qty'] / agg['Days_In_Period']
        agg['Trx_Velocity'] = agg['Trx_Frequency'] / agg['Days_In_Period']
        agg['Recency_Ratio'] = agg['Recency_Absolut'] / agg['Days_In_Period']

        FEAT_COLS = ['Qty_Velocity', 'Trx_Velocity', 'Avg_Qty_Per_Trx', 'Std_Qty', 'Recency_Ratio']
        X_new = agg[FEAT_COLS].values
        X_scaled = scaler.transform(X_new)
        
        predictions = xgb_model.predict(X_scaled)
        probabilities = xgb_model.predict_proba(X_scaled) 

        results = []
        for i, row in agg.iterrows():
            pred_class = int(predictions[i])
            confidence = float(np.max(probabilities[i])) * 100 
            
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
                'confidence': round(confidence, 2),
                'period': str(row['Period_YM'])
            })

        return jsonify({'success': True, 'total_processed': len(results), 'data': results})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error ETL Python: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', debug=True, port=5000)