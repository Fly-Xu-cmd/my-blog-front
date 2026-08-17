# 自动重连的 SSH 数据库隧道脚本
# 本地 3307 -> 远程服务器 3306 (MySQL)，断线后每 5 秒自动重连
# 用法: pwsh -File scripts/tunnel.ps1   (或直接运行本文件)

$ErrorActionPreference = 'Stop'

$sshArgs = @(
  '-L', '3307:localhost:3306',
  '-N',
  '-o', 'ServerAliveInterval=60',
  '-o', 'ServerAliveCountMax=3',
  '-o', 'ExitOnForwardFailure=yes',
  '-o', 'ConnectTimeout=15',
  'my-blog-db'
)

Write-Host '[tunnel] 启动 SSH 数据库隧道 (3307 -> 远程 3306)，断线自动重连...'

$attempt = 0
while ($true) {
  $attempt++
  Write-Host "[tunnel] 第 $attempt 次连接..."
  & ssh @sshArgs
  $code = $LASTEXITCODE
  Write-Host "[tunnel] ssh 退出 (code=$code)，5 秒后重连..." -ForegroundColor Yellow
  Start-Sleep -Seconds 5
}
