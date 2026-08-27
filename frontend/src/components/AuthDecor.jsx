import flowerDecor from "../assets/decor.png";

function AuthDecor() {
  return (
    <>
      <img
        src={flowerDecor}
        alt=""
        className="pointer-events-none absolute left-0 top-0 w-60 filter-[saturate(0.9)_brightness(1.05)_opacity(0.85)]"
      />
      <img
        src={flowerDecor}
        alt=""
        className="pointer-events-none absolute bottom-0 right-0 w-60 rotate-180 filter-[saturate(0.9)_brightness(1.05)_opacity(0.85)]"
      />
    </>
  );
}

export default AuthDecor;
