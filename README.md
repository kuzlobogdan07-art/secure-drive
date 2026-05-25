# Secure Drive

Secure Drive - мій навчальний веб-сервіс для захищеного зберігання файлів. Я зробив його як практичну реалізацію теми про захист інформації за допомогою криптографічних перетворень.

Головна ідея проста: файл шифрується ще у браузері, до відправлення на сервер. Backend не бачить відкритий вміст файлу. Він отримує тільки зашифрований файл, метадані й технічні значення, потрібні для подальшого розшифрування на стороні користувача.

Проєкт підтримує два варіанти шифрування:

- симетричне шифрування через AES-256-GCM;
- асиметричну схему RSA-OAEP + AES-GCM.

## Що вміє програма

- створення акаунта;
- вхід у систему;
- перевірка складності пароля;
- відновлення пароля акаунта через локальний email-log;
- завантаження файлів у зашифрованому вигляді;
- скачування та розшифрування файлів;
- вибір між AES і RSA+AES;
- створення share-посилань;
- обмеження файлів до 50 MB;
- блокування `.exe` і `.mp4`;
- локальний запуск через HTTPS.

## Технології

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

## Структура проєкту

```text
secure-drive/
├── backend/
│   ├── app/
│   │   ├── api/routes/        # API endpoints
│   │   ├── core/              # конфігурація, JWT, password hashing
│   │   ├── db/                # SQLAlchemy models і session
│   │   ├── schemas/           # Pydantic-схеми
│   │   ├── services/          # бізнес-логіка
│   │   └── main.py            # FastAPI application
│   ├── requirements.txt
│   └── secure_drive.db
│
├── frontend/
│   ├── src/
│   │   ├── api/               # API-клієнт
│   │   ├── app/               # головний React app
│   │   ├── components/        # UI-компоненти
│   │   ├── crypto/            # шифрування і ключі
│   │   ├── styles/            # CSS
│   │   └── types/             # TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
├── infra/
│   ├── certs/                 # HTTPS-сертифікати
│   ├── docker/                # Dockerfile-и
│   ├── nginx/                 # nginx config
│   └── docker-compose.yml
│
├── docs/
└── README.md
```

## Запуск

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

## Симетричне шифрування

У симетричному режимі користувач сам вводить пароль для конкретного файлу.

Послідовність така:

1. Користувач обирає файл.
2. Вводить пароль шифрування.
3. Браузер генерує випадковий `salt`.
4. Браузер генерує випадковий `IV`.
5. З пароля і `salt` створюється AES-ключ через PBKDF2-SHA256.
6. Файл шифрується через AES-256-GCM.
7. На backend відправляється зашифрований файл і метадані.
8. Для розшифрування користувач знову вводить той самий пароль.

Backend у цьому режимі не отримує пароль файлу. Якщо пароль втратити, файл уже не вийде розшифрувати.

## Асиметричне шифрування

В асиметричному режимі я використав hybrid encryption. Це означає, що сам файл все одно шифрується AES-GCM, а RSA-OAEP використовується для захисту AES-ключа.

Так зроблено тому, що RSA не підходить для прямого шифрування великих файлів. AES швидший для великих даних, а RSA зручно використовувати для ключів.

Послідовність така:

1. Під час реєстрації браузер створює пару RSA-OAEP ключів.
2. Public key зберігається на backend.
3. Private key шифрується паролем акаунта.
4. Зашифрований private key також зберігається на backend.
5. Коли користувач входить, браузер розблоковує private key паролем акаунта.
6. Для файлу створюється випадковий AES-ключ.
7. Файл шифрується через AES-GCM.
8. AES-ключ загортається через RSA-OAEP public key.
9. Backend зберігає encrypted file, `IV`, wrapped key і метадані.
10. Для розшифрування браузер відкриває AES-ключ через private key і розшифровує файл.

Тобто RSA тут не шифрує файл напряму. Він захищає ключ, яким був зашифрований файл.

## Що зберігається на сервері

Backend зберігає:

- email користувача;
- hash пароля акаунта;
- public key;
- encrypted private key;
- salt і IV для private key;
- зашифровані файли;
- IV файлів;
- salt для симетричного режиму;
- wrapped AES key для асиметричного режиму;
- назву файлу;
- MIME type;
- checksum;
- share-токени;
- reset-токени.

Backend не зберігає:

- відкритий вміст файлу;
- пароль шифрування файлу;
- розшифрований private key;
- AES-ключ у відкритому вигляді.

## ООП у проєкті

Я виніс основну логіку в окремі класи, щоб routes і компоненти не були перевантажені.

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

## Обмеження

- Максимальний розмір файлу: 50 MB.
- Заборонені розширення: `.exe`, `.mp4`.
- Reset password змінює пароль акаунта, але не відновлює паролі шифрування файлів.
- Self-signed сертифікат підходить тільки для локального запуску.
- Для production треба змінити `SECRET_KEY`.
- Для production краще підключити справжній SMTP.

## Як перевірити роботу

1. Запустити backend і frontend.
2. Відкрити `https://localhost:5173`.
3. Створити акаунт.
4. Завантажити файл у режимі AES-GCM.
5. Скачати його і ввести пароль.
6. Завантажити файл у режимі RSA-OAEP + AES-GCM.
7. Скачати його і перевірити розшифрування.
8. Створити share-посилання.
9. Відкрити share-посилання.
10. Для reset password перевірити файл `backend/mail/reset_emails.log`.

## Коротко для захисту

У цьому проєкті я реалізував веб-сервіс, де файли шифруються на стороні клієнта. Для цього використовується WebCrypto API у браузері.

У симетричному режимі файл шифрується алгоритмом AES-256-GCM. Ключ створюється з пароля користувача через PBKDF2-SHA256.

В асиметричному режимі використовується комбінована схема: файл шифрується AES-GCM, а AES-ключ захищається через RSA-OAEP public key користувача.

Backend у цій архітектурі не має доступу до відкритого файлу. Він працює як сховище для ciphertext і метаданих.
