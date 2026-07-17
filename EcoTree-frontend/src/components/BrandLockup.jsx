import logoHorizontal from "../assets/branding/ecotree-logo-horizontal.png";
import logoIcon from "../assets/branding/ecotree-icon.png";
import logoNavbar from "../assets/branding/ecotree-logo-navbar.png";

export default function BrandLockup({
  className = "",
  tone = "dark",
  variant = "horizontal"
}) {
  const imageSource = variant === "navbar" ? logoNavbar : logoHorizontal;
  const classes = [
    "brand-lockup-v2",
    `brand-lockup-v2-${tone}`,
    `brand-lockup-v2-${variant}`,
    className
  ].filter(Boolean).join(" ");

  return (
    <span className={classes} role="img" aria-label="EcoTree">
      <img
        className="brand-logo-image brand-logo-image-full"
        src={imageSource}
        alt=""
        aria-hidden="true"
      />
      <img
        className="brand-logo-image brand-logo-image-icon"
        src={logoIcon}
        alt=""
        aria-hidden="true"
      />
    </span>
  );
}
