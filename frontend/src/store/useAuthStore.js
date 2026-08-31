import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../libs/axios.js";

export const useAuthStore = create((set) => ({
  authUser: null,
  isCheckingAuth: true,
  isSigningUp: false,
  isLoggingIn: false,

  checkAuth: async () => {
    try {
      const res = await axiosInstance.get("/api/auth/check");
      set({ authUser: res.data });
    } catch (error) {
      console.log("Error in checkAuth", error);
      set({ authUser: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  signup: async (data) => {
    set({ isSigningUp: true });
    try {
      const res = await axiosInstance.post("/api/auth/signup", data);
      set({ authUser: res.data });

      // toast from react hot toast
      toast.success("Account created successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.fullName ||
          error.response?.data?.email ||
          error.response?.data?.password ||
          "Unable to create your account. Please try again.",
      );
    } finally {
      set({ isSigningUp: false });
    }
  },

  login: async (data) => {
    set({ isLoggingIn: true });
    try {
      const res = await axiosInstance.post("/api/auth/login", data);
      set({ authUser: res.data });

      // toast from react hot toast
      toast.success("Login successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.email ||
          error.response?.data?.password ||
          "Unable to log in. Please check your connection.",
      );
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      const res = await axiosInstance.post("/api/auth/logout");
      set({ authUser: null });

      // toast from react hot toast
      toast.success(res.data.message);
    } catch {
      toast.error("Logout fail");
    }
  },
}));
