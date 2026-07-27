<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\ImportLog;

class Medicine extends Model
{
    protected $fillable = [
        'item_code',
        'item_name',
        'drug_category',
        'total_qty',
        'trx_frequency',
        'avg_qty_per_trx',
        'std_qty',
        'recency',
        'class_id',
        'label',
        'period',
        'confidence',
        'import_log_id'
    ];

    public function importLog() {
        return $this->belongsTo(ImportLog::class);
    }
}
