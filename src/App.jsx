import React from "react";
import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import AuthGuard from "./components/AuthGuard";
import AdminGuard from "./components/AdminGuard";

const App = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        <Routes>
          {/* Protected user route */}
          <Route path="/" element={<Home />} />

          {/* Protected admin route */}
          <Route
            path="/admin"
            element={
              <AuthGuard>
                <AdminGuard>
                  <Admin />
                </AdminGuard>
              </AuthGuard>
            }
          />
        </Routes>
      </main>
    </div>
  );
};

export default App;
