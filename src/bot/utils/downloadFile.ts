import { Bot } from "grammy";

export const downloadFile = async (bot: Bot, fileId: string) => {
  const file = await bot.api.getFile(fileId);
  const filePath = file.file_path;
  const fileUrl = `https://api.telegram.org/file/bot${bot.token}/${filePath}`;

  const response = await fetch(fileUrl);
  return response;
};
