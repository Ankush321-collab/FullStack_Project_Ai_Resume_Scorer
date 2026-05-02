import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import AnalysisPage from "./pages/AnalysisPage";
import { useEffect, useState } from "react";
import api from "./services/api";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get("/auth/me");
        setUser(res.data);
      } catch (err) {
        localStorage.removeItem("token");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return (
      React.createElement('div', { className: "min-h-screen bg-background flex items-center justify-center"    ,}
        , React.createElement('div', { className: "spinner !w-12 !h-12 border-4"   ,} )
      )
    );
  }

  return (
    React.createElement(Router, null
      , React.createElement(Routes, null
        , React.createElement(Route, { path: "/", element: React.createElement(LandingPage, null ),} )
        , React.createElement(Route, { path: "/auth", element: user ? React.createElement(Navigate, { to: "/dashboard",} ) : React.createElement(LoginPage, null ),} )
        , React.createElement(Route, { path: "/dashboard", element: user ? React.createElement(DashboardPage, { user: user,} ) : React.createElement(Navigate, { to: "/auth",} ),} )
        , React.createElement(Route, { path: "/dashboard/:resumeId", element: user ? React.createElement(AnalysisPage, null ) : React.createElement(Navigate, { to: "/auth",} ),} )
        , React.createElement(Route, { path: "/upload", element: user ? React.createElement(UploadPage, { user: user,} ) : React.createElement(Navigate, { to: "/auth",} ),} )
        , React.createElement(Route, { path: "*", element: React.createElement(Navigate, { to: "/",} ),} )
      )
    )
  );
}

export default App;

