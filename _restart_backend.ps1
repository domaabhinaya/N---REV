$conns = Get-NetTCPConnection -State Listen -LocalPort 8099 -ErrorAction SilentlyContinue
$pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
foreach ($p in $pids) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Output "Stopped backend PID $p" }
Start-Sleep -Seconds 2
$dir = 'c:\Users\Abhinaya Doma\OneDrive\Desktop\N-REV-main\artifacts\api-server'
$proc = Start-Process -FilePath node -ArgumentList '--enable-source-maps','./dist/index.mjs' -WorkingDirectory $dir -RedirectStandardOutput (Join-Path $dir '_server_out.log') -RedirectStandardError (Join-Path $dir '_server_err.log') -PassThru -WindowStyle Hidden
Write-Output "Started backend PID $($proc.Id)"
Start-Sleep -Seconds 8
$c = Get-NetTCPConnection -State Listen -LocalPort 8099 -ErrorAction SilentlyContinue
if ($c) { Write-Output 'BACKEND_LISTENING_8099 YES' } else { Write-Output 'BACKEND_LISTENING_8099 NO' }
