@echo off
:: Modify below path accordingly
:: start "" "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" ^
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
--kiosk ^
--disable-cache ^
--autoplay-policy=no-user-gesture-required ^
--disable-infobars ^
--disable-notifications ^
--disable-translate ^
--disable-component-update ^
--no-first-run ^
https://jackbdu.com/mouth-synth/?exhibit=true
exit
