import { sniffMedia } from './media-bytes';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('sniffMedia', () => {
  it('accepts a PNG whose bytes match the declared type', () => {
    expect(sniffMedia(PNG, 'image/png')).toEqual({ kind: 'IMAGE', mimeType: 'image/png' });
  });

  it('rejects a PNG labelled as a JPEG', () => {
    expect(sniffMedia(PNG, 'image/jpeg')).toBeNull();
  });

  it('rejects a text file labelled as an image', () => {
    expect(sniffMedia(Buffer.from('not an image at all'), 'image/png')).toBeNull();
  });
});
