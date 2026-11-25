export const FILE_PURPOSES = {
  AI_DOCUMENT: 'ai-document',
  DEVICE_IMAGE: 'device-image',
  TICKET_IMAGE: 'ticket-image',
  USER_AVATAR: 'user-avatar',
} as const;
export type FilePurpose = (typeof FILE_PURPOSES)[keyof typeof FILE_PURPOSES];

export interface FilePolicy {
  allowedMime: readonly string[];
  maxBytes: number;
}

export const MB = 1024 * 1024;
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const STORAGE_POLICIES: Record<FilePurpose, FilePolicy> = {
  'ai-document': {
    allowedMime: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    maxBytes: 20 * MB,
  },
  'device-image': { allowedMime: IMAGE_MIME, maxBytes: 5 * MB },
  'ticket-image': { allowedMime: IMAGE_MIME, maxBytes: 5 * MB },
  'user-avatar': { allowedMime: IMAGE_MIME, maxBytes: 2 * MB },
};
