<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MedicineController;
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
});
