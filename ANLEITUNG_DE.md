# Anleitung: Repo Terrarium

Repo Terrarium ist eine kleine Web-App von Joshua Pond. Sie verwandelt ein öffentliches GitHub-Repository in ein lebendiges, animiertes Ökosystem.

Kurz gesagt: Du gibst ein Repo ein, zum Beispiel `rust-lang/rust`, und die App liest die öffentliche Dateistruktur. Daraus entstehen Farben, Bewegung, "DNA", Stats und ein eigenes Terrarium.

## Was genau passiert?

Die App nimmt Daten aus einem GitHub-Repo:

- Dateinamen und Ordner
- Programmiersprachen
- Anzahl Dateien
- Repo-Name
- Stars und Forks
- Default-Branch

Daraus berechnet sie einen festen Seed. Dieser Seed ist wie eine DNA. Gleiches Repo bedeutet gleiches Terrarium. Ein Fork oder eine andere Repo-Struktur erzeugt ein anderes Terrarium.

## Lokal starten

Im Projektordner:

```bash
npm start
```

Dann im Browser öffnen:

```text
http://localhost:4173
```

Du musst vorher nichts installieren. Es gibt keine extra Dependencies.

## Online benutzen

Sobald GitHub Pages aktiv ist:

```text
https://pondsec.github.io/repo-terrarium/
```

Du kannst auch direkt ein Repo übergeben:

```text
https://pondsec.github.io/repo-terrarium/?repo=rust-lang/rust
```

## Bedienung

`GitHub repo`: Hier gibst du ein Repo ein. Format: `owner/repo`, zum Beispiel `vercel/next.js`.

`grow`: Lädt das Repo und baut daraus ein neues Terrarium.

`pause`: Stoppt oder startet die Animation.

`pulse`: Schickt eine sichtbare Welle durch das Terrarium.

`sound`: Startet oder stoppt einen leisen generativen Sound. Der Sound basiert auf den wichtigsten Sprachen im Repo.

`snapshot`: Speichert ein PNG-Bild vom aktuellen Terrarium.

`share`: Kopiert einen Link zum aktuellen Repo-Terrarium.

Die Beispiel-Buttons unten laden bekannte Repos, damit man direkt testen kann.

## Was bedeuten die Anzeigen?

`DNA`: Eine kurze ID für das aktuelle Terrarium. Sie kommt aus dem Repo-Seed.

`files`: Anzahl der gelesenen Dateien.

`folders`: Anzahl der erkannten Ordner.

`entropy`: Wie gemischt die Dateitypen sind. Höher bedeutet mehr Vielfalt.

`stars` und `forks`: GitHub-Stats vom Repo.

`heat`: Ein interner Wert, der beeinflusst, wie lebendig und unruhig sich das Terrarium bewegt.

Die Sprachliste zeigt die wichtigsten Dateitypen bzw. Sprachen und deren Anteil.

## Warum es interessant ist

Normale Repo-Visualisierungen sind oft Balkendiagramme. Repo Terrarium macht daraus eher ein kleines Objekt, das man anschauen, bewegen, teilen und vergleichen kann.

Der Reddit-Hook ist einfach:

> "Drop a GitHub repo and it becomes a living terrarium."

Leute können ihre eigenen Repos testen, bekannte Open-Source-Projekte vergleichen und Screenshots posten.

## Wenn etwas nicht lädt

GitHub begrenzt anonyme API-Anfragen. Wenn zu viele Leute es gleichzeitig benutzen, kann die App kurz in den Offline-Modus fallen. Dann baut sie trotzdem ein Terrarium aus dem Repo-Namen, aber ohne echte Dateistruktur.

Das ist normal und kein Absturz.
