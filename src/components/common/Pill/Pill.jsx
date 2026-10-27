import "./Pill.css";

function Pill({
  text,
  color,
  textColor,
  className = "",
  showDot = true,
  size = "sm",
}) {
  const mods = ["pill", size === "md" && "pill--md", className]
    .filter(Boolean)
    .join(" ");

  const style = {};
  if (color != null) {
    style["--pill-color"] = color;
  }
  if (textColor != null) {
    style["--pill-text-color"] = textColor;
  }
  const styleProp = Object.keys(style).length ? style : undefined;

  return (
    <span className={mods} style={styleProp}>
      {showDot ? <span className="pill__dot" aria-hidden="true" /> : null}
      <span className="pill__text">{text}</span>
    </span>
  );
}

export default Pill;
