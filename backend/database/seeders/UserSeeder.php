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
            ['email' => 'admin@gmail.com'],
            [
                'name' => 'Bintang (Manager)',
                'password' => Hash::make('admin123'),
                'role' => 'admin' // Parameter Kritis RBAC
            ]
        );

        // 2. Provokasi Akun Staf (Untuk Pengujian Keamanan Blackbox)
        User::updateOrCreate(
            ['email' => 'staff@gmail.com'],
            [
                'name' => 'Staf Gudang',
                'password' => Hash::make('staff123'),
                'role' => 'staff' // Parameter Kritis RBAC
            ]
        );
    }
}
