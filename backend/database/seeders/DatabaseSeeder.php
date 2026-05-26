<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // MATIKAN SEMENTARA BARIS INI AGAR TIDAK CRASH
        // $this->call(MedicineSeeder::class);

        // Eksekusi paksa pembuatan akun
        User::updateOrCreate(
            ['email' => 'admin@meprofarm.com'],
            [
                'name' => 'Bintang (Manager)',
                'password' => Hash::make('password123'),
            ]
        );
    }
}
