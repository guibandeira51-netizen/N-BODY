param([Parameter(Mandatory=$true)][ValidateSet('serve','collector','consolidator')][string]$Service)
$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$taskNode=(Get-Command node -ErrorAction Stop).Source
$taskSpecs=@{serve='scripts/serve.mjs';collector='scripts/halo-5gyr/collector-v3.mjs';consolidator='scripts/halo-5gyr/consolidate-watch.mjs'}
$taskFolder=Join-Path $taskRoot 'reports/halo-5gyr'
$taskStamp=[DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss-fff')
$taskOut=Join-Path $taskFolder ($Service+'-'+$taskStamp+'.stdout.log')
$taskErr=Join-Path $taskFolder ($Service+'-'+$taskStamp+'.stderr.log')
$taskProcess=Start-Process -FilePath $taskNode -ArgumentList @($taskSpecs[$Service]) -WorkingDirectory $taskRoot -WindowStyle Hidden -RedirectStandardOutput $taskOut -RedirectStandardError $taskErr -PassThru
Start-Sleep -Milliseconds 900
$taskProcess.Refresh()
if($taskProcess.HasExited){throw ('Service exited: '+(Get-Content -Raw -LiteralPath $taskErr))}
$taskEntry=@{service=$Service;pid=$taskProcess.Id;startedUTC=[DateTime]::UtcNow.ToString('o');script=$taskSpecs[$Service];stdout=$taskOut;stderr=$taskErr;qualification='Local process only. No OS schedule, startup registration, or remote publication.'}
$taskEntry | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $taskFolder ('service-'+$Service+'.json')) -Encoding utf8NoBOM
$taskEntry | ConvertTo-Json
