<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\ImportLog;
use App\Models\MasterMedicine;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MedicineController extends Controller
{
    public function import(Request $request)
    {
        $request->validate(['file' => 'required|file|mimes:csv,txt,xls,xlsx|max:51200']);

        $log = $this->createImportLog(
            'CSV IMPORT - ' . $request->file('file')->getClientOriginalName(),
            'success',
            $request->user()->id
        );

        $file = fopen($request->file('file')->getRealPath(), 'r');
        $header = fgetcsv($file);

        while (($row = fgetcsv($file)) !== false) {
            $data = array_combine($header, $row);

            Medicine::create([
                'item_code' => $data['item_code'],
                'item_name' => $data['item_name'],
                'total_qty' => $data['total_qty'],
                'import_log_id' => $log->id,
            ]);
        }

        fclose($file);

        return response()->json(['success' => true, 'message' => 'Data berhasil diimpor.']);
    }

    public function index(Request $request)
    {
        $query = Medicine::query();

        if ($request->has('period') && $request->period != '') {
            // REVISI LOGIKA: Cegah tumpang tindih antara "2023" tunggal/bulanan dengan "2023-2025 (Baseline)"
            if ($request->period === '2023-2025 (Baseline)') {
                $query->where('period', $request->period);
            } else {
                $query->where('period', 'LIKE', $request->period . '%')
                    ->where('period', '!=', '2023-2025 (Baseline)'); // 
            }
        }

        // Urutkan Class ID Ascending (0=Fast, 1=Medium, 2=Slow), lalu Total Qty Descending
        $medicines = $query->orderBy('class_id', 'asc')
            ->orderBy('total_qty', 'desc')
            ->get();

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

        $log = $this->createImportLog('BATCH PREDICT - ' . $fileName, 'processing', $request->user()->id);

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
                    $master = MasterMedicine::firstOrCreate(
                        ['item_code' => $item['item_code']],
                        [
                            'item_name' => $item['item_name'],
                            'drug_category' => 'Belum Dikategorikan',
                        ]
                    );

                    Medicine::updateOrCreate(
                        ['item_code' => $item['item_code'], 'period' => $item['period']],
                        [
                            'item_name' => $item['item_name'],
                            'drug_category' => $master->drug_category,
                            'total_qty' => $item['total_qty'],
                            'trx_frequency' => $item['trx_frequency'],
                            'avg_qty_per_trx' => $item['avg_qty_per_trx'],
                            'std_qty' => $item['std_qty'],
                            'recency' => $item['recency'],
                            'class_id' => $item['class_id'],
                            'label' => $item['label'],
                            'confidence' => $item['confidence'] ?? null,
                            'import_log_id' => $log->id,
                        ],
                    );

                    $processedCount++;
                }

                $log->update(['status' => 'success']);

                return response()->json([
                    'success' => true,
                    'message' => "Berhasil memproses {$processedCount} data."
                ]);
            }

            $log->update(['status' => 'error']);
            return response()->json(['success' => false, 'message' => 'Tidak dapat terhubung ke AI Engine.'], 502);
        } catch (\Exception $e) {
            $log->update(['status' => 'error']);
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan saat memproses batch.'], 500);
        }
    }

    // Fungsi untuk memproses prediksi manual / tunggal
    public function predict(Request $request)
    {
        $request->validate([
            'item_code' => 'required',
            'item_name' => 'required',
            'total_qty' => 'required|numeric',
            'trx_frequency' => 'required|numeric',
            'avg_qty_per_trx' => 'required|numeric',
            'std_qty' => 'required|numeric',
            'recency' => 'required|numeric',
            'period' => 'required'
        ]);

        $log = $this->createImportLog(
            "MANUAL INPUT - {$request->item_code} - {$request->period}",
            'processing',
            $request->user()->id
        );

        try {
            $response = Http::timeout(90)->post('http://ai_engine:5000/api/predict', $request->all());

            if ($response->successful()) {
                $result = $response->json();

                $medicine = Medicine::updateOrCreate(
                    ['item_code' => $request->item_code, 'period' => $request->period],
                    [
                        'item_name' => $request->item_name,
                        'total_qty' => $request->total_qty,
                        'trx_frequency' => $request->trx_frequency,
                        'avg_qty_per_trx' => $request->avg_qty_per_trx,
                        'std_qty' => $request->std_qty,
                        'recency' => $request->recency,
                        'class_id' => $result['class_id'],
                        'label' => $result['label'],
                        'confidence' => $result['confidence'] ?? null,
                    ]
                );

                $log->update(['status' => 'success']);

                return response()->json([
                    'success' => true,
                    'message' => 'Klasifikasi berhasil disimpan.',
                    'data' => $medicine
                ]);
            }

            $log->update(['status' => 'error']);
            return response()->json(['success' => false, 'message' => 'Gagal memproses prediksi dari AI Engine.'], 502);
        } catch (\Exception $e) {
            $log->update(['status' => 'error']);
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan saat memproses prediksi.'], 500);
        }
    }

    public function rollbackByPeriod(Request $request)
    {
        $request->validate([
            'period' => 'required'
        ]);

        try {
            $deletedCount = Medicine::where('period', $request->period)->delete();

            if ($deletedCount > 0) {
                $this->createImportLog("ROLLBACK - {$request->period}", 'success', $request->user()->id);

                return response()->json([
                    'success' => true,
                    'message' => "Rollback berhasil. {$deletedCount} data pada periode {$request->period} telah dihapus."
                ]);
            }

            return response()->json(['success' => false, 'message' => 'Tidak ada data yang ditemukan untuk periode tersebut.'], 404);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan saat melakukan rollback.'], 500);
        }
    }

    public function updateDrugCategory(Request $request)
    {
        $request->validate([
            'item_code' => 'required|string',
            'item_name' => 'required|string',
            'drug_category' => 'required|string',
        ]);

        try {
            $master = MasterMedicine::updateOrCreate(
                ['item_code' => $request->item_code],
                [
                    'item_name' => $request->item_name,
                    'drug_category' => $request->drug_category,
                ]
            );

            Medicine::where('item_code', $request->item_code)
                ->update(['drug_category' => $request->drug_category]);

            return response()->json([
                'success' => true,
                'message' => 'Kategori obat berhasil diperbarui dan disinkronkan.',
                'data' => $master
            ], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Terjadi kesalahan saat memperbarui kategori.'], 500);
        }
    }

    public function getMasterMedicines()
    {
        try {
            $masters = MasterMedicine::orderBy('item_name', 'asc')->get();
            return response()->json(['success' => true, 'data' => $masters], 200);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => 'Gagal memuat data master obat.'], 500);
        }
    }

    private function createImportLog(string $fileName, string $status, ?int $userId): ImportLog
    {
        return ImportLog::create([
            'file_name' => $fileName,
            'status' => $status,
            'user_id' => $userId,
            'created_at' => now(),
        ]);
    }
}
