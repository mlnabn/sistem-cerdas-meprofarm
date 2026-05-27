<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\ImportLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MedicineController extends Controller
{
    // Mengambil data obat dengan filter periode dinamis (Mendukung Hierarki)
    public function index(Request $request)
    {
        $query = Medicine::query();

        // Menggunakan LIKE agar filter tahun dapat menarik semua data bulan relevan
        if ($request->has('period') && $request->period != '') {
            $query->where('period', 'LIKE', $request->period . '%');
        }

        $medicines = $query->orderBy('class_id', 'desc')->get();
        return response()->json(['success' => true, 'data' => $medicines], 200);
    }

    public function getPeriods()
    {
        $periods = Medicine::select('period')->distinct()->orderBy('period', 'desc')->pluck('period');
        return response()->json(['success' => true, 'data' => $periods], 200);
    }

    public function batchPredict(Request $request)
    {
        $request->validate(['file' => 'required|mimes:csv,txt,xls,xlsx|max:51200']);
        $file = $request->file('file');
        $fileName = $file->getClientOriginalName();

        try {
            $response = Http::timeout(90)->attach(
                'file',
                file_get_contents($file),
                $fileName
            )->post('http://127.0.0.1:5000/api/predict/batch');

            if ($response->successful()) {
                $result = $response->json();
                $processedCount = 0;

                foreach ($result['data'] as $item) {
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

                ImportLog::create([
                    'file_name' => $fileName,
                    'status'    => 'success'
                ]);

                return response()->json(['success' => true, 'message' => "Sukses memproses {$processedCount} rekaman data deret waktu."]);
            }

            ImportLog::create(['file_name' => $fileName, 'status' => 'error']);
            return response()->json(['success' => false, 'message' => 'Gagal terhubung ke AI Engine.'], 502);
        } catch (\Exception $e) {
            ImportLog::create(['file_name' => $fileName, 'status' => 'error']);
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
