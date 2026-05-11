export const parseExtension = (fileName: string): string => {
  const i = fileName.lastIndexOf('.');
  if (i <= 0 || i === fileName.length - 1) {
    throw new Error('文件名须包含扩展名');
  }
  return fileName.slice(i + 1).toLowerCase();
};
