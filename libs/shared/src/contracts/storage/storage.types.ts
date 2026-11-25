export interface UploadTicket {
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>; // client PHẢI gửi đúng các header này khi PUT
  expiresAt: string;
  maxBytes: number;
}

export interface DownloadUrl {
  url: string;
  expiresAt: string;
  fileName: string;
  mimeType: string;
}
