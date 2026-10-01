// Web Bluetooth BLE Driver for Cat / FunPrint / PrintFun / GB01 / C9 / MX05 Thermal Printers

export const KNOWN_SERVICES = [
  '0000ae30-0000-1000-8000-00805f9b34fb', // FunPrint / PrintFun Main Service (Crucial!)
  '0000af30-0000-1000-8000-00805f9b34fb', // FunPrint macOS / iOS Alternate Service
  '0000ae00-0000-1000-8000-00805f9b34fb', // FunPrint Base
  '0000e0ff-0000-1000-8000-00805f9b34fb', // Standard GB01 / Cat Printer Service
  '0000ff00-0000-1000-8000-00805f9b34fb', // Alternate C9 / MX05
  '0000fee7-0000-1000-8000-00805f9b34fb', // Tencent / Cat BLE
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART Service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC Transparent
  '000018f0-0000-1000-8000-00805f9b34fb', // Generic POS
  '0000fff0-0000-1000-8000-00805f9b34fb',
  '0000ff12-0000-1000-8000-00805f9b34fb',
];

export const KNOWN_CHARACTERISTICS = [
  '0000ae01-0000-1000-8000-00805f9b34fb', // FunPrint / PrintFun Write Characteristic
  '0000ae02-0000-1000-8000-00805f9b34fb', // FunPrint / PrintFun Notify
  '0000ff02-0000-1000-8000-00805f9b34fb', // GB01 Write
  '0000ff01-0000-1000-8000-00805f9b34fb',
  '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Nordic TX
  '49535343-8841-43f4-a8d4-ecbe34729bb3',
  '00002af1-0000-1000-8000-00805f9b34fb',
  '0000fff1-0000-1000-8000-00805f9b34fb',
  '0000fff2-0000-1000-8000-00805f9b34fb',
];

// FunPrint / Cat Printer CRC Checksum Lookup Table
const CHECKSUM_TABLE = new Uint8Array([
  0, 7, 14, 9, 28, 27, 18, 21, 56, 63, 54, 49, 36, 35, 42, 45, 112, 119, 126, 121,
  108, 107, 98, 101, 72, 79, 70, 65, 84, 83, 90, 93, 224, 231, 238, 233, 252, 251,
  242, 245, 216, 223, 214, 209, 196, 195, 202, 205, 144, 151, 158, 153, 140, 139,
  130, 133, 168, 175, 166, 161, 180, 179, 186, 189, 199, 192, 201, 206, 219, 220,
  213, 210, 255, 248, 241, 246, 227, 228, 237, 234, 183, 176, 185, 190, 171, 172,
  165, 162, 143, 136, 129, 134, 147, 148, 157, 154, 39, 32, 41, 46, 59, 60, 53,
  50, 31, 24, 17, 22, 3, 4, 13, 10, 87, 80, 89, 94, 75, 76, 69, 66, 111, 104,
  97, 102, 115, 116, 125, 122, 137, 142, 135, 128, 149, 146, 155, 156, 177, 182,
  191, 184, 173, 170, 163, 164, 249, 254, 247, 240, 229, 226, 235, 236, 193, 198,
  207, 200, 221, 218, 211, 212, 105, 110, 103, 96, 117, 114, 123, 124, 81, 86,
  95, 88, 77, 74, 67, 68, 25, 30, 23, 16, 5, 2, 11, 12, 33, 38, 47, 40, 61, 58,
  51, 52, 78, 73, 64, 71, 82, 85, 92, 91, 118, 113, 120, 127, 106, 109, 100, 99,
  62, 57, 48, 55, 34, 37, 44, 43, 6, 1, 8, 15, 26, 29, 20, 19, 174, 169, 160,
  167, 178, 181, 188, 187, 150, 145, 152, 159, 138, 141, 132, 131, 222, 217,
  208, 215, 194, 197, 204, 203, 230, 225, 232, 239, 250, 253, 244, 243,
]);

export function calcChecksum(data: Uint8Array, start: number, length: number): number {
  let val = 0;
  for (let i = start; i < start + length; i++) {
    val = CHECKSUM_TABLE[(val ^ data[i]) & 0xff];
  }
  return val;
}

export class CatPrinterDriver {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private isConnecting = false;

  public get connecting(): boolean {
    return this.isConnecting;
  }

  public get isConnected(): boolean {
    return !!(this.server && this.server.connected && this.writeCharacteristic);
  }

  public get deviceName(): string {
    return this.device?.name || 'Cat Thermal Printer';
  }

  /**
   * Request Bluetooth Device and establish GATT connection
   */
  public async connect(): Promise<boolean> {
    if (!navigator.bluetooth) {
      throw new Error(
        'Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge.'
      );
    }

    this.isConnecting = true;

    try {
      // Include all FunPrint & Cat Printer services in optionalServices
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: KNOWN_SERVICES,
      });

      if (!this.device) {
        throw new Error('No device selected');
      }

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      this.server = (await this.device.gatt?.connect()) || null;
      if (!this.server) {
        throw new Error('Failed to connect to GATT Server');
      }

      // Discover suitable service
      let foundService: BluetoothRemoteGATTService | null = null;
      for (const serviceUuid of KNOWN_SERVICES) {
        try {
          foundService = await this.server.getPrimaryService(serviceUuid);
          if (foundService) break;
        } catch {
          // Continue testing next service
        }
      }

      if (!foundService) {
        try {
          const services = await this.server.getPrimaryServices();
          if (services.length > 0) {
            foundService = services[0];
          }
        } catch {
          // ignore
        }
      }

      if (!foundService) {
        throw new Error(
          'No compatible Cat/FunPrint GATT service found on device. Make sure your printer is powered on and within range.'
        );
      }

      // Discover write characteristic
      for (const charUuid of KNOWN_CHARACTERISTICS) {
        try {
          this.writeCharacteristic = await foundService.getCharacteristic(charUuid);
          if (this.writeCharacteristic) break;
        } catch {
          // Try next characteristic
        }
      }

      if (!this.writeCharacteristic) {
        const characteristics = await foundService.getCharacteristics();
        const writable = characteristics.find(
          (c: BluetoothRemoteGATTCharacteristic) =>
            c.properties.write || c.properties.writeWithoutResponse
        );
        if (writable) {
          this.writeCharacteristic = writable;
        } else {
          throw new Error('Could not find a writable BLE characteristic on this printer.');
        }
      }

      // Wake up & apply initial settings
      await this.initPrinter();

      this.isConnecting = false;
      return true;
    } catch (err: unknown) {
      this.isConnecting = false;
      this.disconnect();
      throw err;
    }
  }

  public disconnect(): void {
    if (this.server?.connected) {
      this.server.disconnect();
    }
    this.server = null;
    this.writeCharacteristic = null;
    this.device = null;
  }

  private onDisconnected(): void {
    this.server = null;
    this.writeCharacteristic = null;
  }

  /**
   * Send packet to the Cat/FunPrint Printer with flow control
   */
  private async writePacket(data: Uint8Array, delayMs: number = 8): Promise<void> {
    if (!this.writeCharacteristic) {
      throw new Error('Printer is not connected.');
    }

    const canWriteWithoutResponse = this.writeCharacteristic.properties.writeWithoutResponse;
    const CHUNK_SIZE = 60; // Safe MTU chunk size

    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      if (canWriteWithoutResponse) {
        await this.writeCharacteristic.writeValueWithoutResponse(chunk);
      } else {
        await this.writeCharacteristic.writeValue(chunk);
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  /**
   * Initialize printer with maximum heat energy and contrast (FunPrint/Cat sequence)
   */
  public async initPrinter(): Promise<void> {
    // 1. Set Quality / Density (High density 200 DPI burn)
    const cmdQuality = new Uint8Array([0x51, 0x78, 0xa4, 0x00, 0x01, 0x00, 0x33, 0x00, 0xff]);
    cmdQuality[7] = calcChecksum(cmdQuality, 6, 1);
    await this.writePacket(cmdQuality, 10);

    // 2. Set Print Energy / Burn Heating Darkness to MAX (0xFFFF) for deep pitch-black burn
    const cmdEnergyAF = new Uint8Array([0x51, 0x78, 0xaf, 0x00, 0x02, 0x00, 0xff, 0xff, 0x00, 0xff]);
    cmdEnergyAF[8] = calcChecksum(cmdEnergyAF, 6, 2);
    await this.writePacket(cmdEnergyAF, 15);

    // 3. Set Standard Drawing Mode (0xBE)
    const cmdMode = new Uint8Array([0x51, 0x78, 0xbe, 0x00, 0x01, 0x00, 0x00, 0x00, 0xff]);
    cmdMode[7] = calcChecksum(cmdMode, 6, 1);
    await this.writePacket(cmdMode, 10);
  }

  /**
   * Feed blank paper lines
   */
  public async feedPaper(howMuch: number = 40): Promise<void> {
    const packet = new Uint8Array([
      0x51,
      0x78,
      0xbd,
      0x00,
      0x01,
      0x00,
      howMuch & 0xff,
      0x00,
      0xff,
    ]);
    packet[7] = calcChecksum(packet, 6, 1);
    await this.writePacket(packet, 10);
  }

  /**
   * Print 1-bit monochrome bitmap lines to the Cat / FunPrint Printer
   */
  public async printBitmap(
    bitmap: Uint8Array,
    linesCount: number,
    onProgress?: (ratio: number) => void
  ): Promise<void> {
    if (!this.writeCharacteristic) {
      throw new Error('Printer is not connected.');
    }

    const BYTES_PER_LINE = 48; // 384 dots / 8 bits
    if (bitmap.length !== linesCount * BYTES_PER_LINE) {
      throw new Error(`Bitmap length (${bitmap.length}) does not match linesCount * 48`);
    }

    // Always wake & set maximum thermal energy before burning
    await this.initPrinter();

    // Lattice start
    const cmdLatticeStart = new Uint8Array([
      0x51, 0x78, 0xa6, 0x00, 0x0b, 0x00, 0xaa, 0x55, 0x17, 0x38, 0x44, 0x5f, 0x5f, 0x5f, 0x44,
      0x38, 0x2c, 0xa1, 0xff,
    ]);
    await this.writePacket(cmdLatticeStart, 15);

    const canWriteWithoutResponse = this.writeCharacteristic.properties.writeWithoutResponse;
    // 14ms safe hardware pacing: matches physical motor stepping & thermal burn rate without overflowing BLE FIFO
    const rowDelay = canWriteWithoutResponse ? 14 : 0;
    const progressStep = Math.max(10, Math.floor(linesCount / 30));

    // Print each line
    for (let line = 0; line < linesCount; line++) {
      const byteOffset = line * BYTES_PER_LINE;
      const rowBytes = bitmap.slice(byteOffset, byteOffset + BYTES_PER_LINE);

      const packet = new Uint8Array(8 + BYTES_PER_LINE);
      packet[0] = 0x51;
      packet[1] = 0x78;
      packet[2] = 0xa2; // CMD_PRINT_ROW
      packet[3] = 0x00;
      packet[4] = BYTES_PER_LINE & 0xff;
      packet[5] = (BYTES_PER_LINE >> 8) & 0xff;
      packet.set(rowBytes, 6);
      packet[6 + BYTES_PER_LINE] = calcChecksum(packet, 6, BYTES_PER_LINE);
      packet[7 + BYTES_PER_LINE] = 0xff;

      await this.writePacket(packet, rowDelay);

      // Periodic 25ms buffer drain breather every 30 lines to guarantee 0 buffer overruns
      if (line > 0 && line % 30 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 25));
      }

      if (onProgress && (line % progressStep === 0 || line === linesCount - 1)) {
        onProgress(line / linesCount);
      }
    }

    // Feed paper out of the teeth
    await this.feedPaper(60);

    // Lattice end
    const cmdLatticeEnd = new Uint8Array([
      0x51, 0x78, 0xa6, 0x00, 0x0b, 0x00, 0xaa, 0x55, 0x17, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x17, 0x11, 0xff,
    ]);
    await this.writePacket(cmdLatticeEnd, 15);

    if (onProgress) {
      onProgress(1);
    }
  }
}

export const catPrinter = new CatPrinterDriver();
