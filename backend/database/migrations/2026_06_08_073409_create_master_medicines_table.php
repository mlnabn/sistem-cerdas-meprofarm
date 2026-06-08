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
        Schema::create('master_medicines', function (Blueprint $table) {
            // item_code dijadikan Primary Key karena kode SKU obat bersifat unik mutlak
            $table->string('item_code')->primary();
            $table->string('item_name');
            $table->string('drug_category')->default('Belum Dikategorikan');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('master_medicines');
    }
};
