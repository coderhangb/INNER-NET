import { useState } from "react";
import { Link } from "react-router";
import { User, LockKeyhole, LoaderIcon } from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import lgBackground from "../assets/lg-auth-form-bg.png";
import smBackground from "../assets/sm-auth-form-bg.jpeg";
import loginIllustration from "../assets/loginIllustration.jpg";
import AuthDecor from "../components/AuthDecor";

function LoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const { login, isLoggingIn } = useAuthStore();

  const handleSubmit = (e) => {
    e.preventDefault();
    login(formData);
  };

  return (
    <>
      <AuthDecor />

      <div className="flex min-h-screen w-full items-center justify-center bg-[#FFF7E3] px-4 py-6 sm:px-6">
        <div
          className="
            relative
            flex
            min-h-[85vh]
            w-full
            max-w-350
            items-center
            justify-center
            overflow-hidden
            rounded-3xl
            px-5
            py-8
            shadow-lg
            sm:px-8
            md:min-h-[80vh]
            md:px-6
            lg:w-[92%]
            lg:px-8
            xl:w-[85%]
            xl:px-10
          "
        >
          <picture className="absolute inset-0">
            <source media="(max-width: 1023px)" srcSet={smBackground} />

            <img
              src={lgBackground}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </picture>

          <div
            className="
              relative
              z-10
              flex
              w-full
              max-w-280
              items-center
              justify-center
              gap-10
              xl:justify-around
            "
          >
            <div
              className="
                hidden
                w-[42%]
                max-w-140
                shrink
                lg:block
              "
            >
              <img
                src={loginIllustration}
                alt="Login illustration"
                className="
                  aspect-3/4
                  w-full
                  rounded-2xl
                  border-3
                  border-[#65B82E]
                  object-cover
                  shadow-md
                "
              />
            </div>

            <div
              className="
                w-full
                max-w-100
                shrink
                lg:w-[42%]
                xl:max-w-105
              "
            >
              <h1
                className="
                mx-auto
                w-full
                text-center
                text-3xl
                font-bold
                leading-tight
                drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]
                sm:text-4xl
                lg:text-4xl
                xl:text-5xl
              "
              >
                Welcome Back to{" "}
                <span className="whitespace-nowrap">INNER-NET</span>
              </h1>

              <div
                className="
                  mt-6
                  w-full
                  rounded-3xl
                  bg-white
                  px-5
                  py-6
                  shadow-[0_8px_20px_rgba(0,0,0,0.12)]
                  sm:mt-8
                  sm:px-7
                  sm:py-6
                  lg:mt-8
                  lg:px-7
                  lg:py-6
                  xl:mt-10
                  xl:px-9
                  xl:py-7
                "
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2
                    className="
                      mb-5
                      text-xl
                      font-semibold
                      text-[#111111]
                      sm:text-2xl
                      xl:text-3xl
                    "
                  >
                    Login to Your Account
                  </h2>

                  <div className="relative">
                    <User
                      className="
                        absolute
                        left-4
                        top-1/2
                        size-5
                        -translate-y-1/2
                        text-[#222222]
                      "
                    />

                    <input
                      type="email"
                      autoComplete="off"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          email: e.target.value,
                        })
                      }
                      placeholder="Enter Email / Username"
                      className="
                        h-13
                        w-full
                        rounded-2xl
                        border-2
                        border-[#8B6BB1]
                        bg-white
                        pl-13
                        pr-4
                        text-sm
                        font-medium
                        text-[#222222]
                        placeholder:text-[#222222ad]
                        outline-none
                        transition
                        focus:border-[#65B82E]
                        focus:ring-2
                        focus:ring-[#65B82E]/20
                        sm:h-14
                        sm:text-[15px]
                        xl:h-15.5
                      "
                    />
                  </div>

                  <div className="relative">
                    <LockKeyhole
                      className="
                        absolute
                        left-4
                        top-1/2
                        size-5
                        -translate-y-1/2
                        text-[#222222]
                      "
                    />

                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          password: e.target.value,
                        })
                      }
                      placeholder="Enter Password"
                      className="
                        h-13
                        w-full
                        rounded-2xl
                        border-2
                        border-[#8B6BB1]
                        bg-white
                        pl-13
                        pr-4
                        text-sm
                        font-medium
                        text-[#222222]
                        placeholder:text-[#222222ad]
                        outline-none
                        transition
                        focus:border-[#65B82E]
                        focus:ring-2
                        focus:ring-[#65B82E]/20
                        sm:h-14
                        sm:text-[15px]
                        xl:h-15.5
                      "
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoggingIn}
                    className="
                      mt-1
                      flex
                      h-13
                      w-full
                      items-center
                      justify-center
                      rounded-2xl
                      bg-[#65B82E]
                      text-lg
                      font-semibold
                      text-white
                      shadow-[0_4px_0_#4C9A20]
                      transition
                      hover:bg-[#5DB029]
                      active:translate-y-0.5
                      active:shadow-[0_2px_0_#4C9A20]
                      disabled:cursor-not-allowed
                      disabled:opacity-60
                      sm:h-14
                      xl:h-15.5
                      xl:text-xl
                    "
                  >
                    {isLoggingIn ? (
                      <LoaderIcon className="size-6 animate-spin" />
                    ) : (
                      "Login"
                    )}
                  </button>
                </form>

                <div
                  className="
                    mt-5
                    text-center
                    text-sm
                    sm:text-[15px]
                  "
                >
                  <span className="text-[#222222]">
                    Don't have an account?{" "}
                  </span>

                  <Link
                    to="/signup"
                    className="
                      font-semibold
                      text-[#76548F]
                      transition-colors
                      hover:text-[#65B82E]
                    "
                  >
                    Sign Up
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default LoginPage;
