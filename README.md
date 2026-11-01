# Penalty Champion – Pokal 26/27

Elfmeter-Turnier als Web-App: Wähle einen der 64 Teilnehmer des DFB-Pokals 2026/27 und spiel dich durch sechs Runden bis ins Finale nach Berlin. Jede Partie wird direkt im Elfmeterschießen entschieden.

## Spielen

- **Zielen:** Ins Tor tippen (oder klicken) und ziehen, loslassen bestätigt die Richtung.
- **Regler stoppen:** Der Regler bestimmt die Höhe und damit auch die Härte des Schusses. Grün ist im Tor, Orange trifft die Latte, Rot fliegt drüber. Flache Schüsse sind sicher, aber langsam; Schüsse in den Winkel sind kaum zu halten, aber riskant.
- **Halten:** Vor dem Anlauf links, Mitte oder rechts wählen (Buttons, Tippen ins Tor oder Pfeiltasten). Wer zu lange wartet, bleibt stehen.
- Tastatur: Pfeiltasten zum Zielen, Leertaste/Enter zum Bestätigen und Schießen, Pfeiltasten oder 1/2/3 zum Halten.

Regeln wie im echten Elfmeterschießen: fünf Schützen pro Team, vorzeitige Entscheidung, danach Sudden Death. Die 1. Runde nutzt die echten ausgelosten Paarungen, ab der 2. Runde wird zufällig gelost. Alle anderen Partien werden anhand der Teamstärke simuliert. Der Regler wird von Runde zu Runde etwas schneller.

## Starten

Reines HTML/CSS/JavaScript ohne Build-Schritt. Lokal reicht ein statischer Server:

```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Die App ist eine PWA (Manifest + Service Worker) und lässt sich auf dem Handy über „Zum Home-Bildschirm“ installieren. Für GitHub Pages einfach den Branch als Quelle auswählen.

## Aufbau

| Datei | Inhalt |
| --- | --- |
| `js/teams.js` | 64 Teams mit Farben, Logo-Muster, Stärke und die 32 Erstrunden-Paarungen |
| `js/scene.js` | Canvas-Szene: Stadion, Tor mit Netz, Torwart, Schütze, Ballflug, Regler |
| `js/app.js` | Bildschirme, Spielablauf, Steuerung |
| `js/tournament.js` | Auslosung, Simulation, Spielstand (localStorage) |
| `js/audio.js` | Synthetische Sounds (Web Audio) |

Die Teamlogos sind keine Original-Wappen, sondern Kreise in den zwei Vereinsfarben. Bei einigen Amateurklubs sind die Farben angenähert.
