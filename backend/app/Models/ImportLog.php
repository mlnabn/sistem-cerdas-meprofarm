<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportLog extends Model
{
    public $timestamps = false; // Karena kita hanya menggunakan created_at
    protected $fillable = ['file_name', 'status', 'created_at'];
}
