import { client, expectEden } from "@/lib/eden";

type ImageKind = "logo" | "signature";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadSenderProfileImage(
  profileId: string,
  kind: ImageKind,
  file: File,
): Promise<string | null> {
  const data = await readFileAsBase64(file);
  const row = expectEden(
    await client.api.business
      .senderProfiles({ id: profileId })
      .image({ kind })
      .post({ data, mediaType: file.type }),
  );
  return kind === "logo" ? (row.yourLogo ?? null) : (row.signatureImage ?? null);
}

export async function removeSenderProfileImage(
  profileId: string,
  kind: ImageKind,
): Promise<void> {
  expectEden(
    await client.api.business.senderProfiles({ id: profileId }).image({ kind }).delete(),
  );
}

export async function uploadDocumentImage(
  documentId: string,
  kind: ImageKind,
  file: File,
): Promise<string | null> {
  const data = await readFileAsBase64(file);
  const row = expectEden(
    await client.api.documents({ id: documentId }).image({ kind }).post({
      data,
      mediaType: file.type,
    }),
  );
  return kind === "logo" ? (row.yourLogo ?? null) : (row.signatureImage ?? null);
}

export async function removeDocumentImage(
  documentId: string,
  kind: ImageKind,
): Promise<void> {
  expectEden(
    await client.api.documents({ id: documentId }).image({ kind }).delete(),
  );
}
