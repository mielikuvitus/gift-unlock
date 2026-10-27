import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import GiftUnlock from "./screens/GiftUnlock/GiftUnlock.jsx";

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Routes>
        <Route path="/" element={<GiftUnlock />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
