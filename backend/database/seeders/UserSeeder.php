<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Provokasi Akun Super Admin (Memiliki Hak Akses Penuh)
        User::updateOrCreate(
            ['email' => 'admin@meprofarm.com'],
            [
                'name' => 'Bintang (Manager)',
                'password' => Hash::make('password123'),
                'role' => 'admin' // Parameter Kritis RBAC
            ]
        );

        // 2. Provokasi Akun Staf (Untuk Pengujian Keamanan Blackbox)
        User::updateOrCreate(
            ['email' => 'staff@meprofarm.com'],
            [
                'name' => 'Staf Gudang',
                'password' => Hash::make('password123'),
                'role' => 'staff' // Parameter Kritis RBAC
            ]
        );
    }
}
