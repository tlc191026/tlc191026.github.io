# 手动构建 Electron Portable .exe
# 运行：powershell -File build-portable.ps1
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$src = Join-Path $root "node_modules\electron\dist"
$dst = Join-Path $root "dist\桐辰照片审核"

Write-Output "Cleaning dist..."
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Path $dst -Force | Out-Null

Write-Output "Copying electron.exe..."
Copy-Item (Join-Path $src "electron.exe") (Join-Path $dst "桐辰照片审核.exe") -Force

Write-Output "Copying runtime files..."
Get-ChildItem $src -File | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $dst $_.Name) -Force
}
Get-ChildItem $src -Directory | ForEach-Object {
    Copy-Item $_.FullName (Join-Path $dst $_.Name) -Recurse -Force
}

Write-Output "Creating resources/app..."
$appDir = Join-Path $dst "resources\app"
New-Item -ItemType Directory -Path $appDir -Force | Out-Null
Copy-Item (Join-Path $root "main.js") (Join-Path $appDir "main.js") -Force
Copy-Item (Join-Path $root "package.json") (Join-Path $appDir "package.json") -Force

Write-Output "Done! Size:"
$size = (Get-ChildItem $dst -Recurse | Measure-Object -Property Length -Sum).Sum
Write-Output ("{0:N0} MB" -f ($size / 1MB))
Write-Output ""
Write-Output "Portable dir: $dst"
Write-Output "Portable exe: $(Join-Path $dst "桐辰照片审核.exe")"