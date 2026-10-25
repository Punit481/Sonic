import { SignUp } from "@clerk/react-router";
import Navbar from "../layout/Navbar";

export default function SignUpPage() {
  return (
    <>
      <Navbar />
      <div className="mt-20 flex justify-center items-center">
        <SignUp />
      </div>
    </>
  );
}
