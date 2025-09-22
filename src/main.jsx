import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import Home from "./pages/Home.jsx";
import CreateCheckin from "./pages/CreateCheckin.jsx";
import CheckinDetail from "./pages/CheckinDetail.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Routes>
      <Route element={<App />}>
        <Route index element={<Home />} />
        <Route path="/create" element={<CreateCheckin />} />
        <Route path="/checkins/:id" element={<CheckinDetail />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
