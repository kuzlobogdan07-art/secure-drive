# Архітектура

Secure Drive складається з трьох шарів:

- Frontend шифрує та розшифровує файли через WebCrypto.
- Backend автентифікує користувачів і зберігає зашифровані файлові blob-дані.
- Локальний запуск використовує FastAPI backend, Vite frontend, SQLite і файлове сховище.
- HTTPS-режим забезпечується self-signed сертифікатом для dev-запуску або nginx reverse proxy у Docker.

## Потік даних

1. Користувач вибирає файл і режим шифрування.
2. У симетричному режимі браузер отримує AES-ключ із пароля через PBKDF2-SHA256.
3. В асиметричному режимі браузер створює випадковий AES-ключ і захищає його через RSA-OAEP public key.
4. Сам файл шифрується через AES-GCM із випадковим IV.
5. Backend зберігає ciphertext, IV, salt або wrapped key, checksum, власника й метадані.
6. Під час завантаження ciphertext повертається в браузер і розшифровується локально.

## Backend-модулі

- `core`: конфігурація та security helpers.
- `api/routes`: HTTP endpoints.
- `db`: SQLAlchemy-моделі та керування сесіями.
- `services`: авторизація, сховище, email-log, security-log і генерація токенів.
- `schemas`: API-контракти.

## Frontend-модулі

- `crypto`: обгортки над WebCrypto.
- `api`: клієнт для backend.
- `components`: UI для завантаження, списку файлів, sharing і shared download.
- `app`: оболонка застосунку та auth flow.

## Об'єктно-орієнтований підхід

- Backend використовує сервісні класи: `AuthService`, `FileStorageService`, `ShareTokenService`, `PasswordResetMailer`, `SecurityAuditLogger`.
- HTTP routes відповідають за прийом запитів і передачу даних у сервіси, а бізнес-логіка винесена в окремі об'єкти.
- Frontend-криптографія оформлена класами `SymmetricFileCipher`, `AsymmetricFileCipher`, `UserKeyManager`, `UnlockedPrivateKeyStore`, `BlobDownloader`.
- Функції-обгортки залишені для сумісності з компонентами React, але основна логіка тепер інкапсульована в класах.
