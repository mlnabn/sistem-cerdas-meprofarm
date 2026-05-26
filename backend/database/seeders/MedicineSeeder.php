<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Medicine;
use Illuminate\Support\Facades\File;

class MedicineSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Lokasi absolut file CSV yang sudah dirapikan
        $csvFile = database_path('data/drug_fsm_seeder.csv');

        if (!File::exists($csvFile)) {
            $this->command->error("File CSV tidak ditemukan di: {$csvFile}");
            return;
        }

        $fileHandle = fopen($csvFile, 'r');
        $header = fgetcsv($fileHandle, 1000, ',');

        $this->command->info("Memulai injeksi data ke tabel medicines...");
        $count = 0;

        while (($row = fgetcsv($fileHandle, 1000, ',')) !== false) {
            $data = array_combine($header, $row);

            // Karena data CSV sudah memiliki label_enc dan label_fsm dari Jupyter,
            // kita bisa langsung memasukkannya ke database tanpa perlu menembak Flask Engine.
            Medicine::updateOrCreate(
                // Cari kombinasi kode barang dan periode
                ['item_code' => $data['product_code'], 'period' => '2023-2025 (Baseline)'],
                [
                    'item_name'       => $data['product_name'],
                    'total_qty'       => $data['total_qty'],
                    'trx_frequency'   => $data['trx_frequency'],
                    'avg_qty_per_trx' => $data['avg_qty_per_trx'],
                    'std_qty'         => $data['std_qty'],
                    'recency'         => $data['recency'],
                    'class_id'        => $data['label_enc'],
                    'label'           => $data['label_fsm']
                ]
            );
            $count++;
        }

        fclose($fileHandle);
        $this->command->info("Berhasil menginjeksi {$count} data obat ke MySQL.");
    }
}
