import flowerDecor from "../assets/decor.png";

function AuthDecor() {
  return (
    <>
      <img src={flowerDecor} alt="" className="absolute w-60 top-0 left-0" />
      <img
        src={flowerDecor}
        alt=""
        className="absolute w-60 bottom-0 right-0 rotate-180"
      />
    </>
  );
}

export default AuthDecor;
