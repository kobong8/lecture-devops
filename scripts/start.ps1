param([ValidateRange(1, 65535)][int]$Port = 8000)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'

if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw 'Virtual environment not found. Run .\scripts\install.ps1 first.'
}

Push-Location -LiteralPath $projectRoot
try {
    & $pythonPath -c 'import fastapi, uvicorn'
    if ($LASTEXITCODE -ne 0) { throw 'Dependencies are missing. Run .\scripts\install.ps1 first.' }

    # app.py mounts images; Git does not track this local asset directory.
    if (-not (Test-Path -LiteralPath (Join-Path $projectRoot 'images'))) {
        New-Item -ItemType Directory -Path (Join-Path $projectRoot 'images') | Out-Null
    }

    Write-Host "Open http://127.0.0.1:$Port in your browser. Press Ctrl+C to stop."
    & $pythonPath -m uvicorn app:app --host 127.0.0.1 --port $Port --reload
    if ($LASTEXITCODE -ne 0) { throw 'Server stopped with an error. Check the output above (including port availability).' }
} finally {
    Pop-Location
}
