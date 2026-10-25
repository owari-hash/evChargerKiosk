import QRCode from 'qrcode';

/**
 * QR codes as inline SVG, generated on the server.
 *
 * Inline SVG rather than a PNG data URI or an image endpoint: it stays crisp on
 * a 4K kiosk screen, costs no extra request, and needs no client JavaScript —
 * the page is a server component, so the codes are in the first HTML response.
 */

/**
 * Always black on white, in both themes. A QR code inverted for dark mode is
 * within spec but a good number of phone cameras will not read it, and a code
 * that fails to scan is worse than one that clashes with the page.
 */
export async function qrSvg(data: string, size = 240): Promise<string> {
  return QRCode.toString(data, {
    type: 'svg',
    // Quartile: survives a smudged or partly reflective kiosk screen while
    // keeping the modules large enough to scan from arm's length.
    errorCorrectionLevel: 'H',
    margin: 1,
    width: size,
    color: { dark: '#000000', light: '#ffffff' },
  });
}

/**
 * Strips the fixed width/height the generator writes, so the code scales with
 * its container instead of being pinned to one pixel size. The viewBox is kept,
 * which is what makes it resolution independent.
 */
export function responsiveQrSvg(svg: string): string {
  return svg
    .replace(/\swidth="[^"]*"/, '')
    .replace(/\sheight="[^"]*"/, '')
    .replace('<svg', '<svg class="h-full w-full" preserveAspectRatio="xMidYMid meet"');
}

export async function responsiveQr(data: string): Promise<string> {
  return responsiveQrSvg(await qrSvg(data));
}
