# lifx-lan
[![Socket Badge](https://badge.socket.dev/npm/package/@west7014/lifx-lan/1.0.2)](https://badge.socket.dev/npm/package/@west7014/lifx-lan/1.0.2)

Control LIFX lights directly over your local network using the [LIFX LAN protocol](https://lan.developer.lifx.com/). No cloud required for most features.

## Installation

```bash
npm install lifx-lan
```

If you want to load your LIFX auth token from a `.env` file rather than hard-coding it:

```bash
npm install dotenv@16.4.5
```

## Quick Start

```js
const LifxLAN = require('lifx-lan');

const light = new LifxLAN('192.168.1.42');

light.on();
light.setColorHex(0xff6600);
light.setBrightnessPercent(80);
light.off(2000); // fade out over 2 seconds
```

## Authentication

Some features (effects, fetching light metadata) use the [LIFX HTTP API](https://api.developer.lifx.com/) and require a personal access token from [cloud.lifx.com](https://cloud.lifx.com).

**Option A — hard-code it:**
```js
const AUTH = 'your-lifx-token-here';
await light.setEffect('flame', AUTH);
```

**Option B — load from `.env` (requires `dotenv@16.4.5`):**
```
# .env
LIFX_TOKEN=your-lifx-token-here
```
```js
require('dotenv').config();
const AUTH = process.env.LIFX_TOKEN;
await light.setEffect('flame', AUTH);
```

All LAN-only methods (`on`, `off`, `setColor*`, `setBrightness*`, `setZones*`, `setTile*`) work without any token.

## API

### Constructor

```js
new LifxLAN(ip, port = 56700)
```

### Power

| Method | Description |
|---|---|
| `on(duration?)` | Turn light on |
| `off(duration?)` | Turn light off |
| `setPower(level, duration?)` | Raw power — `0` = off, `65535` = on |

### Color

| Method | Description |
|---|---|
| `setColor(hue, sat, bri, kelvin?, duration?)` | Set HSBK values directly (all 0–65535) |
| `setColorRGB(r, g, b, kelvin?, duration?)` | Set color from RGB (0–255 each) |
| `setColorHex(hex, kelvin?, duration?)` | Set color from hex e.g. `0xff6600` |

### Brightness

| Method | Description |
|---|---|
| `setBrightness(value, duration?)` | `0.0–1.0` or `0–65535` |
| `setBrightnessPercent(percent, duration?)` | `0–100` |
| `fadeBrightness(target, seconds)` | Smooth fade to brightness value |
| `fadeBrightnessPercent(percent, seconds)` | Smooth fade to brightness percent |

### Zones (multi-zone strips)

| Method | Description |
|---|---|
| `setZones(start, end, h, s, b, kelvin?, duration?, apply?)` | Set zone range by HSBK |
| `setZonesHex(start, end, hex, kelvin?, duration?, apply?)` | Set zone range by hex color |

### Tile / Matrix (LIFX Ceiling)

| Method | Description |
|---|---|
| `setTileState64(index, colors, duration?, x?, y?, width?)` | Set full 8×8 grid with an array of 64 HSBK objects |
| `setTileSolid(index, h, s, b, kelvin?, duration?)` | Fill a tile with a solid HSBK color |
| `setTileSolidHex(index, hex, kelvin?, duration?)` | Fill a tile with a solid hex color |

### LIFX Ceiling — High-Level API

The ceiling has an 8×8 grid: 6 rows of 8 downlight zones, with uplight strips on the top and bottom edges.

| Method | Description |
|---|---|
| `setAll(colors, kelvin?, duration?, mode?)` | Set entire ceiling — downlight + uplight |
| `setDownlight(colors, kelvin?, duration?, mode?)` | Set downlight zones only |
| `setUplight(color, kelvin?, duration?)` | Set uplight strips only |
| `setZonesCustom(zoneColors, kelvin?, duration?)` | Set all 8 zones individually — array of 8 hex colors |

`mode` can be `'solid'` (default), `'gradient'`, or `'palette'`. For `gradient` and `palette`, pass an array of hex colors.

### HTTP API (requires auth token)

| Method | Description |
|---|---|
| `getLightData(auth)` | Fetch light metadata from the LIFX cloud API |
| `setEffect(fxName, auth, options?)` | Start an effect: `'pulse'`, `'breathe'`, `'move'`, `'morph'`, `'flame'` |
| `stopEffect(auth)` | Stop any running effect |

### Utilities

| Method | Description |
|---|---|
| `rgbToHsbk(r, g, b, kelvin?)` | Convert RGB to a LIFX HSBK object |
| `close()` | Close the underlying UDP socket |

### Duration

All `duration` parameters are in **milliseconds** unless the method name says `seconds` (e.g. `fadeBrightness`).

## TypeScript

Type declarations are included. No additional setup required.

```ts
import LifxLAN, { HSBK, EffectName } from 'lifx-lan';
```

## License

See [LICENSE](./LICENSE).
