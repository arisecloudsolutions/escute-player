# @escute/player

Player de áudio e vídeo para React, multipropósito: arquivos locais, streams HLS,
YouTube, SoundCloud, Vimeo, Spotify e embeds genéricos — com fila, repetição,
Media Session, Picture-in-Picture e atalhos de teclado.

Sem banco, sem storage, sem credencial e sem framework de roteamento. A catálogo
entra pela sua aplicação.

```
npm install @escute/player
```

## Uso

```tsx
import { Player, PlayerProvider, type CatalogSource } from "@escute/player";

const source: CatalogSource = {
  async loadPlaylists() {
    return [
      {
        id: "mix",
        title: "Mix",
        tracks: [
          {
            id: "1",
            title: "Faixa local",
            artist: "Banda",
            durationSeconds: 212,
            source: { kind: "file", url: "https://cdn.exemplo/1.mp3" },
          },
          { id: "2", title: "Vídeo", source: { kind: "youtube", id: "dQw4w9WgXcQ" } },
          { id: "3", title: "Playlist", source: { kind: "spotify", url: "https://open.spotify.com/…" } },
        ],
      },
    ];
  },
};

export function App() {
  return (
    <PlayerProvider source={source} storageKey="meu:player">
      <MeuApp />
      <Player labels={{ play: "Tocar", pause: "Pausar", empty: "Nada para tocar" }} />
    </PlayerProvider>
  );
}
```

## Fontes suportadas

| `source.kind` | Seek | Observação |
|---|---|---|
| `file` | ✅ | Áudio/vídeo progressivo (mp3, m4a, mp4…) |
| `stream` | ✅ | Stream progressivo genérico |
| `hls` | ✅ | Playlist `.m3u8` |
| `youtube` | ❌ | O embed oficial não expõe timeline; informe `durationSeconds` se souber |
| `soundcloud` / `vimeo` / `spotify` | ❌ | Delegado ao provedor |
| `embed` | ❌ | Qualquer iframe; informe `title` |
| `custom` | — | Para o seu motor |

Nada é inventado: `trackCapabilities()` diz a verdade sobre cada fonte em vez de
simular seek onde ele não existe.

```ts
import { trackCapabilities } from "@escute/player";

trackCapabilities({ id, title, source: { kind: "youtube", id } });
// { mediaKind: "embed", seekable: false, hasDuration: false, requiresNetwork: true, offline: false }
```

## Trazer seu próprio motor

O `react-player` (MIT) é o motor padrão. Se você já usa outro — `<audio>`
nativo, `video.js`, Web Audio — implemente `MediaEngine` e troque:

```tsx
import { Player, type MediaEngine } from "@escute/player";

const nativeEngine: MediaEngine = {
  Component: ({ url, playing, volume, onPosition, onEnded }) => (
    <audio src={url} autoPlay={playing} muted={volume === 0} onTimeUpdate={(e) => onPosition(e.currentTarget.currentTime)} onEnded={onEnded} />
  ),
  seekable: () => true,
};

<Player engine={nativeEngine} />;
```

Fila, atalhos, Media Session e acessibilidade continuam funcionando.

## API

### Componentes e hooks

| Export | Papel |
|---|---|
| `PlayerProvider` | Estado, fila, volume, repetição, persistência |
| `usePlayer()` | Estado e ações (`playTrack`, `next`, `seek`, `nudgeVolume`, …) |
| `Player` | Interface; renderiza o motor e reporta progresso/erro |
| `useKeyboardShortcuts` | Atalhos reutilizáveis fora do componente |
| `updateMediaSession` / `clearMediaSession` | Integração com o sistema operacional |

### Comportamento

- `repeat: "off"` **para** na última faixa; `"all"` dá a volta; `"one"` repete.
- `previous()` reinicia a faixa atual quando já passou de 3 s.
- Nada toca sem gesto do usuário; o estado inicial é sempre pausado.
- O jogador **não baixa** mídia e não adiciona `download`/`nativeControls`.

### Acessibilidade

Controles rotulados, `aria-pressed` nos toggles, `aria-expanded` na fila,
região `aria-live` para buffer/erro e slider desabilitado — com explicação — quando
a fonte não permite seek. O contêiner é `role="region"` com rótulo.

## Estilização

Sem framework imposto. Duas opções, combináveis:

```css
:root {
  --player-bg: #0b1020;
  --player-fg: #eef2ff;
  --player-border: #24304b;
  --player-accent: #22d3ee;
  --player-error: #f87171;
  --player-font: system-ui, sans-serif;
}
```

```tsx
<Player theme={{ container: { borderRadius: 12 } }} />
```

## Segurança e direitos

- O pacote não extrai áudio/vídeo de terceiros nem contorna restrições de
  provedor: `embed`/`youtube`/`spotify` delegam ao player oficial.
- Traga apenas mídia que você tem direito de distribuir; use
  `track.rightsNote` para exibir créditos.

## Desenvolvimento

```bash
npm install
npm run check     # typecheck + testes
npm run build     # ESM + CJS + tipos
npm pack --dry-run
```

## Licença

[MIT](LICENSE)
