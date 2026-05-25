$certDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$keyPath = Join-Path $certDir "localhost-key.pem"
$certPath = Join-Path $certDir "localhost.pem"

function Convert-ToPem {
    param(
        [string]$Label,
        [byte[]]$Data
    )

    $base64 = [System.Convert]::ToBase64String($Data)
    $lines = for ($i = 0; $i -lt $base64.Length; $i += 64) {
        $base64.Substring($i, [System.Math]::Min(64, $base64.Length - $i))
    }

    return "-----BEGIN $Label-----`n$($lines -join "`n")`n-----END $Label-----`n"
}

if (Get-Command openssl -ErrorAction SilentlyContinue) {
    openssl req `
        -x509 `
        -newkey rsa:2048 `
        -sha256 `
        -days 365 `
        -nodes `
        -keyout $keyPath `
        -out $certPath `
        -subj "/CN=localhost" `
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
} else {
    $rsa = [System.Security.Cryptography.RSA]::Create(2048)
    $subject = [System.Security.Cryptography.X509Certificates.X500DistinguishedName]::new("CN=localhost")
    $hashAlgorithm = [System.Security.Cryptography.HashAlgorithmName]::SHA256
    $padding = [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
    $request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new($subject, $rsa, $hashAlgorithm, $padding)

    $sanBuilder = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
    $sanBuilder.AddDnsName("localhost")
    $sanBuilder.AddIpAddress([System.Net.IPAddress]::Parse("127.0.0.1"))
    $request.CertificateExtensions.Add($sanBuilder.Build())

    $notBefore = [System.DateTimeOffset]::UtcNow.AddDays(-1)
    $notAfter = $notBefore.AddDays(365)
    $cert = $request.CreateSelfSigned($notBefore, $notAfter)

    $certPem = Convert-ToPem -Label "CERTIFICATE" -Data $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert)
    if ($rsa.PSObject.Methods.Name -contains "ExportPkcs8PrivateKey") {
        $privateKeyBytes = $rsa.ExportPkcs8PrivateKey()
        $keyPem = Convert-ToPem -Label "PRIVATE KEY" -Data $privateKeyBytes
    } elseif ($rsa.GetType().Name -eq "RSACng") {
        $privateKeyBytes = $rsa.Key.Export([System.Security.Cryptography.CngKeyBlobFormat]::Pkcs8PrivateBlob)
        $keyPem = Convert-ToPem -Label "PRIVATE KEY" -Data $privateKeyBytes
    } else {
        throw "This PowerShell/.NET version cannot export a PEM private key. Install OpenSSL and run this script again."
    }

    [System.IO.File]::WriteAllText($certPath, $certPem)
    [System.IO.File]::WriteAllText($keyPath, $keyPem)
}

Write-Host "Created:"
Write-Host "  $keyPath"
Write-Host "  $certPath"
