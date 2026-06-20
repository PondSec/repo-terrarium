# Anleitung: Repo Terrarium

Repo Terrarium ist eine WebGL-App von Joshua Pond. Sie verwandelt ein öffentliches GitHub-Repository in ein digitales Terrarium mit eigener DNA.

Du gibst ein Repo ein, zum Beispiel:

```text
rust-lang/rust
```

Die App liest die öffentliche Repo-Struktur und erzeugt daraus:

- eine A/C/G/T-DNA
- eine sichtbare DNA-Helix
- Gene und Gen-Ausprägungen
- eine matte, lebendige WebGL-Colony
- eine eindeutige DNA-ID

## Schnellstart

Online:

```text
https://pondsec.github.io/repo-terrarium/
```

Lokal:

```bash
npm start
```

Dann öffnen:

```text
http://localhost:4173
```

## Bedienung

`GitHub repo`: Repo im Format `owner/repo` eingeben.

`grow`: Repo laden und daraus ein neues Terrarium wachsen lassen.

`inspect`: Details öffnen. Dort findest du DNA-Sequenz, Gene, Beispiel-Repos und Sprachmix.

`pause`: Bewegung stoppen oder fortsetzen.

`pulse`: Die Colony kurz stören.

`sound`: Einen leisen generativen Ton aus dem Repo-Genom starten.

`snapshot`: Aktuelle Ansicht als PNG speichern.

`share`: Link zum aktuellen Repo-Terrarium kopieren.

`fork`: GitHub-Fork-Seite für das aktuelle Repo öffnen.

## Was passiert technisch?

Repo Terrarium nimmt öffentliche GitHub-Daten:

- Dateipfade
- Dateigrößen
- Ordnerstruktur
- erkannte Sprachen und Dateitypen
- Stars
- Forks
- Default-Branch
- Repo-Name

Daraus wird eine deterministische DNA-Sequenz gebaut. Deterministisch bedeutet: Gleiches Repo, gleiche DNA, gleiche Grundform.

Die DNA benutzt die echten DNA-Buchstaben:

```text
A C G T
```

Diese Sequenz wird in Dreiergruppen gelesen, also als Codons. Daraus berechnet die App Gene wie:

- `motility`: Bewegung
- `metabolism`: Energieverbrauch
- `replication`: Wachstum und Geburt
- `mutation`: Veränderung
- `perception`: Reaktion auf das Feld
- `adhesion`: Zusammenhalt
- `photosynthesis`: Nährstoff-Nachbildung
- `longevity`: Lebensdauer

Das ist keine Labor-Biologie. Es ist ein digitales Modell, das echte DNA-Begriffe benutzt, um Repository-Struktur sichtbar zu machen.

## Warum Forks spannend sind

Ein Fork bekommt eine andere DNA, weil sich Owner/Repo-Seed und oft auch Dateien verändern.

So kannst du eine Mutation erzeugen:

1. Repo im Terrarium öffnen.
2. Auf `fork` klicken.
3. Im Fork Dateien ändern, löschen oder hinzufügen.
4. Den Fork wieder in Repo Terrarium öffnen.
5. Original und Fork vergleichen.

Dadurch wird ein GitHub-Fork wie eine sichtbare digitale Mutation.

## UI-Idee

Die Oberfläche zeigt nur das Wichtigste direkt:

- Repo
- DNA-ID
- Status
- wichtigste Metriken
- WebGL-Colony
- sichtbare DNA-Helix

Alles Tiefere liegt im `inspect`-Panel. Dadurch bleibt die Szene ruhig und man wird nicht direkt mit Daten erschlagen.

## Hinweis zu GitHub-Limits

Die App nutzt öffentliche GitHub-Anfragen ohne Login. Wenn GitHub rate-limitiert, erstellt die App trotzdem ein Offline-Genom aus dem Repo-Namen. Dann funktioniert die Demo weiter, nur ohne echte Dateibaumdaten.
