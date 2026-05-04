# =============================================================================
# Stage 1 — Build : installation des dépendances Composer
# =============================================================================
FROM composer:2.8 AS vendor

WORKDIR /app

# Copie uniquement les fichiers de dépendances pour profiter du cache Docker
COPY composer.json composer.lock* ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

# =============================================================================
# Stage 2 — Image finale PHP 8.3-FPM
# =============================================================================
FROM php:8.3-fpm-alpine

LABEL maintainer="SaaS Gestion Commerciale"

# ── Extensions système ────────────────────────────────────────────────────────
RUN apk add --no-cache \
        libpng-dev \
        libjpeg-turbo-dev \
        libwebp-dev \
        zlib-dev \
        libzip-dev \
        icu-dev \
        oniguruma-dev \
    && docker-php-ext-configure gd \
        --with-jpeg \
        --with-webp \
    && docker-php-ext-install \
        pdo_mysql \
        mbstring \
        gd \
        zip \
        intl \
        pcntl \
        bcmath \
        opcache \
    # Extension Redis via PECL (pour predis, l'extension n'est pas obligatoire,
    # mais elle améliore les performances)
    && pecl install redis \
    && docker-php-ext-enable redis opcache

# ── Configuration PHP production ──────────────────────────────────────────────
RUN { \
        echo 'opcache.enable=1'; \
        echo 'opcache.memory_consumption=256'; \
        echo 'opcache.interned_strings_buffer=16'; \
        echo 'opcache.max_accelerated_files=20000'; \
        echo 'opcache.validate_timestamps=0'; \
        echo 'opcache.save_comments=1'; \
        echo 'opcache.fast_shutdown=1'; \
    } > /usr/local/etc/php/conf.d/opcache.ini \
    && { \
        echo 'upload_max_filesize=10M'; \
        echo 'post_max_size=10M'; \
        echo 'max_execution_time=60'; \
        echo 'memory_limit=256M'; \
    } > /usr/local/etc/php/conf.d/app.ini

# ── Répertoire de travail ─────────────────────────────────────────────────────
WORKDIR /var/www/html

# ── Copie vendor depuis le stage Build ───────────────────────────────────────
COPY --from=vendor /app/vendor ./vendor

# ── Copie du code source ──────────────────────────────────────────────────────
COPY . .

# ── Permissions storage ───────────────────────────────────────────────────────
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html/storage \
    && chmod -R 755 /var/www/html/bootstrap/cache

# ── Optimisations Laravel ─────────────────────────────────────────────────────
RUN php artisan package:discover --ansi \
    && php artisan config:cache \
    && php artisan route:cache \
    && php artisan view:cache

EXPOSE 9000

CMD ["php-fpm"]
