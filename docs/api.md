# API

Базовий URL: `/api`

## Авторизація

- `POST /auth/register` створює користувача, зберігає public key/encrypted private key і повертає JWT.
- `POST /auth/login` повертає JWT.
- `GET /auth/me` повертає поточного користувача.
- `PUT /auth/keys` оновлює криптографічні ключі користувача.
- `POST /auth/password/forgot` створює токен для скидання пароля й записує повідомлення в локальний dev email-log.
- `POST /auth/password/reset` скидає пароль за дійсним reset-токеном.

## Файли

- `GET /files` повертає список зашифрованих файлів поточного користувача.
- `POST /files` завантажує зашифрований multipart-вміст із полями `encrypted_file`, `original_name`, `original_content_type`, `encryption_iv`, `encryption_salt`, `encryption_mode` і `wrapped_key`.
- `GET /files/{file_id}/download` завантажує зашифровані байти файлу.
- `DELETE /files/{file_id}` видаляє метадані та збережені байти файлу.

## Спільний доступ

- `POST /share/{file_id}` створює публічний токен для завантаження зашифрованого файлу.
- `GET /share/{token}` повертає метадані зашифрованого файлу.
- `GET /share/{token}/download` завантажує зашифровані байти файлу.
- `POST /share/{token}/failed-decryption` записує IP і дані запиту в security log після трьох невдалих спроб розшифрування shared-файлу.
