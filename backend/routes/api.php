<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\UserController; // REGISTRASI KELAS USER CONTROLLER
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Rute bawaan Laravel untuk memanggil data user saat ini
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// ==========================================
// RUTE TERBUKA (PUBLIC)
// ==========================================
// Rute ini dibiarkan terbuka agar React bisa mengirim email dan kata sandi
Route::post('/login', [AuthController::class, 'login']);

// ==========================================
// RUTE TERTUTUP (PRIVATE & SECURED)
// ==========================================
// Semua rute di dalam grup ini akan diblokir dengan galat 401 jika tidak membawa token
Route::middleware('auth:sanctum')->group(function () {

    // Rute untuk menghancurkan token (keluar sistem)
    Route::post('/logout', [AuthController::class, 'logout']);

    // Rute fungsionalitas mesin XGBoost dan data historis
    Route::get('/medicines/periods', [MedicineController::class, 'getPeriods']);
    Route::get('/medicines', [MedicineController::class, 'index']);
    Route::post('/medicines/predict', [MedicineController::class, 'predict']);
    Route::post('/medicines/batch', [MedicineController::class, 'batchPredict']);

    // Rute ekstraksi metrik evaluasi ilmiah XGBoost untuk visualisasi antarmuka
    Route::get('/model-metrics', function () {
        $path = storage_path('app/models/metrics_xgb.json');

        if (!file_exists($path)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Berkas metrics_xgb.json tidak ditemukan di direktori storage/app/models/'
            ], 404);
        }

        $metrics = json_decode(file_get_contents($path), true);
        return response()->json($metrics);
    });

    // ===================================================================
    // RUTE KHUSUS SUPER ADMIN (DILINDUNGI MIDDLEWARE ISADMIN)
    // ===================================================================
    Route::middleware([\App\Http\Middleware\IsAdmin::class])->group(function () {
        Route::get('/users', [UserController::class, 'index']);          // Menampilkan semua karyawan
        Route::post('/users', [UserController::class, 'store']);         // Mendaftarkan karyawan baru
        Route::put('/users/{id}', [UserController::class, 'update']);    // Memperbarui data karyawan
        Route::delete('/users/{id}', [UserController::class, 'destroy']); // Menghapus akun karyawan
    });

    //==================================================================
    // RUTE TAMBAHAN UNTUK MENGAMBIL RIWAYAT IMPORT
    //==================================================================
    Route::get('/import-history', function () {
        return response()->json([
            'success' => true,
            'data' => \App\Models\ImportLog::orderBy('created_at', 'desc')->get()
        ]);
    });
});
