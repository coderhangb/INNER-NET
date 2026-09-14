import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "react-hot-toast";
import PageLoader from "./components/PageLoader.jsx";
import HomePage from "./pages/HomePage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { useAuthStore } from "./store/useAuthStore.js";
import CollectionPage from "./pages/CollectionPage.jsx";

import ActivityTracker from "./components/ActivityTracker.jsx";

function App() {
  const { authUser, isCheckingAuth, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isCheckingAuth)
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#FFF7E3]">
        <PageLoader />
      </div>
    );

  return (
    <>
      <ActivityTracker />
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to={"/login"} />}
        />
        <Route
          path="/chat"
          element={authUser ? <ChatPage /> : <Navigate to={"/login"} />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to={"/"} />}
        />
        <Route path="*" element={<Navigate to={authUser ? "/" : "/login"} />} />

        <Route
          path="/collection"
          element={
            authUser
              ? <CollectionPage key={authUser._id} />
              : <Navigate to="/login" replace />
          }
        />
      </Routes>

      <Toaster />
    </>
  );
}

export default App;
