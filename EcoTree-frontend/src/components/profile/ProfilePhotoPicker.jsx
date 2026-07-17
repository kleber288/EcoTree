import { useRef, useState } from "react";
import {
  ACCEPTED_PROFILE_PHOTO_TYPES,
  validateProfilePhotoFile
} from "../../utils/profilePhotoStorage.js";

export default function ProfilePhotoPicker({
  disabled = false,
  hasPhoto,
  loading = false,
  onRemove,
  onSelect
}) {
  const inputRef = useRef(null);
  const [message, setMessage] = useState("");
  const busy = disabled || loading;

  function openFilePicker() {
    if (!busy) {
      inputRef.current?.click();
    }
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const validationMessage = validateProfilePhotoFile(file);

    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    try {
      await onSelect(file);
      setMessage("Foto atualizada neste navegador.");
    } catch (error) {
      setMessage(error.message || "Nao foi possivel salvar a foto.");
    }
  }

  async function handleRemove() {
    try {
      await onRemove();
      setMessage("Foto removida deste navegador.");
    } catch (error) {
      setMessage(error.message || "Nao foi possivel remover a foto.");
    }
  }

  return (
    <div className="profile-photo-picker">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept={ACCEPTED_PROFILE_PHOTO_TYPES.join(",")}
        onChange={handleFileChange}
        aria-describedby="profile-photo-help profile-photo-message"
        disabled={busy}
      />

      <div className="profile-photo-actions">
        <button
          className="profile-photo-select-button"
          type="button"
          onClick={openFilePicker}
          disabled={busy}
        >
          {hasPhoto ? "Trocar imagem" : "Selecionar imagem"}
        </button>

        {hasPhoto && (
          <button
            className="profile-photo-remove-button"
            type="button"
            onClick={handleRemove}
            disabled={busy}
          >
            Remover foto
          </button>
        )}
      </div>

      <p id="profile-photo-help" className="profile-photo-help">
        JPG, PNG ou WebP ate 5 MB. A imagem fica salva apenas neste navegador.
      </p>

      {message && (
        <p
          id="profile-photo-message"
          className="profile-photo-message"
          role="status"
          aria-live="polite"
        >
          {message}
        </p>
      )}
    </div>
  );
}
