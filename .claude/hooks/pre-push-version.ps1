# Hook: cek version bump sebelum git push
# Dijalankan oleh Claude Code PreToolUse hook ketika mendeteksi git push

$diff = git diff HEAD~1 HEAD -- package.json 2>$null

# Jika tidak ada commit sebelumnya (repo baru), biarkan lewat
if ($LASTEXITCODE -ne 0) { exit 0 }

# Join ke string dulu karena git output di PowerShell bisa berupa array
$diffStr = $diff -join [char]10

if ($diffStr -notmatch '"version"') {
    @{
        continue   = $false
        stopReason = 'Versi belum diperbarui. Sebelum push, update "version" di package.json (format vX.Y.Z: X=major, Y=minor, Z=fix) lalu commit version bump-nya terlebih dahulu.'
    } | ConvertTo-Json -Compress
}
