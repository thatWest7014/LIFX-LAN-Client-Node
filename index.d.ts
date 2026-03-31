/// <reference types="node" />
interface HSBK {
    hue: number;
    saturation: number;
    brightness: number;
    kelvin: number;
}
interface LightData {
    id: string;
    label: string;
    connected: boolean;
    power: 'on' | 'off';
    color: {
        hue: number;
        saturation: number;
        kelvin: number;
    };
    brightness: number;
    group: {
        id: string;
        name: string;
    };
    location: {
        id: string;
        name: string;
    };
    [key: string]: unknown;
}
type EffectName = 'pulse' | 'breathe' | 'move' | 'morph' | 'flame';
type DisplayMode = 'solid' | 'gradient' | 'palette';
type MoveDirection = 'forward' | 'backward';
interface PulseEffectOptions {
    color?: string;
    from_color?: string | null;
    period?: number;
    cycles?: number;
    persist?: boolean;
    power_on?: boolean;
    peak?: number;
}
interface BreatheEffectOptions extends PulseEffectOptions {
}
interface MoveEffectOptions {
    direction?: MoveDirection;
    period?: number;
    cycles?: number;
    power_on?: boolean;
}
interface MorphEffectOptions {
    period?: number;
    duration?: number | null;
    palette?: string[];
    power_on?: boolean;
}
interface FlameEffectOptions {
    period?: number;
    duration?: number | null;
    power_on?: boolean;
}
type EffectOptions = PulseEffectOptions | BreatheEffectOptions | MoveEffectOptions | MorphEffectOptions | FlameEffectOptions;
declare class LifxLAN {
    private readonly ip;
    private readonly port;
    private readonly socket;
    private readonly source;
    private sequence;
    constructor(ip: string, port?: number);
    private buildHeader;
    private send;
    rgbToHsbk(r: number, g: number, b: number, kelvin?: number): HSBK;
    private hexToHSBK;
    setPower(level: number, duration?: number): void;
    on(duration?: number): void;
    off(duration?: number): void;
    setColor(hue: number, saturation: number, brightness: number, kelvin?: number, duration?: number): void;
    setColorRGB(r: number, g: number, b: number, kelvin?: number, duration?: number): void;
    setColorHex(hex: number, kelvin?: number, duration?: number): void;
    /**
     * Set brightness without changing the current hue/saturation.
     * @param brightness - Value from 0.0–1.0 or 0–65535
     */
    setBrightness(brightness: number, duration?: number): void;
    /** @param percent - 0–100 */
    setBrightnessPercent(percent: number, duration?: number): void;
    fadeBrightness(targetBrightness: number, seconds: number): void;
    fadeBrightnessPercent(targetPercent: number, seconds: number): void;
    setZones(startZone: number, endZone: number, hue: number, saturation: number, brightness: number, kelvin?: number, duration?: number, apply?: number): void;
    setZonesHex(startZone: number, endZone: number, hex: number, kelvin?: number, duration?: number, apply?: number): void;
    setTileState64(tileIndex: number, colors: HSBK[], duration?: number, x?: number, y?: number, width?: number): void;
    setTileSolid(tileIndex: number, hue: number, saturation: number, brightness: number, kelvin?: number, duration?: number): void;
    setTileSolidHex(tileIndex: number, hex: number, kelvin?: number, duration?: number): void;
    /**
     * Grid layout for LIFX Ceiling (8×8):
     *   Row 0: [off,off, up, up, up, up,off,off]  ← uplight top
     *   Rows 1–6: [z1,z2,z3,z4,z5,z6,z7,z8]      ← downlight zones
     *   Row 7: [off,off, up, up, up, up,off,off]  ← uplight bottom
     */
    private createCeilingGrid;
    private createHorizontalGradient;
    private createPalettePattern;
    setAll(colors: number | number[], kelvin?: number, duration?: number, mode?: DisplayMode): void;
    setDownlight(colors: number | number[], kelvin?: number, duration?: number, mode?: DisplayMode): void;
    setUplight(color: number | number[], kelvin?: number, duration?: number): void;
    /** @param zoneColors - Array of 8 hex colors, one per zone (left→right) */
    setZonesCustom(zoneColors: number[], kelvin?: number, duration?: number): void;
    getLightData(auth: string): Promise<LightData>;
    setEffect(fxName: EffectName, auth: string, options?: EffectOptions): Promise<unknown>;
    stopEffect(auth: string): Promise<unknown>;
    close(): void;
}

export { type BreatheEffectOptions, type DisplayMode, type EffectName, type EffectOptions, type FlameEffectOptions, type HSBK, LifxLAN, type LightData, type MorphEffectOptions, type MoveDirection, type MoveEffectOptions, type PulseEffectOptions, LifxLAN as default };