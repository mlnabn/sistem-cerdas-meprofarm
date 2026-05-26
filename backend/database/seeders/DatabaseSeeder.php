<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Eksekusi seeder secara terpusat dan berurutan
        $this->call([
            UserSeeder::class,      // Membangun hierarki pengguna terlebih dahulu
            MedicineSeeder::class,  // Mengeksekusi injeksi data CSV XGBoost
        ]);
    }
}
