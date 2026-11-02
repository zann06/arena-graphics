$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000/api'
function J($o) { $o | ConvertTo-Json -Depth 6 }

$t = Invoke-RestMethod -Uri "$base/tournaments" -Method POST -ContentType 'application/json' -Body (J @{
  name = 'Phase3 Smoke Cup'; description = 'UI smoke test'; primaryColor = '#237bff'; secondaryColor = '#00d9ff'
})
"CREATE tournament -> $($t.id) $($t.name)"

$a = Invoke-RestMethod -Uri "$base/teams" -Method POST -ContentType 'application/json' -Body (J @{
  tournamentId = $t.id; name = 'Smoke Alpha'; shortName = 'ALP'; primaryColor = '#ff0000'; secondaryColor = '#ffffff'
})
$b = Invoke-RestMethod -Uri "$base/teams" -Method POST -ContentType 'application/json' -Body (J @{
  tournamentId = $t.id; name = 'Smoke Bravo'; shortName = 'BRV'; primaryColor = '#0000ff'; secondaryColor = '#ffff00'
})
"CREATE teams -> $($a.id), $($b.id)"

$p = Invoke-RestMethod -Uri "$base/players" -Method POST -ContentType 'application/json' -Body (J @{
  teamId = $a.id; realName = 'Smoke Player'; nickname = 'Smoke'; role = 'Jungler'; jerseyNumber = 7
})
"CREATE player -> $($p.id) $($p.nickname)"

$roster = Invoke-RestMethod -Uri "$base/teams/$($a.id)/roster"
"ROSTER -> $($roster.Count) player(s)"

$m = Invoke-RestMethod -Uri "$base/matches" -Method POST -ContentType 'application/json' -Body (J @{
  tournamentId = $t.id; teamAId = $a.id; teamBId = $b.id; format = 'BO3'; status = 'live'
})
"CREATE match -> $($m.id) BO3"

$g1 = Invoke-RestMethod -Uri "$base/matches/$($m.id)/games" -Method POST -ContentType 'application/json' -Body (J @{
  gameNumber = 1; blueTeamId = $a.id; redTeamId = $b.id; winnerTeamId = $a.id; durationSeconds = 1100
})
"GAME1 -> $($g1.seriesScore.teamAWins)-$($g1.seriesScore.teamBWins) complete=$($g1.isSeriesComplete)"

$g2 = Invoke-RestMethod -Uri "$base/matches/$($m.id)/games" -Method POST -ContentType 'application/json' -Body (J @{
  gameNumber = 2; blueTeamId = $b.id; redTeamId = $a.id; winnerTeamId = $b.id
})
"GAME2 -> $($g2.seriesScore.teamAWins)-$($g2.seriesScore.teamBWins) complete=$($g2.isSeriesComplete)"

$g3 = Invoke-RestMethod -Uri "$base/matches/$($m.id)/games" -Method POST -ContentType 'application/json' -Body (J @{
  gameNumber = 3; blueTeamId = $a.id; redTeamId = $b.id; winnerTeamId = $a.id
})
"GAME3 -> $($g3.seriesScore.teamAWins)-$($g3.seriesScore.teamBWins) complete=$($g3.isSeriesComplete) winner=$($g3.winnerTeamId)"

$m2 = Invoke-RestMethod -Uri "$base/matches/$($m.id)"
"MATCH STATE -> status=$($m2.status) winner=$($m2.winnerTeamId) format=$($m2.format)"

$u = Invoke-RestMethod -Uri "$base/tournaments/$($t.id)" -Method PUT -ContentType 'application/json' -Body (J @{ name = 'Phase3 Smoke Cup Updated' })
"UPDATE tournament -> $($u.name)"

$games = Invoke-RestMethod -Uri "$base/matches/$($m.id)/games"
"GAMES LIST -> $($games.Count) game(s)"

$d = Invoke-RestMethod -Uri "$base/teams/$($b.id)" -Method DELETE
"DELETE team -> $($d.message)"

$left = Invoke-RestMethod -Uri "$base/teams"
"REMAINING teams -> $($left.Count)"
