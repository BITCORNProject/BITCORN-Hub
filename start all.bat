start node _data-service/app
TIMEOUT /T 5 /NOBREAK
start node _settings-service/app
TIMEOUT /T 5 /NOBREAK
start node _twitch-service/app
TIMEOUT /T 5 /NOBREAK
start node _bot-service/app
TIMEOUT /T 2 /NOBREAK
cmd /k