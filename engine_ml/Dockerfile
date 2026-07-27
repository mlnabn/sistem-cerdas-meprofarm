FROM python:3.10-slim

WORKDIR /app

# Resolusi dependensi
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn

COPY . .

# Penerapan Non-Root User untuk keamanan mesin
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 5000

# Eksekusi produksi dengan batas waktu komputasi 120 detik untuk Batch Upload
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "120", "app:app"]