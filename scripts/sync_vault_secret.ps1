param(
  [Parameter(Mandatory = $true)]
  [string]$EnvName,

  [Parameter(Mandatory = $true)]
  [string]$SecretName,

  [Parameter(Mandatory = $false)]
  [string]$ProjectRef
)

$ErrorActionPreference = "Stop"

function Read-DotEnvValue {
  param([string]$Name)

  foreach ($path in @(".env.local", ".env")) {
    if (-not (Test-Path $path)) {
      continue
    }

    $line = Get-Content $path | Where-Object { $_ -match "^\s*$([regex]::Escape($Name))\s*=" } | Select-Object -First 1
    if ($line) {
      $value = ($line -split "=", 2)[1].Trim()
      return $value.Trim('"').Trim("'")
    }
  }

  return [Environment]::GetEnvironmentVariable($Name)
}

function Read-ProjectRef {
  if ($ProjectRef) {
    return $ProjectRef
  }

  $linkedProjectRef = "supabase/.temp/project-ref"
  if (Test-Path $linkedProjectRef) {
    return (Get-Content $linkedProjectRef | Select-Object -First 1).Trim()
  }

  return ""
}

function Resolve-ServiceRoleKey {
  $configuredServiceRoleKey = Read-DotEnvValue -Name "SUPABASE_SERVICE_ROLE_KEY"
  if ($configuredServiceRoleKey) {
    return $configuredServiceRoleKey
  }

  $accessToken = Read-DotEnvValue -Name "SUPABASE_ACCESS_TOKEN"
  $resolvedProjectRef = Read-ProjectRef

  if (-not $accessToken -or -not $resolvedProjectRef) {
    return ""
  }

  $previousAccessToken = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN")
  $setTemporaryAccessToken = -not $previousAccessToken

  if ($setTemporaryAccessToken) {
    $env:SUPABASE_ACCESS_TOKEN = $accessToken
  }

  try {
    $keysJson = npx.cmd supabase projects api-keys --project-ref $resolvedProjectRef --reveal --output json
    $keys = $keysJson | ConvertFrom-Json
    $serviceRoleKey = ($keys | Where-Object { $_.name -eq "service_role" } | Select-Object -First 1).api_key

    if (-not $serviceRoleKey) {
      $serviceRoleKey = ($keys | Where-Object { $_.name -eq "default" -and $_.api_key -like "sb_secret_*" } | Select-Object -First 1).api_key
    }

    return $serviceRoleKey
  } finally {
    if ($setTemporaryAccessToken) {
      Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
    }
  }
}

$secretValue = Read-DotEnvValue -Name $EnvName
$supabaseUrl = Read-DotEnvValue -Name "SUPABASE_URL"
if (-not $supabaseUrl) {
  $supabaseUrl = Read-DotEnvValue -Name "VITE_SUPABASE_URL"
}
$serviceRoleKey = Resolve-ServiceRoleKey

if (-not $secretValue) {
  throw "Could not find $EnvName in .env.local, .env, or process environment."
}

if (-not $supabaseUrl) {
  throw "Could not find SUPABASE_URL or VITE_SUPABASE_URL in .env.local, .env, or process environment."
}

if (-not $serviceRoleKey) {
  throw "Could not resolve a service-role key. Provide SUPABASE_SERVICE_ROLE_KEY temporarily, or provide SUPABASE_ACCESS_TOKEN with a linked Supabase project."
}

$body = @{
  secret_name = $SecretName
  secret_value = $secretValue
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$supabaseUrl/rest/v1/rpc/civiq_set_vault_secret" `
  -Headers @{
    apikey = $serviceRoleKey
    Authorization = "Bearer $serviceRoleKey"
    "Content-Type" = "application/json"
  } `
  -Body $body | Out-Null

Write-Host "Synced $EnvName into Supabase Vault as $SecretName."
