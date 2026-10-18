$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $projectRoot '.venv\Scripts\python.exe'

Push-Location -LiteralPath $projectRoot
try {
    if (-not (Test-Path -LiteralPath $pythonPath)) {
        python -m venv .venv
        if ($LASTEXITCODE -ne 0) { throw 'Could not create the Python virtual environment.' }
    }
    & $pythonPath -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    Write-Host 'Installation complete. Run .\scripts\start.ps1 to start the server.'
} finally {
    Pop-Location
}
