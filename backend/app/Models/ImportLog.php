<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Models\Medicine;
use App\Models\User;

class ImportLog extends Model
{
    public $timestamps = false; // Karena kita hanya menggunakan created_at
    protected $fillable = ['file_name', 'status', 'created_at', 'user_id'];

    public function user() {
        return $this->belongsTo(User::class);
    }

    public function medicines() {
        return $this->hasMany(Medicine::class);
    }
}
