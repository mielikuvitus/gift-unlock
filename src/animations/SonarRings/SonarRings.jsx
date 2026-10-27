import "./SonarRings.css";

function SonarRings({ className = "" }) {
  const rootClass = className ? `sonar-rings ${className}` : "sonar-rings";
  return (
    <span className={rootClass} aria-hidden="true">
      <span className="sonar-rings__pulse sonar-rings__pulse--1">
        <svg
          className="sonar-rings__svg"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      </span>
      <span className="sonar-rings__pulse sonar-rings__pulse--2">
        <svg
          className="sonar-rings__svg"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      </span>
      <span className="sonar-rings__pulse sonar-rings__pulse--3">
        <svg
          className="sonar-rings__svg"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" />
        </svg>
      </span>
    </span>
  );
}

export default SonarRings;
