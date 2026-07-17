function getAvatarLabel(name, email) {
  return String(name || email?.split("@")[0] || "Usuario EcoTree").trim();
}

function getInitial(name, email) {
  const label = getAvatarLabel(name, email);
  const parts = label.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }

  return label.charAt(0).toUpperCase() || "E";
}

export default function ProfileAvatar({
  className = "",
  email,
  name,
  photoUrl,
  size = "medium"
}) {
  const label = getAvatarLabel(name, email);
  const classes = ["profile-avatar-component", `profile-avatar-${size}`, className]
    .filter(Boolean)
    .join(" ");

  if (photoUrl) {
    return (
      <span className={classes}>
        <img src={photoUrl} alt={`Foto de perfil de ${label}`} />
      </span>
    );
  }

  return (
    <span
      className={classes}
      role="img"
      aria-label={`Inicial do perfil de ${label}`}
    >
      {getInitial(name, email)}
    </span>
  );
}
