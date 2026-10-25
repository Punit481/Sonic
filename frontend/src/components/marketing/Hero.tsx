import { useNavigate } from "react-router";
import mic from "../../assets/icons/mic.svg";
import hero from "../../assets/images/hero.png";

function Hero() {
  const navigator = useNavigate();
  return (
    <>
      <div className="main-container flex gap-8 px-10">
        <div className="flex gap-8 flex-col justify-center items-center flex-1/1 md-lg:flex-1/2 xl:flex-1/1">
          <h1 className="text-black-800 text-4xl  sm-md:text-5xl md-lg:text-6xl font-bold">
            <span className="text-primary-600">SPEAK</span> IT <br /> LOG IT
          </h1>
          <p className="text-black-700 para sm-md:text-lg text-base">
            Focus on your form, not phone. <br /> Log your workouts just by
            <span className="text-primary-600"> speaking</span> .
          </p>
          <div
            onClick={() => {
              navigator("/dashboard");
            }}
            className="text-center"
          >
            <img
              className="cursor-pointer rounded-full p-2 w-10 bg-primary-600 self-center"
              src={mic}
              alt="mic icon"
            />
          </div>
        </div>
        <div className="flex-1/1 hidden xl:block">
          <img src={hero} alt="" />
        </div>
      </div>
    </>
  );
}

export default Hero;
