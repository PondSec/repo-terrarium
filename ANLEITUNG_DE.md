# Anleitung: Repo Terrarium

Repo Terrarium ist eine kleine Web-App von Joshua Pond. Sie verwandelt ein öffentliches GitHub-Repository in ein lebendiges, animiertes Ökosystem mit sichtbarem DNA-Strang.

Kurz gesagt: Du gibst ein Repo ein, zum Beispiel `rust-lang/rust`, und die App liest die öffentliche Dateistruktur. Daraus entstehen Farben, Bewegung, eine A/C/G/T-DNA, Gene, Organismen, Nahrung, Stats und ein eigenes Terrarium.

## Was genau passiert?

Die App nimmt Daten aus einem GitHub-Repo:

- Dateinamen und Ordner
- Programmiersprachen
- Anzahl Dateien
- Repo-Name
- Stars und Forks
- Default-Branch

Daraus berechnet sie einen festen Seed. Aus diesem Seed wird eine digitale DNA-Sequenz mit den Basen `A`, `C`, `G` und `T`.

Die App liest diese DNA in Dreiergruppen, also als Codons. Aus diesen Codons entstehen Gene wie:

- `motility`: wie schnell sich Organismen bewegen
- `metabolism`: wie schnell sie Energie verbrauchen
- `replication`: wie wahrscheinlich Nachwuchs entsteht
- `mutation`: wie stark Kinder vom Elternorganismus abweichen
- `perception`: wie gut Organismen Nahrung finden
- `adhesion`: wie stark Organismen zusammenhalten
- `photosynthesis`: wie viel Nahrung im Terrarium nachwächst
- `longevity`: wie lange Organismen leben

Wichtig: Das ist keine echte Labor-Biologie. Es ist eine digitale DNA, aber sie benutzt richtige DNA-Buchstaben und Codon-Logik. Gleiches Repo bedeutet gleiche DNA. Ein Fork oder eine andere Repo-Struktur erzeugt eine andere DNA.

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

`pulse`: Schickt eine sichtbare Welle durch das Terrarium und streut neue Nahrung.

`sound`: Startet oder stoppt einen leisen generativen Sound. Der Sound basiert auf den wichtigsten Sprachen im Repo.

`snapshot`: Speichert ein PNG-Bild vom aktuellen Terrarium.

`share`: Kopiert einen Link zum aktuellen Repo-Terrarium.

`fork`: Öffnet die GitHub-Seite, auf der man das aktuelle Repo forken kann.

Die Beispiel-Buttons unten laden bekannte Repos, damit man direkt testen kann.

## Was bedeuten die Anzeigen?

`DNA`: Eine kurze ID für das aktuelle Terrarium. Sie kommt aus dem Repo-Seed, dem GC-Anteil und einem dominanten Codon.

`DNA strand`: Rechts im Interface und direkt im Canvas sieht man den DNA-Strang. Die farbigen Buchstaben sind Basen.

`GC`: Anteil von `G` und `C` in der digitalen DNA.

`mutation`: Wie stark Forks, Dateibaum und Gene die Mutationsrate beeinflussen.

`birth`: Wie stark das Replikations-Gen ausgeprägt ist.

`files`: Anzahl der gelesenen Dateien.

`folders`: Anzahl der erkannten Ordner.

`entropy`: Wie gemischt die Dateitypen sind. Höher bedeutet mehr Vielfalt.

`stars` und `forks`: GitHub-Stats vom Repo.

`species`: Anzahl der erkannten Sprach-/Dateityp-Gruppen.

Die Sprachliste zeigt die wichtigsten Dateitypen bzw. Sprachen und deren Anteil.

## Warum es interessant ist

Normale Repo-Visualisierungen sind oft Balkendiagramme. Repo Terrarium macht daraus eher ein kleines Objekt, das man anschauen, bewegen, teilen und vergleichen kann.

Der Reddit-Hook ist einfach:

> "Drop a GitHub repo and it becomes a living terrarium with DNA."

Leute können ihre eigenen Repos testen, bekannte Open-Source-Projekte vergleichen, Forks verändern und Screenshots posten. Wenn jemand das Repo forkt und etwas umbaut, bekommt der Fork ein anderes Terrarium.

## So kann man mitwirken

1. Repo im Terrarium öffnen.
2. Auf `fork` klicken.
3. Im Fork Dateien ändern, neue Ordner anlegen oder eine andere Sprache hinzufügen.
4. Den Fork wieder im Terrarium öffnen.
5. Die neue DNA mit dem Original vergleichen.

Dadurch wird ein GitHub-Fork wirklich wie eine Mutation sichtbar.

## Wenn etwas nicht lädt

GitHub begrenzt anonyme API-Anfragen. Wenn zu viele Leute es gleichzeitig benutzen, kann die App kurz in den Offline-Modus fallen. Dann baut sie trotzdem ein Terrarium aus dem Repo-Namen, aber ohne echte Dateistruktur.

Das ist normal und kein Absturz.
