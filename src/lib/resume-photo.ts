const FRAME_WIDTH = 540;
const FRAME_HEIGHT = 720;
const MAX_DATA_URL_LENGTH = 450_000;

export async function readResumePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있습니다.');
  }

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(FRAME_WIDTH / bitmap.width, FRAME_HEIGHT / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('사진을 처리하지 못했습니다.');
    }
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
    context.drawImage(
      bitmap,
      0,
      0,
      bitmap.width,
      bitmap.height,
      Math.round((FRAME_WIDTH - width) / 2),
      Math.round((FRAME_HEIGHT - height) / 2),
      width,
      height,
    );
    const dataUrl = canvas.toDataURL('image/jpeg', 0.78);
    if (dataUrl.length > MAX_DATA_URL_LENGTH) {
      throw new Error('사진 용량이 커서 저장할 수 없습니다. 다른 사진을 골라 주세요.');
    }
    return dataUrl;
  } finally {
    bitmap.close();
  }
}
