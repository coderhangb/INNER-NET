import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router";
import { Toaster } from "react-hot-toast";
import PageLoader from "./components/PageLoader.jsx";
import HomePage from "./pages/HomePage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import { useAuthStore } from "./store/useAuthStore.js";

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
      <Routes>
        <Route
          path="/"
          element={authUser ? <HomePage /> : <Navigate to={"/login"} />}
        />
        <Route
          path="/signup"
          element={!authUser ? <SignUpPage /> : <Navigate to={"/"} />}
        />
        <Route
          path="/login"
          element={!authUser ? <LoginPage /> : <Navigate to={"/"} />}
        />
      </Routes>

      <Toaster />
    </>
  );
}

export default App;
