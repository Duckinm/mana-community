import { resolveApiBaseUrl } from "@/lib/api-base-url";
import type {
 EntityType,
 StorageFile,
 StorageFolder,
} from "@/components/storage/types";
import { client, expectEden } from "@/lib/eden";
import { queryKeys } from "@/lib/query-keys";
import { parseStorageUploadError } from "@/lib/storage-quota";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
 createContext,
 useCallback,
 useContext,
 type ReactNode,
} from "react";

const BASE_URL = resolveApiBaseUrl();

interface StorageContextValue {
 folders: StorageFolder[];
 files: StorageFile[];
 trashedFiles: StorageFile[];
 loading: boolean;
 isError: boolean;
 refetch: () => void;
 getRootFolders: () => StorageFolder[];
 getChildFolders: (parentId: string) => StorageFolder[];
 getEntityFolder: (
 entityType: EntityType,
 entityId: string,
 ) => StorageFolder | undefined;
 getFolderById: (id: string) => StorageFolder | undefined;
 getBreadcrumb: (folderId: string) => StorageFolder[];
 getFilesInFolder: (folderId: string) => StorageFile[];
 getEntityFiles: (entityType: EntityType, entityId: string) => StorageFile[];
 createEntityFolder: (
 entityType: EntityType,
 entityId: string,
 name: string,
 color?: string,
 ) => Promise<StorageFolder>;
 createSubFolder: (parentId: string, name: string) => Promise<StorageFolder>;
 addFile: (
 file: File,
 folderId: string | null,
 entityType?: EntityType,
 entityId?: string,
 onProgress?: (percent: number) => void,
 ) => Promise<StorageFile>;
 deleteFile: (fileId: string) => Promise<void>;
 restoreFile: (fileId: string) => Promise<StorageFile>;
 deleteFolder: (folderId: string) => Promise<void>;
 getDownloadUrl: (fileId: string) => Promise<string>;
}

const StorageContext = createContext<StorageContextValue | null>(null);

export function StorageProvider({ children }: { children: ReactNode }) {
 const queryClient = useQueryClient();

 const foldersQuery = useQuery({
 queryKey: queryKeys.storageFolders,
 queryFn: async () =>
 expectEden(await client.api.storage.folders.get()),
 });

 const filesQuery = useQuery({
 queryKey: queryKeys.storageFiles,
 queryFn: async () =>
 expectEden(await client.api.storage.files.get()),
 });

 const trashQuery = useQuery({
 queryKey: queryKeys.storageTrashedFiles,
 queryFn: async () =>
 expectEden(await client.api.storage.trash.get()),
 });

 const folders = foldersQuery.data ?? [];
 const files = filesQuery.data ?? [];
 const trashedFiles = trashQuery.data ?? [];
 const loading = foldersQuery.isPending || filesQuery.isPending || trashQuery.isPending;
 const isError = foldersQuery.isError || filesQuery.isError || trashQuery.isError;
 const refetch = () => {
 void foldersQuery.refetch();
 void filesQuery.refetch();
 void trashQuery.refetch();
 };

 const createFolderMutation = useMutation({
 mutationFn: async (body: {
 name: string;
 parentId?: string;
 entityType?: EntityType;
 entityId?: string;
 color?: string;
 }) =>
 expectEden(await client.api.storage.folders.post(body)),
 onSuccess: (folder) => {
 queryClient.setQueryData<StorageFolder[]>(
 queryKeys.storageFolders,
 (prev = []) => [...prev, folder],
 );
 },
 });

 const deleteFileMutation = useMutation({
 mutationFn: async (fileId: string) => {
 const { error } = await client.api.storage.files({ id: fileId }).delete();
 if (error) throw error;
 },
 onMutate: async (fileId) => {
 await queryClient.cancelQueries({ queryKey: queryKeys.storageFiles });
 const previous = queryClient.getQueryData<StorageFile[]>(
 queryKeys.storageFiles,
 );
 queryClient.setQueryData<StorageFile[]>(
 queryKeys.storageFiles,
 (prev = []) => prev.filter((f) => f.id !== fileId),
 );
 return { previous };
 },
 onError: (_err, _id, ctx) => {
 if (ctx?.previous)
 queryClient.setQueryData(queryKeys.storageFiles, ctx.previous);
 },
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
 queryClient.invalidateQueries({ queryKey: queryKeys.storageTrashedFiles });
 queryClient.invalidateQueries({ queryKey: queryKeys.storageQuota });
 },
 });

 const restoreFileMutation = useMutation({
 mutationFn: async (fileId: string) =>
 expectEden(await client.api.storage.files({ id: fileId }).restore.post()),
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
 queryClient.invalidateQueries({ queryKey: queryKeys.storageTrashedFiles });
 queryClient.invalidateQueries({ queryKey: queryKeys.storageQuota });
 },
 });

 const deleteFolderMutation = useMutation({
 mutationFn: async (folderId: string) => {
 const { error } = await client.api.storage
 .folders({ id: folderId })
 .delete();
 if (error) throw error;
 },
 onMutate: async (folderId) => {
 await queryClient.cancelQueries({ queryKey: queryKeys.storageFolders });
 await queryClient.cancelQueries({ queryKey: queryKeys.storageFiles });
 const prevFolders = queryClient.getQueryData<StorageFolder[]>(
 queryKeys.storageFolders,
 );
 const prevFiles = queryClient.getQueryData<StorageFile[]>(
 queryKeys.storageFiles,
 );
 queryClient.setQueryData<StorageFolder[]>(
 queryKeys.storageFolders,
 (prev = []) => prev.filter((f) => f.id !== folderId),
 );
 queryClient.setQueryData<StorageFile[]>(
 queryKeys.storageFiles,
 (prev = []) => prev.filter((f) => f.folderId !== folderId),
 );
 return { prevFolders, prevFiles };
 },
 onError: (_err, _id, ctx) => {
 if (ctx?.prevFolders)
 queryClient.setQueryData(queryKeys.storageFolders, ctx.prevFolders);
 if (ctx?.prevFiles)
 queryClient.setQueryData(queryKeys.storageFiles, ctx.prevFiles);
 },
 onSettled: () => {
 queryClient.invalidateQueries({ queryKey: queryKeys.storageFolders });
 queryClient.invalidateQueries({ queryKey: queryKeys.storageFiles });
 queryClient.invalidateQueries({ queryKey: queryKeys.storageQuota });
 },
 });

 const getRootFolders = useCallback(
 () => folders.filter((f) => f.parentId === null),
 [folders],
 );
 const getChildFolders = useCallback(
 (parentId: string) => folders.filter((f) => f.parentId === parentId),
 [folders],
 );
 const getEntityFolder = useCallback(
 (entityType: EntityType, entityId: string) =>
 folders.find(
 (f) => f.entityType === entityType && f.entityId === entityId,
 ),
 [folders],
 );
 const getFolderById = useCallback(
 (id: string) => folders.find((f) => f.id === id),
 [folders],
 );

 const getBreadcrumb = useCallback(
 (folderId: string): StorageFolder[] => {
 const trail: StorageFolder[] = [];
 let current = folders.find((f) => f.id === folderId);
 while (current) {
 trail.unshift(current);
 current = current.parentId
 ? (folders.find((f) => f.id === current?.parentId) ?? undefined)
 : undefined;
 }
 return trail;
 },
 [folders],
 );

 const getFilesInFolder = useCallback(
 (folderId: string) => files.filter((f) => f.folderId === folderId),
 [files],
 );

 const getEntityFiles = useCallback(
 (entityType: EntityType, entityId: string) => {
 const entityFolder = folders.find(
 (f) => f.entityType === entityType && f.entityId === entityId,
 );
 if (!entityFolder) return [];
 return files.filter((f) => f.folderId === entityFolder.id);
 },
 [folders, files],
 );

 const createEntityFolder = useCallback(
 async (
 entityType: EntityType,
 entityId: string,
 name: string,
 color?: string,
 ) => {
 return createFolderMutation.mutateAsync({
 name,
 entityType,
 entityId,
 ...(color ? { color } : {}),
 });
 },
 [createFolderMutation],
 );

 const createSubFolder = useCallback(
 async (parentId: string, name: string) => {
 return createFolderMutation.mutateAsync({ name, parentId });
 },
 [createFolderMutation],
 );

 // FormData upload keeps raw XHR — Eden Treaty doesn't handle multipart reliably, and fetch can't report upload progress
 const addFile = useCallback(
 async (
 file: File,
 folderId: string | null,
 entityType?: EntityType,
 entityId?: string,
 onProgress?: (percent: number) => void,
 ): Promise<StorageFile> => {
 const inferredKind = inferKind(file.type, file.name);
 const form = new FormData();
 form.append("file", file);
 form.append("kind", inferredKind);
 if (folderId) form.append("folderId", folderId);
 if (entityType) form.append("entityType", entityType);
 if (entityId) form.append("entityId", entityId);

 const registered = await new Promise<StorageFile>((resolve, reject) => {
 const xhr = new XMLHttpRequest();
 xhr.open("POST", `${BASE_URL}/api/storage/upload`);
 xhr.withCredentials = true;
 xhr.upload.onprogress = (e) => {
 if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
 };
 xhr.onload = () => {
 if (xhr.status >= 200 && xhr.status < 300) {
 try {
 resolve(JSON.parse(xhr.responseText) as StorageFile);
 } catch {
 reject(new Error(parseStorageUploadError(null, xhr.statusText)));
 }
 } else {
 let body: unknown = null;
 try {
 body = JSON.parse(xhr.responseText);
 } catch {
 body = null;
 }
 reject(new Error(parseStorageUploadError(body, xhr.statusText)));
 }
 };
 xhr.onerror = () => reject(new Error(parseStorageUploadError(null, xhr.statusText)));
 xhr.onabort = () => reject(new Error(parseStorageUploadError(null, xhr.statusText)));
 xhr.ontimeout = () => reject(new Error(parseStorageUploadError(null, xhr.statusText)));
 xhr.send(form);
 });

 queryClient.setQueryData<StorageFile[]>(
 queryKeys.storageFiles,
 (prev = []) => [...prev, registered],
 );
 queryClient.invalidateQueries({ queryKey: queryKeys.storageQuota });
 return registered;
 },
 [queryClient],
 );

 const deleteFile = useCallback(
 (fileId: string) => deleteFileMutation.mutateAsync(fileId),
 [deleteFileMutation],
 );
 const restoreFile = useCallback(
 (fileId: string) => restoreFileMutation.mutateAsync(fileId),
 [restoreFileMutation],
 );
 const deleteFolder = useCallback(
 (folderId: string) => deleteFolderMutation.mutateAsync(folderId),
 [deleteFolderMutation],
 );

 const getDownloadUrl = useCallback(
 async (fileId: string): Promise<string> => {
 const data = expectEden(
 await client.api.storage.files({ id: fileId }).url.get(),
 );
 if (!data.url) throw new Error('No download URL')
 return data.url;
 },
 [],
 );

 return (
 <StorageContext.Provider
 value={{
 folders,
 files,
 trashedFiles,
 loading,
 isError,
 refetch,
 getRootFolders,
 getChildFolders,
 getEntityFolder,
 getFolderById,
 getBreadcrumb,
 getFilesInFolder,
 getEntityFiles,
 createEntityFolder,
 createSubFolder,
 addFile,
 deleteFile,
 restoreFile,
 deleteFolder,
 getDownloadUrl,
 }}
 >
 {children}
 </StorageContext.Provider>
 );
}

export function useStorage() {
 const ctx = useContext(StorageContext);
 if (!ctx) throw new Error("useStorage must be used within StorageProvider");
 return ctx;
}

export function useFolderTree() {
 const {
  folders,
  files,
  loading,
  isError,
  refetch,
  getRootFolders,
  getChildFolders,
  getEntityFolder,
  getFolderById,
  getBreadcrumb,
  getFilesInFolder,
  getEntityFiles,
 } = useStorage();
 return {
  folders,
  files,
  loading,
  isError,
  refetch,
  getRootFolders,
  getChildFolders,
  getEntityFolder,
  getFolderById,
  getBreadcrumb,
  getFilesInFolder,
  getEntityFiles,
 };
}

export function useStorageMutations() {
 const {
  createEntityFolder,
  createSubFolder,
  addFile,
  deleteFile,
  restoreFile,
  deleteFolder,
  getDownloadUrl,
 } = useStorage();
 return {
  createEntityFolder,
  createSubFolder,
  addFile,
  deleteFile,
  restoreFile,
  deleteFolder,
  getDownloadUrl,
 };
}

function inferKind(mimeType: string, name: string) {
 if (mimeType.startsWith("image/")) return "image" as const;
 if (mimeType === "application/pdf") return "pdf" as const;
 if (mimeType.startsWith("video/")) return "video" as const;
 if (
 mimeType === "application/msword" ||
 mimeType ===
 "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
 name.endsWith(".doc") ||
 name.endsWith(".docx")
 )
 return "doc" as const;
 if (
 mimeType === "application/vnd.ms-excel" ||
 mimeType ===
 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
 name.endsWith(".xls") ||
 name.endsWith(".xlsx") ||
 name.endsWith(".csv")
 )
 return "sheet" as const;
 if (
 mimeType === "application/zip" ||
 mimeType === "application/x-tar" ||
 mimeType === "application/gzip" ||
 name.endsWith(".zip") ||
 name.endsWith(".tar") ||
 name.endsWith(".gz") ||
 name.endsWith(".rar")
 )
 return "archive" as const;
 return "other" as const;
}
