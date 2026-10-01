# @arise/escute-player

Player de música reutilizável do [escute.online](https://escute.online), extraído do
player legado do Junkie Dust.

Repositório próprio — **sem monorepo**. O portal, os fronts de banda e o próprio
Junkie Dust consomem este pacote versionado.

## O que é

- **Client-only.** Sem banco, sem storage, sem credencial, sem router. Não conhece
  Next.js, MySQL nem DigitalOcean Spaces.
- **Contrato neutro** (`Track`, `Playlist`, `CatalogSource`). A fonte de dados é
  injetada pelo consumidor: hoje um seed versionado, amanhã `escute-online-api`.
- **Multi-engine** via `react-player` v3 (MIT): áudio próprio, YouTube, SoundCloud.
- **UI sem opinião visual**: labels e tokens de estilo são fornecidos pelo host,
  então o mesmo componente serve ao portal e a qualquer front futuro.

## Uso

```tsx
import { Player, PlayerProvider } from "@arise/escute-player";

<PlayerProvider source={source} storageKey="escute:player">
  {children}
  <Player labels={{ play: "Tocar", pause: "Pausar" }} />
</PlayerProvider>
```

`source` implementa `CatalogSource`:

```ts
const source: CatalogSource = {
  async loadPlaylists() {
    return [{ id: "rehearsal", title: "Ensaio", tracks: [...] }];
  },
};
```

## API

| Hook / componente | Papel |
|---|---|
| `PlayerProvider` | Estado, fila, volume, repetição, persistência de preferências |
| `usePlayer()` | Acesso a estado e ações (`playTrack`, `next`, `seek`, …) |
| `Player` | Interface; possui o elemento de mídia e reporta progresso/erro |
| `formatDuration` | `m:ss` / `h:mm:ss` com `--:--` quando desconhecido |

Comportamento de fila: com `repeat: "off"` a reprodução **para** na última faixa;
com `"all"` dá a volta; com `"one"` repete. `previous()` reinicia a faixa atual
quando o tempo passou de 3 s.

## Não faz

- Não extrai áudio de terceiros. `mediaKind: "embed"` aponta para a página oficial
  do provedor; áudio próprio deve estar hospedado por quem tem o direito.
- Não dá download. `nativeControls` fica desligado por padrão.
- Não autoplaya sem gesto do usuário.

## Desenvolvimento

```bash
npm install
npm run check   # typecheck + testes
npm run build
```

## Versão 0.1.0 — escopo

Entregue: contrato neutro, provider com fila/repetição/volume/buffer/erro,
interface acessível (labels localizados, `aria-pressed`, região `aria-live`) e
persistência de preferências.

Fora de escopo (planejado): Media Session API, equalizador, crossfade, gapless,
download offline e telemetria.

## Licença

Proprietário (`UNLICENSED`), © Arise Cloud Solutions. Dependências de terceiros
(MIT): `react-player`.
