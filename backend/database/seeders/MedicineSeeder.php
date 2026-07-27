<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Medicine;
use App\Models\ImportLog; // <--- Tambahkan ini
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;

class MedicineSeeder extends Seeder
{
    public function run(): void
    {
        // 1. PEMUSNAHAN DATA LAMA
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('medicines')->truncate();
        DB::table('import_logs')->truncate(); // Bersihkan log lama juga
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // 2. BUAT DUMMY LOG (Agar obat punya "asal-usul")
        // Kita kaitkan ke user_id 1 (Asumsi Admin sudah ada di UserSeeder)
        $log = ImportLog::create([
            'file_name' => 'drug_fsm_seeder.csv',
            'status'    => 'success',
            'user_id'   => 1,
            'created_at' => now()
        ]);

        $csvFile = database_path('data/drug_fsm_seeder.csv');

        if (!File::exists($csvFile)) {
            $this->command->error("File CSV tidak ditemukan di: {$csvFile}");
            return;
        }

        $fileHandle = fopen($csvFile, 'r');
        $header = fgetcsv($fileHandle, 1000, ',');

        $this->command->info("Memulai injeksi data...");
        $count = 0;

        while (($row = fgetcsv($fileHandle, 1000, ',')) !== false) {
            $data = array_combine($header, $row);

            // 3. INJEKSI DATA BARU DENGAN RELASI
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
                'period'          => '2023-2025 (Baseline)',
                'import_log_id'   => $log->id // <--- INI BAGIAN TERPENTING
            ]);
            $count++;
        }

        fclose($fileHandle);
        $this->command->info("Selesai. {$count} data berhasil disinkronisasi.");
    }
}
