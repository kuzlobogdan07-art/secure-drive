# Secure Drive

Secure Drive - мій навчальний веб-сервіс для захищеного зберігання файлів. Я зробив його як практичну реалізацію теми про захист інформації за допомогою криптографічних перетворень.

Головна ідея проста: файл шифрується ще у браузері, до відправлення на сервер. Backend не бачить відкритий вміст файлу. Він отримує тільки зашифрований файл, метадані й технічні значення, потрібні для подальшого розшифрування на стороні користувача.

Проєкт підтримує два варіанти шифрування:

- симетричне шифрування через AES-256-GCM;
- асиметричну схему RSA-OAEP + AES-GCM.

## Технології які я використовував 

Backend:

- Python;
- FastAPI;
- SQLAlchemy;
- SQLite;
- JWT;
- bcrypt.

Frontend:

- React;
- TypeScript;
- Vite;
- WebCrypto API;
- lucide-react.

Інфраструктура:

- nginx;
- Docker Compose;
- локальні self-signed сертифікати.


## Запуск , якщо запуск робити повторно то пропускається 1 та 2 розділи

### 1. Встановити залежності frontend

```powershell
cd D:\Python\secure-drive\frontend
npm.cmd install
```

### 2. Згенерувати локальний HTTPS-сертифікат

```powershell
cd D:\Python\secure-drive\infra\certs
.\create-local-cert.ps1
```

Після цього в папці `infra/certs` мають з'явитися:

- `localhost.pem`;
- `localhost-key.pem`.

Ці файли потрібні тільки для локального HTTPS. Приватний ключ сертифіката не треба додавати в git.

### 3. Запустити backend

```powershell
cd D:\Python\secure-drive\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --ssl-keyfile ..\infra\certs\localhost-key.pem --ssl-certfile ..\infra\certs\localhost.pem
```

Перевірка:

```text
https://127.0.0.1:8000/health
```

Очікувана відповідь:

```json
{"status":"ok"}
```

### 4. Запустити frontend

```powershell
cd D:\Python\secure-drive\frontend
npm.cmd run dev
```

Сайт:

```text
https://localhost:5173
```

Браузер може попередити про self-signed сертифікат. Для локальної розробки це нормально.

## Docker

Для Docker-режиму підготовлений nginx reverse proxy:

```powershell
cd D:\Python\secure-drive\infra
docker compose up --build
```

Адреса:

```text
https://localhost
```

Для цього потрібен встановлений Docker.

## Основні файли backend

- `backend/app/main.py` - створює FastAPI application, підключає routes і створює таблиці бази при старті.
- `backend/app/core/config.py` - налаштування проєкту: база даних, CORS, URL frontend, секретний ключ.
- `backend/app/core/security.py` - bcrypt для паролів і JWT для авторизації.
- `backend/app/db/models.py` - моделі користувача, файлу, share-посилання і reset-токена.
- `backend/app/db/session.py` - підключення до SQLite.
- `backend/app/api/routes/auth.py` - реєстрація, вхід, відновлення пароля, оновлення ключів.
- `backend/app/api/routes/files.py` - список файлів, upload, download, delete.
- `backend/app/api/routes/share.py` - створення і відкриття share-посилань.
- `backend/app/services/auth_service.py` - основна логіка авторизації.
- `backend/app/services/storage.py` - збереження encrypted blob-файлів у `backend/storage`.
- `backend/app/services/email.py` - запис reset-посилань у локальний log.
- `backend/app/services/security_log.py` - запис невдалих спроб розшифрування shared-файлів.

## Основні файли frontend

- `frontend/src/app/App.tsx` - головний компонент: auth, reset password, dashboard.
- `frontend/src/components/FileUploader.tsx` - вибір файлу, вибір методу шифрування, завантаження.
- `frontend/src/components/FileList.tsx` - список файлів, скачування, розшифрування, видалення.
- `frontend/src/components/ShareDialog.tsx` - створення share-посилання.
- `frontend/src/components/SharedDownload.tsx` - скачування файлу через share-посилання.
- `frontend/src/api/client.ts` - базовий API-клієнт.
- `frontend/src/api/auth.ts` - запити авторизації.
- `frontend/src/api/files.ts` - запити для роботи з файлами.
- `frontend/src/styles/main.css` - стилі інтерфейсу.

## Де знаходиться шифрування

Криптографія зроблена на frontend, бо саме браузер має працювати з відкритим файлом.

Головні файли:

- `frontend/src/crypto/aes.ts` - шифрування і дешифрування файлів;
- `frontend/src/crypto/keys.ts` - генерація salt, IV, Base64 і PBKDF2;
- `frontend/src/crypto/userKeys.ts` - RSA key pair і захист private key.

У `aes.ts` є два основні класи:

- `SymmetricFileCipher` - робота з AES-GCM;
- `AsymmetricFileCipher` - схема RSA-OAEP + AES-GCM.

У `userKeys.ts` є:

- `UserKeyManager` - створення і розблокування RSA-ключів;
- `UnlockedPrivateKeyStore` - тимчасове зберігання private key у `sessionStorage`.



## ООП у проєкті

Backend:

- `AuthService`;
- `FileStorageService`;
- `ShareTokenService`;
- `PasswordResetMailer`;
- `SecurityAuditLogger`.

Frontend:

- `SymmetricFileCipher`;
- `AsymmetricFileCipher`;
- `UserKeyManager`;
- `UnlockedPrivateKeyStore`;
- `BlobDownloader`.




