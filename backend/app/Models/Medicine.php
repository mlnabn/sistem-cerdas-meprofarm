<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    protected $fillable = [
        'item_code',
        'item_name',
        'total_qty',
        'trx_frequency',
        'avg_qty_per_trx',
        'std_qty',
        'recency',
        'class_id',
        'label',
        'period',
        'confidence'
    ];
}
