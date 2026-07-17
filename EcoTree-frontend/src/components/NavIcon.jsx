const iconProps = {
  "aria-hidden": "true",
  fill: "none",
  focusable: "false",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  viewBox: "0 0 24 24"
};

export default function NavIcon({ name }) {
  switch (name) {
    case "home":
      return (
        <svg {...iconProps}>
          <path d="M4 10.8 12 4l8 6.8" />
          <path d="M6.5 9.7V20h11V9.7" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "tree":
      return (
        <svg {...iconProps}>
          <path d="M12 20v-8" />
          <path d="M12 12c-3.4 0-5.6-1.9-6-5.8 3.9.2 6 2.1 6 5.8Z" />
          <path d="M12 12c3.4 0 5.6-1.9 6-5.8-3.9.2-6 2.1-6 5.8Z" />
        </svg>
      );
    case "transactions":
      return (
        <svg {...iconProps}>
          <path d="M7 4.5h7l3 3V19.5H7z" />
          <path d="M14 4.5v3h3" />
          <path d="M9.5 11h5" />
          <path d="M9.5 14h5" />
          <path d="M9.5 17h3" />
        </svg>
      );
    case "goals":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M12 12h.01" />
        </svg>
      );
    case "profile":
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="8" r="3.2" />
          <path d="M5.8 19c.8-3.2 3-5 6.2-5s5.4 1.8 6.2 5" />
        </svg>
      );
    default:
      return null;
  }
}
