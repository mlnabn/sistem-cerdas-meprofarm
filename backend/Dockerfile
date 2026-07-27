FROM php:8.2-apache

# Instalasi dependensi OS & ekstensi PHP
RUN apt-get update && apt-get install -y \
    libzip-dev zip unzip git libonig-dev \
    && docker-php-ext-install pdo_mysql zip

# Menyuntikkan konfigurasi PHP kustom (Upload limit & Memory)
COPY custom-php.ini /usr/local/etc/php/conf.d/

# Konfigurasi Apache untuk Laravel
RUN a2enmod rewrite
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

WORKDIR /var/www/html

# Menyalin kode dan manajemen dependensi
COPY . .
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Memaksa mode produksi tanpa paket dev
RUN composer install --no-dev --optimize-autoloader

# Pengerasan hak akses
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache

EXPOSE 80