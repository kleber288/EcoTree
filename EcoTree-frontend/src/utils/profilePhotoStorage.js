const DB_NAME = "ecotree-profile-photos";
const DB_VERSION = 1;
const STORE_NAME = "photos";

export const PROFILE_PHOTO_CHANGED_EVENT = "ecotree:profile-photo-changed";
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PROFILE_PHOTO_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
];

let databasePromise = null;

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("IndexedDB nao esta disponivel neste navegador.")
    );
  }

  if (databasePromise) {
    return databasePromise;
  }

  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "userKey" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Nao foi possivel abrir o IndexedDB."));
  });

  return databasePromise;
}

function runPhotoTransaction(mode, callback) {
  return openDatabase().then(
    (database) =>
      new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let request;

        try {
          request = callback(store);
        } catch (error) {
          reject(error);
          return;
        }

        transaction.oncomplete = () => resolve(request?.result ?? null);
        transaction.onerror = () =>
          reject(
            transaction.error ||
              request?.error ||
              new Error("Nao foi possivel acessar a foto do perfil.")
          );
      })
  );
}

export function getProfilePhotoUserKey(profile) {
  const id = profile?.id ?? profile?.user_id ?? profile?.usuario_id;

  if (id !== undefined && id !== null && String(id).trim()) {
    return `id:${String(id).trim()}`;
  }

  const email = profile?.email;

  if (email) {
    return `email:${String(email).trim().toLowerCase()}`;
  }

  return "";
}

export function validateProfilePhotoFile(file) {
  if (!file) {
    return "Selecione uma imagem para continuar.";
  }

  if (!ACCEPTED_PROFILE_PHOTO_TYPES.includes(file.type)) {
    return "Use uma imagem JPG, PNG ou WebP.";
  }

  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return "A imagem precisa ter no maximo 5 MB.";
  }

  return "";
}

export async function getProfilePhoto(userKey) {
  if (!userKey) {
    return null;
  }

  const record = await runPhotoTransaction("readonly", (store) =>
    store.get(userKey)
  );

  return record?.blob || null;
}

export async function saveProfilePhoto(userKey, file) {
  if (!userKey) {
    throw new Error("Nao foi possivel identificar o usuario atual.");
  }

  const validationMessage = validateProfilePhotoFile(file);

  if (validationMessage) {
    throw new Error(validationMessage);
  }

  const blob = file instanceof Blob ? file : new Blob([file], { type: file.type });

  await runPhotoTransaction("readwrite", (store) =>
    store.put({
      userKey,
      blob,
      type: file.type,
      updatedAt: new Date().toISOString()
    })
  );

  emitProfilePhotoChanged(userKey);
  return blob;
}

export async function deleteProfilePhoto(userKey) {
  if (!userKey) {
    return;
  }

  await runPhotoTransaction("readwrite", (store) => store.delete(userKey));
  emitProfilePhotoChanged(userKey);
}

export function emitProfilePhotoChanged(userKey) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(PROFILE_PHOTO_CHANGED_EVENT, {
      detail: { userKey }
    })
  );
}
