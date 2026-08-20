$files = Get-ChildItem -Path "f:\billing software\spice-route\src" -Recurse -Include "*.tsx","*.ts"
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $changed = $false
    
    if ($content -match "FEB800") {
        $content = $content -replace "#FEB800", "#4F46E5"
        $changed = $true
    }
    
    if ($content -match "024C48") {
        $content = $content -replace "#024C48", "#4F46E5"
        $changed = $true
    }

    if ($content -match "E8F6F6") {
        $content = $content -replace "#E8F6F6", "#EEF2FF"
        $changed = $true
    }
    
    if ($changed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        Write-Host "Updated: $($file.Name)"
    }
}
Write-Host "Done!"
