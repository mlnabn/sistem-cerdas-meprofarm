<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Medicine;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class MedicineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. PEMUSNAHAN DATA LAMA (WAJIB)
        // Menghapus seluruh data cacat sebelumnya agar tidak merusak metrik di Dasbor
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('medicines')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 2. LOKASI FILE CSV
        // Menyesuaikan dengan lokasi yang Anda sebutkan: database/seeders/data/
        $csvFile = database_path('data/drug_fsm_seeder.csv');

        if (!File::exists($csvFile)) {
            $this->command->error("File CSV tidak ditemukan di: {$csvFile}");
            return;
        }

        $fileHandle = fopen($csvFile, 'r');
        $header = fgetcsv($fileHandle, 1000, ',');

        $this->command->info("Memulai injeksi data mutlak ke tabel medicines...");
        $count = 0;

        while (($row = fgetcsv($fileHandle, 1000, ',')) !== false) {
            $data = array_combine($header, $row);

            // 3. INJEKSI DATA BARU
            // Kunci array disesuaikan dengan hasil export dari Jupyter (Time-Scale Invariant)
            Medicine::create([
                'item_code'       => $data['item_code'],
                'item_name'       => $data['item_name'],
                'total_qty'       => $data['total_qty'],
                'trx_frequency'   => $data['trx_frequency'],
                'avg_qty_per_trx' => $data['avg_qty_per_trx'],
                'std_qty'         => $data['std_qty'],
                'recency'         => $data['recency'],
                'class_id'        => $data['class_id'],
                'label'           => $data['label'],
                'period'          => '2023-2025 (Baseline)'
            ]);
            $count++;
        }

        fclose($fileHandle);
        $this->command->info("Selesai. {$count} baris data berhasil disinkronisasi ke MySQL.");
    }
}
