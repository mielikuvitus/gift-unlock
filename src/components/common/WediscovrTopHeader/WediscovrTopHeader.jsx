import "./WediscovrTopHeader.css";

const LOGO_CLASS = "wediscovr-top-header__logo";

export function WediscovrHeaderLogo({ className = "" }) {
  const imgClass = [LOGO_CLASS, className].filter(Boolean).join(" ");
  return (
    <img
      className={imgClass}
      src="/logo.svg"
      alt="Logo"
      decoding="async"
    />
  );
}

export default function WediscovrTopHeader({ className = "" }) {
  return (
    <header
      className={[
        "wediscovr-top-header",
        "u-gift-run-shell__header",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <WediscovrHeaderLogo />
    </header>
  );
}
