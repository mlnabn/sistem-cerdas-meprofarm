<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('medicines', function (Blueprint $table) {
            $table->id();
            $table->string('item_code');
            $table->string('item_name');
            $table->integer('total_qty');
            $table->integer('trx_frequency');
            $table->double('avg_qty_per_trx');
            $table->double('std_qty');
            $table->integer('recency');
            $table->integer('class_id');
            $table->string('label');
            $table->string('period'); // KUNCI UTAMA DERET WAKTU
            $table->timestamps();

            // Mengizinkan item_code yang sama disimpan berulang kali asal periodenya berbeda
            $table->unique(['item_code', 'period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medicines');
    }
};
