import { Link, useNavigate } from "react-router";
import sonic from "../../assets/icons/sonic.png";
import pfp from "../../assets/icons/pfp.jpg";
import { useClerk, useUser } from "@clerk/clerk-react";
import { Button } from "../ui/Button";

function Navbar() {
  const { user } = useUser();
  const { signOut } = useClerk();

  const navigate = useNavigate();
  const handleRoute = () => {
    if (!user) {
      navigate("/sign-in");
    } else {
      signOut();
    }
  };
  return (
    <div className="main-container flex justify-between px-10 py-4">
      <div
        onClick={() => navigate("/")}
        className="flex gap-4 items-center cursor-pointer"
      >
        <img className="w-10" src={sonic} alt="sonic logo" />
        <h1 className="font-bold text-primary-600">sonic</h1>
      </div>
      <div className="flex gap-8 items-center">
        <Link className="hidden md:block text-black-700" to={"/dashboard"}>
          Dashboard
        </Link>
        <Link className="hidden md:block text-black-700" to={"/support"}>
          Support
        </Link>
        <Link className="hidden md:block ext-black-700" to={"/#pricing"}>
          Pricing
        </Link>
      </div>
      <div className="flex gap-8">
        <Button
          variant="primary"
          size="md"
          onClick={handleRoute}
          text={user ? "Sign Out" : "Sign In"}
        />
      </div>
      <img className="w-10 rounded-full hidden" src={pfp} alt="profile icon" />
    </div>
  );
}

export default Navbar;
