# Otomatik GitHub Push Kullanım Kılavuzu

Bu proje için otomatik GitHub push mekanizması kuruldu. Artık her değişiklik sonrası kodlarınız otomatik olarak GitHub'a gönderilecek.

## Kurulu Sistemler

### 1. Post-Commit Hook (Otomatik)
Her commit yaptığınızda otomatik olarak GitHub'a push yapar.

**Nasıl çalışır:**
- Normal şekilde `git commit` yaptığınızda
- Commit başarılı olduktan sonra
- Otomatik olarak `git push origin main` çalışır

**Kullanım:**
```bash
git add .
git commit -m "Your commit message"
# Hook otomatik olarak push yapacak
```

### 2. Auto-Push Script (Manuel)
Tüm değişiklikleri otomatik olarak commit edip push eder.

**Kullanım:**
```powershell
.\auto-push.ps1
```

Bu script:
- Tüm değişiklikleri stage eder
- Otomatik commit mesajıyla commit eder
- GitHub'a push yapar

### 3. Watch-and-Push Script (Sürekli İzleme)
Dosya değişikliklerini izler ve otomatik olarak commit/push yapar.

**Kullanım:**
```powershell
.\watch-and-push.ps1
```

Bu script:
- Dosya değişikliklerini izler
- 5 saniye içinde değişiklik olursa
- Otomatik commit ve push yapar
- Durdurmak için `Ctrl+C` tuşlarına basın

## Notlar

- Post-commit hook zaten aktif ve çalışıyor
- Script'ler PowerShell ile çalışır (Windows)
- İlk çalıştırmada script çalıştırma politikası izni gerekebilir:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

## Sorun Giderme

Eğer hook çalışmıyorsa:
1. `.git/hooks/post-commit` dosyasının çalıştırılabilir olduğundan emin olun
2. Git bash kullanıyorsanız hook otomatik çalışır
3. PowerShell kullanıyorsanız `auto-push.ps1` script'ini kullanabilirsiniz

