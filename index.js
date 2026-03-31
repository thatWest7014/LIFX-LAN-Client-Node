const dgram = require('dgram');
const axios = require('axios');

class LifxLAN {
  constructor(ip, port = 56700) {
    this.ip = ip;
    this.port = port;
    this.socket = dgram.createSocket('udp4');
    this.source = Math.floor(Math.random() * 0xFFFFFFFF); // Random source ID
    this.sequence = 0;
  }

  // Build LIFX protocol header
  buildHeader(messageType, size = 36, target = '000000000000', ackRequired = false, resRequired = false) {
    const header = Buffer.alloc(36);
    
    // Frame
    header.writeUInt16LE(size, 0); // Size
    header.writeUInt16LE(0x3400, 2); // Protocol (0x3400 = 1024 with tagged, addressable, protocol bits)
    header.writeUInt32LE(this.source, 4); // Source
    
    // Frame address
    const targetBytes = Buffer.from(target, 'hex');
    targetBytes.copy(header, 8); // Target (8 bytes)
    header.fill(0, 16, 22); // Reserved
    header.writeUInt8((resRequired ? 0x01 : 0x00) | (ackRequired ? 0x02 : 0x00), 22); // Ack/Res flags
    header.writeUInt8(this.sequence++, 23); // Sequence
    
    // Protocol header
    header.fill(0, 24, 32); // Reserved
    header.writeUInt16LE(messageType, 32); // Message type
    header.fill(0, 34, 36); // Reserved
    
    return header;
  }

  // Convert RGB to HSBK for LIFX
  rgbToHsbk(r, g, b, kelvin = 3500) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    let s = max === 0 ? 0 : delta / max;
    let br = max;
    
    if (delta !== 0) {
      if (max === r) {
        h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
      } else if (max === g) {
        h = ((b - r) / delta + 2) / 6;
      } else {
        h = ((r - g) / delta + 4) / 6;
      }
    }
    
    return {
      hue: Math.round(h * 65535),        // 0-65535
      saturation: Math.round(s * 65535), // 0-65535
      brightness: Math.round(br * 65535),// 0-65535
      kelvin: kelvin                     // 2500-9000
    };
  }

  // Set light color (message type 102)
  setColor(hue, saturation, brightness, kelvin = 3500, duration = 0) {
    const header = this.buildHeader(102, 49);
    const payload = Buffer.alloc(13);
    
    payload.writeUInt8(0, 0); // Reserved
    payload.writeUInt16LE(hue, 1);
    payload.writeUInt16LE(saturation, 3);
    payload.writeUInt16LE(brightness, 5);
    payload.writeUInt16LE(kelvin, 7);
    payload.writeUInt32LE(duration, 9); // Duration in milliseconds
    
    const packet = Buffer.concat([header, payload]);
    
    this.socket.send(packet, 0, packet.length, this.port, this.ip, (err) => {
      if (err) console.error('Error sending packet:', err);
      else console.log(`Color set to H:${hue} S:${saturation} B:${brightness} K:${kelvin}`);
    });
  }

  // Set light color from RGB
  setColorRGB(r, g, b, kelvin = 3500, duration = 0) {
    const hsbk = this.rgbToHsbk(r, g, b, kelvin);
    this.setColor(hsbk.hue, hsbk.saturation, hsbk.brightness, hsbk.kelvin, duration);
  }

  // Set light color from hex (0xRRGGBB)
  setColorHex(hex, kelvin = 3500, duration = 0) {
    const r = (hex >> 16) & 0xFF;
    const g = (hex >> 8) & 0xFF;
    const b = hex & 0xFF;
    this.setColorRGB(r, g, b, kelvin, duration);
  }

  // Set power state (message type 117)
  setPower(level, duration = 0) {
    const header = this.buildHeader(117, 42);
    const payload = Buffer.alloc(6);
    
    payload.writeUInt16LE(level, 0); // 0 = off, 65535 = on
    payload.writeUInt32LE(duration, 2); // Duration in milliseconds
    
    const packet = Buffer.concat([header, payload]);
    
    this.socket.send(packet, 0, packet.length, this.port, this.ip, (err) => {
      if (err) console.error('Error sending packet:', err);
      else console.log(`Power set to ${level > 0 ? 'ON' : 'OFF'}`);
    });
  }

  // Turn light on
  on(duration = 0) {
    this.setPower(65535, duration);
  }

  // Turn light off
  off(duration = 0) {
    this.setPower(0, duration);
  }

  // Set brightness (0.0 to 1.0 or 0 to 65535)
  // This adjusts brightness without changing color
  setBrightness(brightness, duration = 0) {
    // Normalize brightness to 0-65535 range
    const brightnessValue = brightness <= 1 ? Math.round(brightness * 65535) : brightness;
    
    // Use SetLightPower with level for instant brightness change
    // Or use SetColor with duration for smooth transition
    // We'll use message type 102 (SetColor) with reserved byte 0x01 to maintain current color
    const header = this.buildHeader(102, 49);
    const payload = Buffer.alloc(13);
    
    payload.writeUInt8(0x01, 0); // Reserved = 0x01 means "use current hue/saturation"
    payload.writeUInt16LE(0, 1); // Hue (ignored when reserved = 0x01)
    payload.writeUInt16LE(0, 3); // Saturation (ignored when reserved = 0x01)
    payload.writeUInt16LE(brightnessValue, 5); // Brightness
    payload.writeUInt16LE(0, 7); // Kelvin (0 means use current)
    payload.writeUInt32LE(duration, 9); // Duration in milliseconds
    
    const packet = Buffer.concat([header, payload]);
    
    this.socket.send(packet, 0, packet.length, this.port, this.ip, (err) => {
      if (err) console.error('Error sending packet:', err);
      else console.log(`Brightness set to ${Math.round((brightnessValue/65535)*100)}% over ${duration}ms`);
    });
  }

  // Convenience method: Set brightness as percentage (0-100)
  setBrightnessPercent(percent, duration = 0) {
    const brightness = Math.max(0, Math.min(100, percent)) / 100;
    this.setBrightness(brightness, duration);
  }

  // Fade brightness over time (in seconds)
  fadeBrightness(targetBrightness, seconds) {
    const duration = seconds * 1000; // Convert to milliseconds
    this.setBrightness(targetBrightness, duration);
  }

  // Fade brightness as percentage over time (in seconds)
  fadeBrightnessPercent(targetPercent, seconds) {
    const brightness = Math.max(0, Math.min(100, targetPercent)) / 100;
    const duration = seconds * 1000;
    this.setBrightness(brightness, duration);
  }

  // Set zones for multi-zone lights (message type 501)
  setZones(startZone, endZone, hue, saturation, brightness, kelvin = 3500, duration = 0, apply = 1) {
    const header = this.buildHeader(501, 49);
    const payload = Buffer.alloc(15);
    
    payload.writeUInt8(startZone, 0);
    payload.writeUInt8(endZone, 1);
    payload.writeUInt16LE(hue, 2);
    payload.writeUInt16LE(saturation, 4);
    payload.writeUInt16LE(brightness, 6);
    payload.writeUInt16LE(kelvin, 8);
    payload.writeUInt32LE(duration, 10);
    payload.writeUInt8(apply, 14); // 0 = NO_APPLY, 1 = APPLY, 2 = APPLY_ONLY
    
    const packet = Buffer.concat([header, payload]);
    
    this.socket.send(packet, 0, packet.length, this.port, this.ip, (err) => {
      if (err) console.error('Error sending packet:', err);
      else console.log(`Zones ${startZone}-${endZone} set`);
    });
  }

  // Set zones with hex color
  setZonesHex(startZone, endZone, hex, kelvin = 3500, duration = 0, apply = 1) {
    const r = (hex >> 16) & 0xFF;
    const g = (hex >> 8) & 0xFF;
    const b = hex & 0xFF;
    const hsbk = this.rgbToHsbk(r, g, b, kelvin);
    this.setZones(startZone, endZone, hsbk.hue, hsbk.saturation, hsbk.brightness, kelvin, duration, apply);
  }

  // Set tile state for matrix devices (message type 715)
  // tileIndex: which tile/segment (0-based)
  // colors: array of 64 HSBK objects for 8x8 grid
  setTileState64(tileIndex, colors, duration = 0, x = 0, y = 0, width = 8) {
    // Payload structure:
    // tile_index: 1, length: 1, reserved: 1, x: 1, y: 1, width: 1, duration: 4 = 10 bytes
    // colors: 64 * 8 bytes = 512 bytes
    // Total: 522 bytes
    const payloadSize = 10 + (64 * 8); // 522 bytes
    const totalSize = 36 + payloadSize; // 558 bytes total
    const header = this.buildHeader(715, totalSize);
    const payload = Buffer.alloc(payloadSize);
    
    payload.writeUInt8(tileIndex, 0);
    payload.writeUInt8(1, 1); // Length (1 tile)
    payload.writeUInt8(0, 2); // Reserved
    payload.writeUInt8(x, 3); // X position
    payload.writeUInt8(y, 4); // Y position
    payload.writeUInt8(width, 5); // Width
    payload.writeUInt32LE(duration, 6); // Duration at offset 6-9
    
    // Write 64 colors (8x8 grid) starting at offset 10
    for (let i = 0; i < 64; i++) {
      const offset = 10 + (i * 8);
      const color = colors[i] || { hue: 0, saturation: 0, brightness: 0, kelvin: 3500 };
      payload.writeUInt16LE(color.hue, offset);
      payload.writeUInt16LE(color.saturation, offset + 2);
      payload.writeUInt16LE(color.brightness, offset + 4);
      payload.writeUInt16LE(color.kelvin, offset + 6);
    }
    
    const packet = Buffer.concat([header, payload]);
    
    this.socket.send(packet, 0, packet.length, this.port, this.ip, (err) => {
      if (err) console.error('Error sending packet:', err);
      else console.log(`Tile ${tileIndex} state set`);
    });
  }

  // Helper: Set a single tile to one color
  setTileSolid(tileIndex, hue, saturation, brightness, kelvin = 3500, duration = 0) {
    const color = { hue, saturation, brightness, kelvin };
    const colors = new Array(64).fill(color);
    this.setTileState64(tileIndex, colors, duration);
  }

  // Helper: Set a single tile to one hex color
  setTileSolidHex(tileIndex, hex, kelvin = 3500, duration = 0) {
    const r = (hex >> 16) & 0xFF;
    const g = (hex >> 8) & 0xFF;
    const b = hex & 0xFF;
    const hsbk = this.rgbToHsbk(r, g, b, kelvin);
    this.setTileSolid(tileIndex, hsbk.hue, hsbk.saturation, hsbk.brightness, kelvin, duration);
  }

  // LIFX Ceiling specific methods
  // The ceiling has an 8x8 grid where zones are arranged as shown in your app
  
  // Set all zones (downlight + uplight)
  setAll(colors, kelvin = 3500, duration = 0, mode = 'solid') {
    // Mode can be: 'solid', 'gradient', 'blend', 'palette'
    if (mode === 'solid') {
      // Single color for everything
      const color = Array.isArray(colors) ? colors[0] : colors;
      this.setColorHex(color, kelvin, duration);
    } else if (mode === 'gradient') {
      // Gradient across entire light
      const colorArray = Array.isArray(colors) ? colors : [colors];
      const gridColors = this.createHorizontalGradient(colorArray, colorArray[0], kelvin);
      this.setTileState64(0, gridColors, duration);
    } else if (mode === 'palette') {
      // Palette pattern across entire light
      const colorArray = Array.isArray(colors) ? colors : [colors];
      const gridColors = this.createPalettePattern(colorArray, colorArray, kelvin);
      this.setTileState64(0, gridColors, duration);
    }
  }

  // Set downlight only (all 8 zones in the middle rows)
  setDownlight(colors, kelvin = 3500, duration = 0, mode = 'solid') {
    const colorArray = Array.isArray(colors) ? colors : [colors];
    
    if (mode === 'solid') {
      // Set all downlight zones to the same color
      const gridColors = this.createCeilingGrid(colorArray[0], null, colorArray);
      this.setTileState64(0, gridColors, duration);
    } else {
      // Apply pattern to downlight zones
      const gridColors = this.createCeilingGridPattern(colorArray, null, mode, kelvin);
      this.setTileState64(0, gridColors, duration);
    }
  }

  // Set uplight only (top and bottom rows with null edges)
  setUplight(color, kelvin = 3500, duration = 0, mode = 'solid') {
    const colorArray = Array.isArray(color) ? color : [color];
    
    if (mode === 'solid') {
      const gridColors = this.createCeilingGrid(null, colorArray[0], null);
      this.setTileState64(0, gridColors, duration);
    } else {
      // Palette mode for uplight
      const gridColors = this.createCeilingGridPattern(null, colorArray, mode, kelvin);
      this.setTileState64(0, gridColors, duration);
    }
  }

  // Set specific zones (1-8, left to right)
  // zoneColors: array of 8 hex colors, one for each zone
  setZonesCustom(zoneColors, kelvin = 3500, duration = 0) {
    const gridColors = this.createCeilingGrid(null, null, zoneColors, kelvin);
    this.setTileState64(0, gridColors, duration);
  }

  // Helper: Create the 8x8 grid for LIFX Ceiling
  // Layout: [null,null,1,2,3,4,null,null] (uplight top)
  //         [1,2,3,4,5,6,7,8] (zones x6)
  //         [null,null,1,2,3,4,null,null] (uplight bottom)
  createCeilingGrid(downlightColor = null, uplightColor = null, zoneColors = null, kelvin = 3500) {
    const grid = [];
    const black = { hue: 0, saturation: 0, brightness: 0, kelvin };
    
    // Convert hex colors to HSBK
    const getHSBK = (hex) => {
      if (hex === null || hex === undefined) return black;
      const r = (hex >> 16) & 0xFF;
      const g = (hex >> 8) & 0xFF;
      const b = hex & 0xFF;
      return this.rgbToHsbk(r, g, b, kelvin);
    };

    // Row 0: Uplight top [null,null,1,2,3,4,null,null]
    for (let i = 0; i < 8; i++) {
      if (i < 2 || i > 5) {
        grid.push(black);
      } else {
        grid.push(uplightColor !== null ? getHSBK(uplightColor) : black);
      }
    }

    // Rows 1-6: Downlight zones [1,2,3,4,5,6,7,8]
    for (let row = 1; row <= 6; row++) {
      for (let zone = 0; zone < 8; zone++) {
        if (zoneColors && Array.isArray(zoneColors)) {
          grid.push(getHSBK(zoneColors[zone]));
        } else if (downlightColor !== null) {
          grid.push(getHSBK(downlightColor));
        } else {
          grid.push(black);
        }
      }
    }

    // Row 7: Uplight bottom [null,null,1,2,3,4,null,null]
    for (let i = 0; i < 8; i++) {
      if (i < 2 || i > 5) {
        grid.push(black);
      } else {
        grid.push(uplightColor !== null ? getHSBK(uplightColor) : black);
      }
    }

    return grid;
  }

  // Helper: Create gradient/blend/palette patterns
  createCeilingGridPattern(downlightColors, uplightColors, mode, kelvin = 3500) {
    const grid = [];
    const black = { hue: 0, saturation: 0, brightness: 0, kelvin };
    
    const getHSBK = (hex) => {
      if (hex === null || hex === undefined) return black;
      const r = (hex >> 16) & 0xFF;
      const g = (hex >> 8) & 0xFF;
      const b = hex & 0xFF;
      return this.rgbToHsbk(r, g, b, kelvin);
    };

    // For now, implementing basic gradient/palette
    // You can expand this based on how the app implements these modes
    
    if (mode === 'gradient' && downlightColors && downlightColors.length >= 2) {
      // Horizontal gradient across zones
      return this.createHorizontalGradient(downlightColors, uplightColors, kelvin);
    } else if (mode === 'palette' && downlightColors) {
      // Distribute palette colors across zones
      return this.createPalettePattern(downlightColors, uplightColors, kelvin);
    }
    
    // Default to solid
    return this.createCeilingGrid(
      downlightColors ? downlightColors[0] : null,
      uplightColors ? uplightColors[0] : null,
      null,
      kelvin
    );
  }

  // Create horizontal gradient
  createHorizontalGradient(colors, uplightColor = null, kelvin = 3500) {
    const grid = [];
    const black = { hue: 0, saturation: 0, brightness: 0, kelvin };
    
    const getHSBK = (hex) => {
      if (hex === null || hex === undefined) return black;
      const r = (hex >> 16) & 0xFF;
      const g = (hex >> 8) & 0xFF;
      const b = hex & 0xFF;
      return this.rgbToHsbk(r, g, b, kelvin);
    };

    const uplightHSBK = uplightColor ? getHSBK(uplightColor) : black;

    // Row 0: Uplight
    for (let i = 0; i < 8; i++) {
      grid.push(i < 2 || i > 5 ? black : uplightHSBK);
    }

    // Rows 1-6: Gradient across 8 zones
    for (let row = 1; row <= 6; row++) {
      for (let zone = 0; zone < 8; zone++) {
        // Interpolate between colors based on zone position
        const colorIndex = Math.floor((zone / 7) * (colors.length - 1));
        const nextIndex = Math.min(colorIndex + 1, colors.length - 1);
        const t = ((zone / 7) * (colors.length - 1)) - colorIndex;
        
        const c1 = getHSBK(colors[colorIndex]);
        const c2 = getHSBK(colors[nextIndex]);
        
        // Linear interpolation
        grid.push({
          hue: Math.round(c1.hue + (c2.hue - c1.hue) * t),
          saturation: Math.round(c1.saturation + (c2.saturation - c1.saturation) * t),
          brightness: Math.round(c1.brightness + (c2.brightness - c1.brightness) * t),
          kelvin
        });
      }
    }

    // Row 7: Uplight
    for (let i = 0; i < 8; i++) {
      grid.push(i < 2 || i > 5 ? black : uplightHSBK);
    }

    return grid;
  }

  // Create palette pattern (distribute colors across zones)
  createPalettePattern(colors, uplightColors = null, kelvin = 3500) {
    const grid = [];
    const black = { hue: 0, saturation: 0, brightness: 0, kelvin };
    
    const getHSBK = (hex) => {
      if (hex === null || hex === undefined) return black;
      const r = (hex >> 16) & 0xFF;
      const g = (hex >> 8) & 0xFF;
      const b = hex & 0xFF;
      return this.rgbToHsbk(r, g, b, kelvin);
    };

    const uplightHSBK = uplightColors && uplightColors.length > 0 ? getHSBK(uplightColors[0]) : black;

    // Row 0: Uplight
    for (let i = 0; i < 8; i++) {
      grid.push(i < 2 || i > 5 ? black : uplightHSBK);
    }

    // Rows 1-6: Palette distributed across zones
    for (let row = 1; row <= 6; row++) {
      for (let zone = 0; zone < 8; zone++) {
        const colorIndex = zone % colors.length;
        grid.push(getHSBK(colors[colorIndex]));
      }
    }

    // Row 7: Uplight
    for (let i = 0; i < 8; i++) {
      grid.push(i < 2 || i > 5 ? black : uplightHSBK);
    }

    return grid;
  }

  // Web API Methods - Require authentication token
  
  // Get light data from LIFX HTTP API
  async getLightData(auth) {
    const options = {
      method: 'GET',
      url: 'https://api.lifx.com/v1/lights',
      headers: {
        accept: 'application/json',
        Authorization: `Bearer ${auth}`
      }
    };
    
    try {
      const response = await axios.request(options);
      // Find the light matching this IP address
      const light = response.data.find(l => 
        l.group && l.group.id && this.ip
      ) || response.data[0];
      
      return light;
    } catch (error) {
      console.error('Error fetching light data:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  // Set effect using LIFX HTTP API
  // Available effects: pulse, breathe, move, morph, flame
  async setEffect(fxName, auth, options = {}) {
    try {
      // First get the light ID
      const lightData = await this.getLightData(auth);
      const lightId = lightData.id;
      
      // Default options for each effect
      const defaultOptions = {
        pulse: {
          color: 'blue',
          from_color: null,
          period: 1,
          cycles: 5,
          persist: false,
          power_on: true,
          peak: 0.5
        },
        breathe: {
          color: 'blue',
          from_color: null,
          period: 1,
          cycles: 5,
          persist: false,
          power_on: true,
          peak: 0.5
        },
        move: {
          direction: 'forward',
          period: 1,
          cycles: 5,
          power_on: true
        },
        morph: {
          period: 5,
          duration: null,
          palette: ['red', 'green', 'blue'],
          power_on: true
        },
        flame: {
          period: 5,
          duration: null,
          power_on: true
        }
      };

      // Merge user options with defaults
      const effectOptions = {
        ...defaultOptions[fxName],
        ...options
      };

      const requestOptions = {
        method: 'POST',
        url: `https://api.lifx.com/v1/lights/${lightId}/effects/${fxName}`,
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${auth}`,
          'content-type': 'application/json'
        },
        data: effectOptions
      };

      const response = await axios.request(requestOptions);
      console.log(`Effect '${fxName}' applied successfully`);
      return response.data;
    } catch (error) {
      console.error('Error applying effect:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  // Stop any running effect
  async stopEffect(auth) {
    try {
      const lightData = await this.getLightData(auth);
      const lightId = lightData.id;

      const options = {
        method: 'POST',
        url: `https://api.lifx.com/v1/lights/${lightId}/effects/off`,
        headers: {
          accept: 'application/json',
          Authorization: `Bearer ${auth}`
        }
      };

      const response = await axios.request(options);
      console.log('Effect stopped');
      return response.data;
    } catch (error) {
      console.error('Error stopping effect:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  // Close socket
  close() {
    this.socket.close();
  }
}

module.exports = LifxLAN;