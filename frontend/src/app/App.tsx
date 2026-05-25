import { Eye, EyeOff, KeyRound, Lock, LogOut, Mail, ShieldCheck } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { forgotPassword, getMe, login, register, resetPassword, updateKeys } from "../api/auth";
import { setToken } from "../api/client";
import { FileList } from "../components/FileList";
import { FileUploader } from "../components/FileUploader";
import { SharedDownload } from "../components/SharedDownload";
import { saveBlob } from "../crypto/aes";
import {
  clearUnlockedPrivateKey,
  generateUserKeyPayload,
  loadUnlockedPrivateKey,
  storeUnlockedPrivateKey,
  unlockPrivateKey,
} from "../crypto/userKeys";
import type { User } from "../types";

const PASSWORD_PATTERN = /^[A-Za-z0-9!@#$%^&*()_\-+=[\]{};:'",.<>/?\\|`~]*$/;

function getPasswordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("мінімум 8 символів");
  if (!PASSWORD_PATTERN.test(password)) issues.push("тільки латиниця, цифри і символи");
  if (!/[A-Z]/.test(password)) issues.push("велика латинська літера");
  if (!/[a-z]/.test(password)) issues.push("мала латинська літера");
  if (!/[^A-Za-z0-9]/.test(password)) issues.push("спецсимвол");
  return issues;
}

type AuthMode = "login" | "register" | "forgot";

type PasswordFieldProps = {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  placeholder?: string;
};

function PasswordField({ value, onChange, autoComplete, placeholder }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        minLength={8}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
      />
      <button
        className="password-toggle"
        type="button"
        onClick={() => setVisible((current) => !current)}
        title={visible ? "Приховати пароль" : "Показати пароль"}
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function App() {
  const params = new URLSearchParams(window.location.search);
  const shareToken = params.get("share");
  const resetToken = params.get("reset");

  const [user, setUser] = useState<User | null>(null);
  const [privateKeyJson, setPrivateKeyJson] = useState(loadUnlockedPrivateKey());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<AuthMode>("login");
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const passwordIssues = useMemo(() => getPasswordIssues(password), [password]);
  const validatesPassword = mode === "register" || Boolean(resetToken);

  useEffect(() => {
    if (shareToken || resetToken) {
      setLoading(false);
      return;
    }

    getMe()
      .then(setUser)
      .catch(() => {
        setToken(null);
        clearUnlockedPrivateKey();
        setPrivateKeyJson("");
      })
      .finally(() => setLoading(false));
  }, [shareToken, resetToken]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    try {
      if (mode === "forgot") {
        const response = await forgotPassword(email);
        setStatus(`${response.message}. Перевір backend/mail/reset_emails.log`);
        return;
      }

      if (mode === "register" && passwordIssues.length > 0) {
        setError(`Пароль має містити: ${passwordIssues.join(", ")}.`);
        return;
      }

      if (mode === "register") {
        const keyPayload = await generateUserKeyPayload(password);
        const response = await register(email, password, keyPayload);
        setToken(response.access_token);
        setUser(response.user);
        setPrivateKeyJson(keyPayload.privateKeyJson);
        storeUnlockedPrivateKey(keyPayload.privateKeyJson);
      } else {
        const response = await login(email, password);
        setToken(response.access_token);

        let activeUser = response.user;
        let unlockedKey = "";
        if (activeUser.encrypted_private_key) {
          try {
            unlockedKey = await unlockPrivateKey(activeUser, password);
          } catch {
            setStatus("Вхід виконано, але private key не розблокувався. Це буває після зміни пароля акаунта.");
          }
        } else {
          const keyPayload = await generateUserKeyPayload(password);
          activeUser = await updateKeys(keyPayload);
          unlockedKey = keyPayload.privateKeyJson;
        }

        setUser(activeUser);
        setPrivateKeyJson(unlockedKey);
        if (unlockedKey) storeUnlockedPrivateKey(unlockedKey);
      }

      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка авторизації");
    }
  }

  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");

    if (!resetToken) return;
    if (passwordIssues.length > 0) {
      setError(`Пароль має містити: ${passwordIssues.join(", ")}.`);
      return;
    }

    try {
      const response = await resetPassword(resetToken, password);
      setStatus(response.message);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося змінити пароль");
    }
  }

  function logout() {
    setToken(null);
    clearUnlockedPrivateKey();
    setPrivateKeyJson("");
    setUser(null);
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
    setStatus("");
    setPassword("");
  }

  function exportPrivateKey() {
    if (!privateKeyJson || !user) return;
    saveBlob(new Blob([JSON.stringify(JSON.parse(privateKeyJson), null, 2)], { type: "application/json" }), `${user.email}.private-key.json`);
  }

  if (loading) return <main className="screen center">Завантаження...</main>;
  if (shareToken) return <SharedDownload token={shareToken} />;

  if (resetToken) {
    return (
      <AuthLayout subtitle="Новий пароль">
        <form className="auth-form" onSubmit={submitReset}>
          <label>
            Пароль
            <PasswordField value={password} onChange={setPassword} autoComplete="new-password" placeholder="Password!1" />
          </label>
          {validatesPassword && <PasswordRules password={password} />}
          <Messages status={status} error={error} />
          <button className="primary" type="submit">
            <Lock size={18} />
            Змінити пароль
          </button>
        </form>
      </AuthLayout>
    );
  }

  if (!user) {
    return (
      <AuthLayout subtitle="Захищене файлове сховище">
        <form className="auth-form" onSubmit={submitAuth}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
          </label>

          {mode !== "forgot" && (
            <label>
              Пароль
              <PasswordField value={password} onChange={setPassword} autoComplete={mode === "login" ? "current-password" : "new-password"} />
            </label>
          )}

          {mode === "register" && <PasswordRules password={password} />}
          <Messages status={status} error={error} />

          <button className="primary" type="submit">
            {mode === "forgot" ? <Mail size={18} /> : <Lock size={18} />}
            {mode === "login" && "Увійти"}
            {mode === "register" && "Створити акаунт"}
            {mode === "forgot" && "Надіслати посилання"}
          </button>
        </form>

        <div className="auth-links">
          {mode === "login" && (
            <>
              <button className="link-button" type="button" onClick={() => switchMode("register")}>
                Створити акаунт
              </button>
              <button className="link-button" type="button" onClick={() => switchMode("forgot")}>
                Забули пароль?
              </button>
            </>
          )}
          {mode !== "login" && (
            <button className="link-button" type="button" onClick={() => switchMode("login")}>
              До входу
            </button>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand compact">
          <div className="brand-mark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1>Secure Drive</h1>
            <p>{user.email}</p>
          </div>
        </div>
        <div className="row-actions">
          <button className="icon-button" type="button" onClick={exportPrivateKey} title="Експорт private key">
            <KeyRound size={18} />
          </button>
          <button className="icon-button" type="button" onClick={logout} title="Вийти">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <section className="workspace">
        {status && <p className="status">{status}</p>}
        <FileUploader publicKey={user.public_key} onUploaded={() => setRefreshKey((value) => value + 1)} />
        <FileList refreshKey={refreshKey} privateKeyJson={privateKeyJson} />
      </section>
    </main>
  );
}

function AuthLayout({ subtitle, children }: { subtitle: string; children: ReactNode }) {
  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={30} />
          </div>
          <div>
            <h1>Secure Drive</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function Messages({ status, error }: { status: string; error: string }) {
  return (
    <>
      {status && <p className="status">{status}</p>}
      {error && <p className="error">{error}</p>}
    </>
  );
}

function PasswordRules({ password }: { password: string }) {
  const rules = [
    { ok: password.length >= 8, text: "мінімум 8 символів" },
    { ok: PASSWORD_PATTERN.test(password), text: "латиниця, цифри і символи" },
    { ok: /[A-Z]/.test(password), text: "велика літера" },
    { ok: /[a-z]/.test(password), text: "мала літера" },
    { ok: /[^A-Za-z0-9]/.test(password), text: "спецсимвол" },
  ];

  return (
    <div className="password-rules">
      <span>Вимоги до пароля</span>
      <ul>
        {rules.map((rule) => (
          <li className={rule.ok ? "ok" : ""} key={rule.text}>
            {rule.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
