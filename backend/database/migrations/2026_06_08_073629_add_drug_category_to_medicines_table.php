<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::table('medicines', function (Blueprint $table) {
            // Menambahkan kolom kategori di tabel log transaksi
            $table->string('drug_category')->default('Belum Dikategorikan')->after('item_name');
        });
    }

    public function down()
    {
        Schema::table('medicines', function (Blueprint $table) {
            $table->dropColumn('drug_category');
        });
    }
};
