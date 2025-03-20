import { Routes, Route } from "react-router-dom";
import LandingPage from "./app/landing/page";
import { Container } from "./app/container";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Container />} />
      <Route path="/landing" element={<LandingPage />} />
    </Routes>
  );
}
