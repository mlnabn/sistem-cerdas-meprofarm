<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MasterMedicine extends Model
{
    use HasFactory;

    // Mematikan auto-increment ID bawaan karena kita memakai item_code
    protected $primaryKey = 'item_code';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'item_code',
        'item_name',
        'drug_category',
    ];
}
