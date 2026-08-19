import { useState } from "react";
import { Link } from "react-router";
import {
  Users,
  ChevronDown,
  Mail,
  LockKeyhole,
  UserRound,
  LoaderIcon,
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore";
import lgBackground from "../assets/lg-auth-form-bg.png";
import smBackground from "../assets/sm-auth-form-bg.jpeg";
import signupIllustration from "../assets/signupIllustration.png";
import AuthDecor from "../components/AuthDecor";
import RoleSelector from "../components/RoleSelector";

function SignUpPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "student",
  });

  const { signup, isSigningUp } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    signup(formData);
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
              className="h-full w-full object-cover"
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
                order-1
                w-full
                max-w-135
                lg:order-1
                lg:w-[48%]
              "
            >
              <div
                className="
                  rounded-3xl
                  border-2
                  border-[#65B82E]
                  bg-white
                  w-full
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
                <h1
                  className="
                    text-xl
                    font-semibold
                    text-[#111111]
                    sm:text-2xl
                    xl:text-3xl
                  "
                >
                  Create an Account
                </h1>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div className="mt-6 hidden md:block">
                    <RoleSelector
                      value={formData.role}
                      onChange={(role) =>
                        setFormData((prev) => ({
                          ...prev,
                          role,
                        }))
                      }
                    />
                  </div>

                  <div className="relative md:hidden">
                    <Users
                      className="
                        absolute
                        left-4
                        top-1/2
                        size-5
                        -translate-y-1/2
                        text-[#222222]
                      "
                    />

                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="
                        h-13
                        w-full
                        appearance-none
                        rounded-2xl
                        border-2
                        border-[#8B6BB1]
                        bg-white
                        pl-13
                        pr-4
                        text-sm
                        font-medium
                        text-[#222222]
                        outline-none
                        transition
                        focus:border-[#65B82E]
                        focus:ring-2
                        focus:ring-[#65B82E]/20
                        sm:h-14
                        sm:text-[15px]
                        xl:h-15.5
                      "
                    >
                      <option value="student">Student</option>
                      <option value="parents">Parent</option>
                      <option value="teacher">Teacher</option>
                    </select>

                    <ChevronDown
                      className="
                        pointer-events-none
                        absolute
                        right-5
                        top-1/2
                        size-5
                        -translate-y-1/2
                        text-[#222222]
                      "
                    />
                  </div>

                  <div className="relative">
                    <UserRound
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
                      type="text"
                      name="fullName"
                      autoComplete="off"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter Full Name"
                      required
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
                    <Mail
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
                      name="email"
                      autoComplete="off"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter Email"
                      required
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
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter Password"
                      required
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
                    disabled={isSigningUp}
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
                    {isSigningUp ? (
                      <LoaderIcon className="size-6 animate-spin" />
                    ) : (
                      "Sign Up"
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
                    Already have an account?{" "}
                  </span>

                  <Link
                    to="/login"
                    className="
                      font-semibold
                      text-[#76548F]
                      transition-colors
                      hover:text-[#65B82E]
                    "
                  >
                    Login
                  </Link>
                </div>
              </div>
            </div>

            <div
              className="
                order-2
                hidden
                w-[48%]
                shrink-0
                lg:block
              "
            >
              <img
                src={signupIllustration}
                alt="Learning illustration"
                className="
                  mx-auto
                  h-auto
                  w-full
                  max-w-150
                  object-contain
                  drop-shadow-[0_10px_20px_rgba(0,0,0,0.08)]
                "
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SignUpPage;
