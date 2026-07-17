# 启动 portable exe
$exe = 'D:\github.io\tlc191026.github.io\electron-app\dist\桐辰照片审核\桐辰照片审核.exe'
Write-Output ("Exists: " + (Test-Path $exe))
if (Test-Path $exe) {
    Write-Output ("Size: " + (Get-Item $exe).Length + " bytes")
    Start-Process -FilePath $exe
    Write-Output "Started"
} else {
    # 列出 dist 目录
    Get-ChildItem 'D:\github.io\tlc191026.github.io\electron-app\dist' | Select-Object Name, Mode
}