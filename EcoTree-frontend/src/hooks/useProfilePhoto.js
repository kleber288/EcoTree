import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  deleteProfilePhoto,
  getProfilePhoto,
  getProfilePhotoUserKey,
  PROFILE_PHOTO_CHANGED_EVENT,
  saveProfilePhoto
} from "../utils/profilePhotoStorage.js";

export default function useProfilePhoto(profile) {
  const profileId = profile?.id ?? profile?.user_id ?? profile?.usuario_id ?? "";
  const profileEmail = profile?.email || "";
  const userKey = useMemo(
    () => getProfilePhotoUserKey(profile),
    [profile, profileEmail, profileId]
  );
  const [photoUrl, setPhotoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const currentUrlRef = useRef("");

  const revokeCurrentUrl = useCallback(() => {
    if (currentUrlRef.current) {
      URL.revokeObjectURL(currentUrlRef.current);
      currentUrlRef.current = "";
    }
  }, []);

  const showBlob = useCallback(
    (blob) => {
      revokeCurrentUrl();

      if (!blob) {
        setPhotoUrl("");
        return;
      }

      const nextUrl = URL.createObjectURL(blob);
      currentUrlRef.current = nextUrl;
      setPhotoUrl(nextUrl);
    },
    [revokeCurrentUrl]
  );

  const loadPhoto = useCallback(async () => {
    if (!userKey) {
      showBlob(null);
      setError("");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const storedPhoto = await getProfilePhoto(userKey);
      showBlob(storedPhoto);
    } catch (loadError) {
      showBlob(null);
      setError(loadError.message || "Nao foi possivel carregar a foto local.");
    } finally {
      setLoading(false);
    }
  }, [showBlob, userKey]);

  useEffect(() => {
    let active = true;

    async function loadActivePhoto() {
      if (!active) {
        return;
      }

      await loadPhoto();
    }

    loadActivePhoto();

    return () => {
      active = false;
    };
  }, [loadPhoto]);

  useEffect(() => {
    function handlePhotoChanged(event) {
      if (!event.detail?.userKey || event.detail.userKey === userKey) {
        loadPhoto();
      }
    }

    window.addEventListener(PROFILE_PHOTO_CHANGED_EVENT, handlePhotoChanged);
    return () =>
      window.removeEventListener(PROFILE_PHOTO_CHANGED_EVENT, handlePhotoChanged);
  }, [loadPhoto, userKey]);

  useEffect(() => {
    return () => revokeCurrentUrl();
  }, [revokeCurrentUrl]);

  const savePhoto = useCallback(
    async (file) => {
      const savedBlob = await saveProfilePhoto(userKey, file);
      showBlob(savedBlob);
    },
    [showBlob, userKey]
  );

  const removePhoto = useCallback(async () => {
    await deleteProfilePhoto(userKey);
    showBlob(null);
  }, [showBlob, userKey]);

  return {
    error,
    loading,
    photoUrl,
    refreshPhoto: loadPhoto,
    removePhoto,
    savePhoto,
    userKey
  };
}
