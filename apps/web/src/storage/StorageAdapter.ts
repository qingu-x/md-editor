import type { FileItem, StorageAdapterContext, StorageInitResult, StorageType } from './types';

export interface StorageAdapter {
  readonly type: StorageType;
  readonly name: string;
  readonly ready: boolean;
  readonly supportsWatch?: boolean;

  init(context?: StorageAdapterContext): Promise<StorageInitResult>;
  listFiles(): Promise<FileItem[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  teardown?(): Promise<void>;
}
