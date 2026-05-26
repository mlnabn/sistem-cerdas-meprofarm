<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MedicineController extends Controller
{
    // Mengambil semua data obat dari database untuk ditampilkan di tabel
    // Mengambil data obat dengan filter periode dinamis
    public function index(Request $request)
    {
        $query = Medicine::query();

        // Filter berdasarkan periode jika parameter dikirim dari React
        if ($request->has('period') && $request->period != '') {
            $query->where('period', $request->period);
        }

        $medicines = $query->orderBy('class_id', 'desc')->get();
        return response()->json(['success' => true, 'data' => $medicines], 200);
    }

    // Mengambil daftar semua periode unik untuk dropdown filter di UI
    public function getPeriods()
    {
        $periods = Medicine::select('period')->distinct()->orderBy('period', 'desc')->pluck('period');
        return response()->json(['success' => true, 'data' => $periods], 200);
    }

    public function batchPredict(Request $request)
    {
        $request->validate(['file' => 'required|mimes:csv,txt,xls,xlsx|max:51200']);
        $file = $request->file('file');

        try {
            $response = Http::timeout(90)->attach(
                'file',
                file_get_contents($file),
                $file->getClientOriginalName()
            )->post('http://127.0.0.1:5000/api/predict/batch');

            if ($response->successful()) {
                $result = $response->json();
                $processedCount = 0;

                foreach ($result['data'] as $item) {
                    // AMAN DARI OVERWRITE: Kunci unik sekarang menyertakan parameter periode
                    Medicine::updateOrCreate(
                        ['item_code' => $item['item_code'], 'period' => $item['period']],
                        [
                            'item_name' => $item['item_name'],
                            'total_qty' => $item['total_qty'],
                            'trx_frequency' => $item['trx_frequency'],
                            'avg_qty_per_trx' => $item['avg_qty_per_trx'],
                            'std_qty' => $item['std_qty'],
                            'recency' => $item['recency'],
                            'class_id' => $item['class_id'],
                            'label' => $item['label'],
                        ]
                    );
                    $processedCount++;
                }
                return response()->json(['success' => true, 'message' => "Sukses memproses {$processedCount} rekaman data deret waktu."]);
            }
            return response()->json(['success' => false, 'message' => 'Gagal terhubung ke AI Engine.'], 502);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
