<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        // Jika pengguna yang mengakses tidak memiliki peran 'admin', blokir dengan galat 403 (Forbidden)
        if ($request->user() && $request->user()->role !== 'admin') {
            return response()->json([
                'status' => 'error',
                'message' => 'Akses ditolak. Tindakan ini membutuhkan otorisasi Super Admin.'
            ], 403);
        }

        return $next($request);
    }
}
