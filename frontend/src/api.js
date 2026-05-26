import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
    headers: {
        'Accept': 'application/json' // Wajib agar Laravel tidak merespons dengan HTML
    }
});

// Interseptor Request (Menyuntikkan Token)
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Interseptor Response (Menangani Galat)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Deteksi apakah galat berasal dari halaman login
        const isLoginRequest = error.config && error.config.url.endsWith('/login');

        // Lakukan pemaksaan logout HANYA jika galat bukan dari form login
        if (error.response && error.response.status === 401 && !isLoginRequest) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;